var Game = Game || {};

Game.EnemySystem = function (
    session,
    collisionSystem,
    config,
    onAllEnemiesDestroyed
) {
    this.session = session;
    this.collisionSystem = collisionSystem;
    this.config = config;
    this.onAllEnemiesDestroyed = onAllEnemiesDestroyed;
    this.active = false;
    this.timers = [];
    this.deathZones = [];
    this.generation = 0;
};

Game.EnemySystem.prototype.register = function (node) {
    var enemySystem = this;
    var body = node.__ph_body;

    if (!body) {
        return false;
    }

    this.active = true;
    this.session.enemies.push(node);
    this.session.enemiesLeft++;
    node.__enemyState = {
        hp: this.config.hp,
        status: 'alive',
        body: body,
        hitProjectiles: {}
    };
    body.__enemyDamageEnabled = false;
    body.__isEnemy = true;
    body.__enemyNode = node;

    ph_Body.setStatic(body, false);
    ph_Body.setDensity(body, this.config.density / 1000);
    body.frictionAir = this.config.frictionAir / 100;
    body.sleepThreshold = this.config.sleepThreshold;
    ph_Sleeping.set(body, false);

    this.schedule(function () {
        if (
            node.__ph_body === body &&
            node.__enemyState &&
            node.__enemyState.status === 'alive' &&
            !node.__destructed
        ) {
            body.__enemyDamageEnabled = true;
        }
    }, 0.5);

    this.collisionSystem.register(
        body,
        function (impactSpeed, otherBody, pair, normalImpactSpeed) {
            enemySystem.handleCollision(
                node,
                impactSpeed,
                otherBody,
                normalImpactSpeed
            );
        }
    );

    return true;
};

Game.EnemySystem.prototype.registerDeathZone = function (node) {
    var enemySystem = this;
    var body = node && node.__ph_body;

    if (!body) {
        return false;
    }

    ph_Body.setStatic(body, true);
    body.isSensor = true;
    body.__isEnemyDeathZone = true;
    this.deathZones.push(body);

    this.collisionSystem.register(
        body,
        function (impactSpeed, otherBody) {
            var enemyNode = otherBody && otherBody.__enemyNode;

            if (
                enemySystem.active &&
                otherBody &&
                otherBody.__isEnemy &&
                enemyNode &&
                enemyNode.__enemyState &&
                enemyNode.__enemyState.status === 'alive' &&
                !enemyNode.__destructed
            ) {
                enemySystem.remove(enemyNode);
            }
        }
    );

    return true;
};

Game.EnemySystem.prototype.handleCollision = function (
    node,
    impactSpeed,
    otherBody,
    normalImpactSpeed
) {
    var damage;
    var body = node && node.__ph_body;
    var state = node && node.__enemyState;
    var projectileId;

    if (
        !this.active ||
        !node ||
        node.__destructed ||
        !body ||
        !state ||
        state.status !== 'alive' ||
        !body.__enemyDamageEnabled
    ) {
        return;
    }

    if (otherBody && otherBody.__isProjectile) {
        projectileId = otherBody.id;

        if (state.hitProjectiles[projectileId]) {
            return;
        }

        state.hitProjectiles[projectileId] = true;
        damage = this.config.projectileDamage;
    } else {
        impactSpeed = normalImpactSpeed === undefined
            ? impactSpeed
            : normalImpactSpeed;
        damage = impactSpeed >= this.config.minCollisionSpeed
            ? (
                impactSpeed - this.config.minCollisionSpeed
            ) * this.config.collisionDamageMultiplier
            : 0;
    }

    if (damage > 0) {
        this.damage(node, damage);
    }
};

Game.EnemySystem.prototype.damage = function (node, damage) {
    var state = node && node.__enemyState;

    if (
        !this.active ||
        !state ||
        state.status !== 'alive' ||
        state.hp <= 0
    ) {
        return;
    }

    state.hp = mmax(0, state.hp - damage);

    if (!state.hp) {
        this.die(node);
    }
};

Game.EnemySystem.prototype.schedule = function (callback, delay) {
    var enemySystem = this;
    var generation = this.generation;
    var timerId = _setTimeout(function () {
        removeFromArray(timerId, enemySystem.timers);

        if (
            enemySystem.active &&
            enemySystem.generation === generation
        ) {
            callback();
        }
    }, delay);

    this.timers.push(timerId);
    return timerId;
};

Game.EnemySystem.prototype.die = function (node) {
    var enemySystem = this;
    var body = node.__ph_body;
    var state = node.__enemyState;
    var direction;
    var startX;
    var startY;
    var startRotation;

    if (
        !this.active ||
        !body ||
        !state ||
        state.status !== 'alive' ||
        node.__destructed
    ) {
        return;
    }

    state.status = 'dying';
    direction = body.velocity.x < 0 ? -1 : 1;
    startX = node.__offset.x;
    startY = node.__offset.y;
    startRotation = node.__rotate || 0;

    this.collisionSystem.unregister(body);
    node.__physics = 0;
    node.__killAllAnimations();
    node.__scalex = 1;
    node.__scaley = 1;

    node.__anim({
        __scalex: 1.2,
        __scaley: 0.75
    }, 0.09, 0, easeSineO);

    this.schedule(function () {
        if (!enemySystem.canAnimate(node)) {
            return;
        }

        node.__anim({
            __x: startX + direction * 6,
            __y: startY - 10,
            __rotate: startRotation + direction * 30,
            __scalex: 0.92,
            __scaley: 1.08
        }, 0.18, 0, easeSineO);
    }, 0.09);

    this.schedule(function () {
        if (!enemySystem.canAnimate(node)) {
            return;
        }

        enemySystem.createDeathBurst(node);
        node.__anim({
            __rotate: startRotation + direction * 120,
            __scalex: 0,
            __scaley: 0,
            __alpha: 0
        }, 0.28, 0, easeSineO);
    }, 0.27);

    this.schedule(function () {
        if (enemySystem.canAnimate(node)) {
            enemySystem.remove(node);
        }
    }, 0.58);
};

Game.EnemySystem.prototype.canAnimate = function (node) {
    return (
        this.active &&
        node &&
        node.__enemyState &&
        node.__enemyState.status === 'dying' &&
        !node.__destructed
    );
};

Game.EnemySystem.prototype.createDeathBurst = function (node) {
    var parent = node.__parent;
    var centerX = node.__offset.x;
    var centerY = node.__offset.y;
    var i;
    var feather;
    var angle;
    var distance;

    if (!parent) {
        return;
    }

    for (i = 0; i < 5; i++) {
        angle = -150 + i * 75 + randomInt(-15, 15);
        distance = randomInt(35, 65);
        feather = parent.__addChildBox({
            __img: 'feather',
            __ofs: [centerX, centerY, -25],
            __size: [randomInt(42, 58), randomInt(42, 58)],
            __rotate: randomInt(0, 360),
            __alpha: 1
        }).update();

        feather.__anim({
            __x: centerX + cos(angle * DEG2RAD) * distance,
            __y: centerY + sin(angle * DEG2RAD) * distance,
            __rotate: feather.__rotate + randomInt(90, 220),
            __scaleF: 0,
            __alpha: 0
        }, 0.5, 0, easeSineO).__removeAfter(0.52);
    }
};

Game.EnemySystem.prototype.remove = function (node) {
    var body;
    var state;
    var enemyIndex;

    if (!this.active || !node || node.__destructed) {
        return;
    }

    state = node.__enemyState;

    if (!state || state.status === 'removed') {
        return;
    }

    enemyIndex = this.session.enemies.indexOf(node);

    if (enemyIndex === -1) {
        return;
    }

    state.status = 'removed';
    body = node.__ph_body || state.body;

    if (body) {
        this.collisionSystem.unregister(body);
        body.__enemyNode = null;
        body.__isEnemy = false;
    }

    this.session.enemies.splice(enemyIndex, 1);
    node.__removeFromParent();
    this.session.enemiesLeft = mmax(0, this.session.enemiesLeft - 1);

    if (this.session.enemiesLeft === 0) {
        this.onAllEnemiesDestroyed();
    }
};

Game.EnemySystem.prototype.dispose = function () {
    var collisionSystem = this.collisionSystem;
    var i;

    this.active = false;
    this.generation++;

    for (i = 0; i < this.timers.length; i++) {
        _clearTimeout(this.timers[i]);
    }
    this.timers = [];

    $each(this.session.enemies, function (enemy) {
        if (enemy.__ph_body) {
            collisionSystem.unregister(enemy.__ph_body);
        }
    });

    $each(this.deathZones, function (body) {
        collisionSystem.unregister(body);
    });

    this.deathZones = [];
    this.session.enemies = [];
    this.session.enemiesLeft = 0;
};
