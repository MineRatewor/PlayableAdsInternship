var Game = Game || {};

Game.CollisionSystem = function () {
    this.registrations = [];
    this.started = false;
    this.handleCollisionStart = this.handleCollisionStart.bind(this);
};

Game.CollisionSystem.prototype.start = function () {
    if (this.started) {
        return;
    }

    ph_Events.on(ph_Engine, 'collisionStart', this.handleCollisionStart);
    this.started = true;
};

Game.CollisionSystem.prototype.register = function (body, callback) {
    this.unregister(body);
    this.registrations.push({
        body: body,
        callback: callback
    });
};

Game.CollisionSystem.prototype.unregister = function (body) {
    var i;

    for (i = this.registrations.length - 1; i >= 0; i--) {
        if (this.registrations[i].body === body) {
            this.registrations.splice(i, 1);
        }
    }
};

Game.CollisionSystem.prototype.findCallback = function (body) {
    var i;

    for (i = 0; i < this.registrations.length; i++) {
        if (this.registrations[i].body === body) {
            return this.registrations[i].callback;
        }
    }
};

Game.CollisionSystem.prototype.getRelativeImpactSpeed = function (bodyA, bodyB) {
    var velocityA = bodyA.velocity;
    var velocityB = bodyB.velocity;
    var relativeVelocity = new Vector2(
        velocityA.x - velocityB.x,
        velocityA.y - velocityB.y
    );

    return relativeVelocity.__length();
};

Game.CollisionSystem.prototype.handleCollisionStart = function (event) {
    var pairs = event.pairs;
    var i;
    var pair;
    var callbackA;
    var callbackB;
    var speed;

    for (i = 0; i < pairs.length; i++) {
        pair = pairs[i];
        speed = this.getRelativeImpactSpeed(pair.bodyA, pair.bodyB);
        callbackA = this.findCallback(pair.bodyA);
        callbackB = this.findCallback(pair.bodyB);

        if (callbackA) {
            callbackA(speed);
        }

        if (callbackB) {
            callbackB(speed);
        }
    }
};

Game.CollisionSystem.prototype.dispose = function () {
    if (this.started) {
        ph_Events.off(ph_Engine, 'collisionStart', this.handleCollisionStart);
        this.started = false;
    }

    this.registrations = [];
};
