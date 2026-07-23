var Game = Game || {};

Game.DestructibleSystem = function (session, collisionSystem, onAllTargetsDestroyed) {
    this.session = session;
    this.collisionSystem = collisionSystem;
    this.onAllTargetsDestroyed = onAllTargetsDestroyed;
    this.awakeScheduled = false;
};

Game.DestructibleSystem.prototype.registerTarget = function (node, hp) {
    this.session.targets.push(node);
    this.session.targetsLeft++;
    node.__isRegisteredTarget = true;
    this.registerDamage(node, hp);
};

Game.DestructibleSystem.prototype.registerFragment = function (node, hp) {
    this.session.fragments.push(node);
    node.__isRegisteredTarget = false;
    this.registerDamage(node, hp);
};

Game.DestructibleSystem.prototype.registerDamage = function (node, hp) {
    var body = node.__ph_body;
    var destructibles = this;

    if (!body) {
        return;
    }

    body.__hp = hp;
    this.collisionSystem.register(body, function (impactSpeed) {
        destructibles.damage(node, impactSpeed);
    });
};

Game.DestructibleSystem.prototype.damage = function (node, impactSpeed) {
    var body = node.__ph_body;
    var damage;

    if (!body || !body.__hp) {
        return;
    }

    damage = floor(clamp(
        (impactSpeed - 1) * (impactSpeed - 2),
        0,
        100
    ));

    if (!damage) {
        return;
    }

    body.__hp = mmax(0, body.__hp - damage);

    if (!body.__hp) {
        var destructibles = this;

        this.collisionSystem.unregister(body);
        looperPost(function () {
            destructibles.remove(node);
        });
    }
};

Game.DestructibleSystem.prototype.remove = function (node) {
    var body;
    var velocity;
    var size;
    var x;
    var y;
    var isTarget;

    if (!node || node.__destructed) {
        return;
    }

    body = node.__ph_body;
    velocity = body ? body.velocity : new Vector2();
    size = node.__size;
    x = node.__x;
    y = node.__y;
    isTarget = node.__isRegisteredTarget;

    if (body) {
        this.collisionSystem.unregister(body);
    }

    removeFromArray(
        node,
        isTarget ? this.session.targets : this.session.fragments
    );
    node.__removeFromParent();
    this.scheduleAwakeTargets();

    if (isTarget) {
        this.playBreakSound();
        this.createFragments(x, y, size, velocity);
        this.session.targetsLeft--;

        if (this.session.targetsLeft === 0) {
            this.onAllTargetsDestroyed();
        }
    } else if (random() > 0.5 && !windowManager.__hasOpenedWindow()) {
        this.playBreakSound();
    }
};

Game.DestructibleSystem.prototype.createFragments = function (centerX, centerY, size, velocity) {
    var step = 50;
    var startX = centerX - size.x / 2;
    var startY = centerY - size.y / 2;
    var x;
    var y;

    for (x = 0; x < size.x; x += step) {
        for (y = 0; y < size.y; y += step) {
            this.createFragment(startX + x, startY + y, velocity);
        }
    }
};

Game.DestructibleSystem.prototype.createFragment = function (x, y, velocity) {
    var destructibles = this;
    var fragment = this.session.levelNode.__addChildBox({
        __img: 'break_' + randomInt(1, 9),
        __ofs: [x, y, -20],
        __rotate: randomInt(0, 360),
        __physics: {
            __isStatic: false,
            __friction: 10,
            __frictionAir: 1,
            __frictionStatic: 50,
            __restitution: 0,
            __density: 1,
            __bodyType: 1
        }
    });

    looperPost(function () {
        if (!fragment.__ph_body) {
            return;
        }

        ph_Body.setVelocity(fragment.__ph_body, new Vector2(
            velocity.x + randomFloat(-10, 10),
            velocity.y + randomFloat(-8, 3)
        ));

        _setTimeout(function () {
            if (!fragment.__ph_body || fragment.__destructed) {
                return;
            }

            destructibles.registerFragment(
                fragment,
                Game.Config.destructible.fragmentHp
            );

            _setTimeout(function () {
                destructibles.remove(fragment);
            }, randomFloat(5, 10));
        }, 1);
    });
};

Game.DestructibleSystem.prototype.scheduleAwakeTargets = function () {
    var destructibles = this;

    if (this.awakeScheduled) {
        return;
    }

    this.awakeScheduled = true;
    looperPost(function () {
        destructibles.awakeScheduled = false;
        $each(destructibles.session.targets, function (target) {
            target.__ph_awake();
        });
    });
};

Game.DestructibleSystem.prototype.playBreakSound = function () {
    playSound('break_' + randomInt(1, 4), 0, 0, 0.5);
};

Game.DestructibleSystem.prototype.dispose = function () {
    var collisionSystem = this.collisionSystem;

    $each(this.session.targets, function (target) {
        if (target.__ph_body) {
            collisionSystem.unregister(target.__ph_body);
        }
    });

    $each(this.session.fragments, function (fragment) {
        if (fragment.__ph_body) {
            collisionSystem.unregister(fragment.__ph_body);
        }
    });

    this.session.targets = [];
    this.session.fragments = [];
    this.session.targetsLeft = 0;
    this.awakeScheduled = false;
};
