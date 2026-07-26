var Game = Game || {};

Game.CollisionSystem = function () {
    this.callbacks = {};
    this.started = false;
    this.handleCollisionStart = this.handleCollisionStart.bind(this);
    this.handleCollisionActive = this.handleCollisionActive.bind(this);
};

Game.CollisionSystem.prototype.start = function () {
    if (this.started) {
        return;
    }

    ph_Events.on(ph_Engine, 'collisionStart', this.handleCollisionStart);
    ph_Events.on(ph_Engine, 'collisionActive', this.handleCollisionActive);
    this.started = true;
};

Game.CollisionSystem.prototype.register = function (body, callback) {
    body = this.getRootBody(body);

    if (body) {
        this.callbacks[body.id] = callback;
        body.__gameCollisionCallback = callback;
    }
};

Game.CollisionSystem.prototype.unregister = function (body) {
    body = this.getRootBody(body);

    if (body) {
        delete this.callbacks[body.id];
        body.__gameCollisionCallback = null;
    }
};

Game.CollisionSystem.prototype.findCallback = function (body) {
    body = this.getRootBody(body);
    return body
        ? body.__gameCollisionCallback || this.callbacks[body.id]
        : undefined;
};

Game.CollisionSystem.prototype.getRootBody = function (body) {
    return body && body.parent ? body.parent : body;
};

Game.CollisionSystem.prototype.getRelativeImpactSpeed = function (bodyA, bodyB) {
    bodyA = this.getRootBody(bodyA);
    bodyB = this.getRootBody(bodyB);

    var relativeX = bodyA.velocity.x - bodyB.velocity.x;
    var relativeY = bodyA.velocity.y - bodyB.velocity.y;

    return sqrt(
        relativeX * relativeX +
        relativeY * relativeY
    );
};

Game.CollisionSystem.prototype.getNormalImpactSpeed = function (
    bodyA,
    bodyB,
    pair
) {
    var normal = pair && pair.collision && pair.collision.normal;
    var relativeX;
    var relativeY;

    bodyA = this.getRootBody(bodyA);
    bodyB = this.getRootBody(bodyB);

    if (!normal) {
        return this.getRelativeImpactSpeed(bodyA, bodyB);
    }

    relativeX = bodyA.velocity.x - bodyB.velocity.x;
    relativeY = bodyA.velocity.y - bodyB.velocity.y;

    return Math.abs(relativeX * normal.x + relativeY * normal.y);
};

Game.CollisionSystem.prototype.handleCollisionStart = function (event) {
    this.handleCollisions(event, true);
};

Game.CollisionSystem.prototype.handleCollisionActive = function (event) {
    this.handleCollisions(event, false);
};

Game.CollisionSystem.prototype.handleCollisions = function (
    event,
    isCollisionStart
) {
    var pairs = event.pairs;
    var i;
    var pair;
    var callbackA;
    var callbackB;
    var speed;
    var normalSpeed;
    var bodyA;
    var bodyB;

    for (i = 0; i < pairs.length; i++) {
        pair = pairs[i];
        bodyA = this.getRootBody(pair.bodyA);
        bodyB = this.getRootBody(pair.bodyB);
        callbackA = this.findCallback(bodyA);
        callbackB = this.findCallback(bodyB);

        if (
            (!callbackA && !callbackB) ||
            (
                !isCollisionStart &&
                !bodyA.__isProjectile &&
                !bodyB.__isProjectile
            )
        ) {
            continue;
        }

        speed = this.getRelativeImpactSpeed(bodyA, bodyB);
        normalSpeed = this.getNormalImpactSpeed(bodyA, bodyB, pair);

        if (callbackA) {
            callbackA(speed, bodyB, pair, normalSpeed);
        }

        if (callbackB) {
            callbackB(speed, bodyA, pair, normalSpeed);
        }
    }
};

Game.CollisionSystem.prototype.dispose = function () {
    if (this.started) {
        ph_Events.off(ph_Engine, 'collisionStart', this.handleCollisionStart);
        ph_Events.off(
            ph_Engine,
            'collisionActive',
            this.handleCollisionActive
        );
        this.started = false;
    }

    this.callbacks = {};
};
