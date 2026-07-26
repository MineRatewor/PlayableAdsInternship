var Game = Game || {};

Game.ProjectilePool = function (config) {
    this.config = config;
    this.parentNode = null;
    this.pool = null;
};

Game.ProjectilePool.prototype.attach = function (parentNode) {
    var projectilePool = this;

    this.dispose();
    this.parentNode = parentNode;
    this.pool = new Game.ObjectPool(
        function () {
            return projectilePool.parentNode.__addChildBox({
                __img: projectilePool.config.image,
                __size: projectilePool.config.size,
                __ofs: [0, 0, -20],
                __visible: 0
            }).update();
        },
        function (node, position, velocity, shotId) {
            projectilePool.activate(
                node,
                position,
                velocity,
                shotId
            );
        },
        function (node) {
            projectilePool.deactivate(node);
        },
        function (node) {
            if (!node.__destructed) {
                node.__removeFromParent();
            }
        },
        this.config.shotsPerRound
    );
    this.pool.prewarm(this.config.shotsPerRound);
};

Game.ProjectilePool.prototype.activate = function (
    node,
    position,
    velocity,
    shotId
) {
    var body;
    var i;

    node.__killAllAnimations();
    node.__visible = 1;
    node.__alpha = 1;
    node.__scaleF = 1;
    node.__scalex = 1;
    node.__scaley = 1;
    node.__rotate = 0;
    node.__x = position.x;
    node.__y = position.y;
    node.__disappearing = false;
    node.__projectileShotId = shotId;
    node.__physics = this.config.physics;
    node.update(1);
    body = node.__ph_body;

    if (!body) {
        return;
    }

    body.__isProjectile = true;
    body.__projectileId = shotId;

    for (i = 0; i < body.parts.length; i++) {
        body.parts[i].__isProjectile = true;
        body.parts[i].__projectileId = shotId;
    }

    ph_Body.setInertia(body, Infinity);
    ph_Body.setAngle(body, 0);
    ph_Body.setAngularVelocity(body, 0);
    ph_Body.setVelocity(body, velocity);
    ph_Sleeping.set(body, false);
};

Game.ProjectilePool.prototype.deactivate = function (node) {
    var body = node.__ph_body;
    var i;

    if (body) {
        body.__isProjectile = false;
        body.__projectileId = null;

        for (i = 0; i < body.parts.length; i++) {
            body.parts[i].__isProjectile = false;
            body.parts[i].__projectileId = null;
        }
    }

    node.__killAllAnimations();
    node.__physics = 0;
    node.__visible = 0;
    node.__alpha = 1;
    node.__scaleF = 1;
    node.__scalex = 1;
    node.__scaley = 1;
    node.__rotate = 0;
    node.__disappearing = false;
    node.__projectileShotId = null;
};

Game.ProjectilePool.prototype.acquire = function (
    position,
    velocity,
    shotId
) {
    if (!this.pool) {
        return null;
    }

    return this.pool.acquire(position, velocity, shotId);
};

Game.ProjectilePool.prototype.release = function (node) {
    return this.pool ? this.pool.release(node) : false;
};

Game.ProjectilePool.prototype.dispose = function () {
    if (this.pool) {
        this.pool.dispose();
    }

    this.pool = null;
    this.parentNode = null;
};
