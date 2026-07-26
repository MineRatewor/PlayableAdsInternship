var Game = Game || {};

Game.TntSystem = function (
    session,
    collisionSystem,
    destructibleSystem,
    enemySystem,
    config,
    vfxPool
) {
    this.session = session;
    this.collisionSystem = collisionSystem;
    this.destructibleSystem = destructibleSystem;
    this.enemySystem = enemySystem;
    this.config = config;
    this.vfxPool = vfxPool;
    this.active = false;
    this.generation = 0;
    this.timerGroup = new Game.TimerGroup();
};

Game.TntSystem.prototype.register = function (node) {
    var system = this;
    var body = node && node.__ph_body;

    if (!body) {
        return false;
    }

    this.active = true;
    this.session.tnts.push(node);
    node.__tntState = 'ready';
    body.__isTnt = true;
    body.__tntNode = node;

    this.collisionSystem.register(body, function (impactSpeed, otherBody) {
        if (
            otherBody &&
            (
                otherBody.__isProjectile ||
                impactSpeed >= system.config.triggerSpeed
            )
        ) {
            system.ignite(node);
        }
    });

    return true;
};

Game.TntSystem.prototype.ignite = function (node) {
    var system = this;

    if (
        !this.active ||
        !node ||
        node.__destructed ||
        node.__tntState !== 'ready'
    ) {
        return;
    }

    node.__tntState = 'fused';
    node.__img = 'tnt_box_damaged';
    node.__killAllAnimations();
    node.__anim({
        __scaleF: 1.12
    }, this.config.fuseDelay * 0.5, 0, easeSineO);

    this.schedule(function () {
        system.explode(node);
    }, this.config.fuseDelay);
};

Game.TntSystem.prototype.explode = function (node) {
    var body = node && node.__ph_body;
    var center;

    if (
        !this.active ||
        !body ||
        node.__destructed ||
        node.__tntState === 'exploded'
    ) {
        return;
    }

    node.__tntState = 'exploded';
    center = new Vector2(body.position.x, body.position.y);
    this.collisionSystem.unregister(body);
    body.__isTnt = false;
    body.__tntNode = null;
    removeFromArray(node, this.session.tnts);

    this.damageNodes(center);
    this.triggerNearbyTnt(center);
    this.createExplosion(center);
    playSound('punch', 0, 0, 0.8);
    node.__removeFromParent();
};

Game.TntSystem.prototype.damageNodes = function (center) {
    var system = this;

    $each(this.session.structures.slice(), function (node) {
        var strength = system.getStrength(node.__ph_body, center);

        if (strength > 0) {
            system.push(node.__ph_body, center, strength);
            system.destructibleSystem.destroy(node);
        }
    });

    $each(this.session.enemies.slice(), function (node) {
        var strength = system.getStrength(node.__ph_body, center);

        if (strength > 0) {
            system.push(node.__ph_body, center, strength);
            system.enemySystem.damage(
                node,
                system.config.enemyDamage * strength
            );
        }
    });

    $each(this.session.projectiles.slice(), function (node) {
        var strength = system.getStrength(node.__ph_body, center);

        if (strength > 0) {
            system.push(node.__ph_body, center, strength);
        }
    });
};

Game.TntSystem.prototype.triggerNearbyTnt = function (center) {
    var system = this;

    $each(this.session.tnts.slice(), function (node) {
        if (system.getStrength(node.__ph_body, center) > 0) {
            system.ignite(node);
        }
    });
};

Game.TntSystem.prototype.getStrength = function (body, center) {
    var dx;
    var dy;
    var distance;

    if (!body || body.isStatic) {
        return 0;
    }

    dx = body.position.x - center.x;
    dy = body.position.y - center.y;
    distance = sqrt(dx * dx + dy * dy);
    return distance < this.config.radius
        ? 1 - distance / this.config.radius
        : 0;
};

Game.TntSystem.prototype.push = function (body, center, strength) {
    var dx;
    var dy;
    var distance;
    var impulse;

    if (!body || body.isStatic) {
        return;
    }

    dx = body.position.x - center.x;
    dy = body.position.y - center.y;
    distance = mmax(1, sqrt(dx * dx + dy * dy));
    impulse = this.config.maxImpulse * strength;
    ph_Sleeping.set(body, false);
    ph_Body.setVelocity(body, new Vector2(
        body.velocity.x + dx / distance * impulse,
        body.velocity.y + dy / distance * impulse
    ));
};

Game.TntSystem.prototype.createExplosion = function (center) {
    var position;
    var flash;

    if (!this.vfxPool) {
        return;
    }

    position = this.vfxPool.toLocal(center.x, center.y);
    flash = this.vfxPool.acquire('explosion');

    if (!flash) {
        return;
    }

    flash.__x = position.x;
    flash.__y = position.y;
    flash.__width = this.config.radius * 1.5;
    flash.__height = this.config.radius * 1.5;
    flash.__scaleF = 0.15;
    flash.__alpha = 1;
    flash.__anim({
        __scaleF: 1,
        __alpha: 0
    }, 0.38, 0, easeSineO);
    this.vfxPool.releaseAfter('explosion', flash, 0.4);
};

Game.TntSystem.prototype.schedule = function (callback, delay) {
    var system = this;
    var generation = this.generation;
    return this.timerGroup.schedule(function () {
        if (system.active && system.generation === generation) {
            callback();
        }
    }, delay);
};

Game.TntSystem.prototype.dispose = function () {
    var system = this;

    this.active = false;
    this.generation++;

    this.timerGroup.clear();

    $each(this.session.tnts, function (node) {
        if (node.__ph_body) {
            system.collisionSystem.unregister(node.__ph_body);
            node.__ph_body.__isTnt = false;
            node.__ph_body.__tntNode = null;
        }
    });

    this.session.tnts = [];
};
