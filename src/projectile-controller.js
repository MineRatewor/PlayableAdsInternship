var Game = Game || {};

Game.ProjectileController = function (session, config) {
    this.session = session;
    this.config = config;
    this.levelNode = null;
    this.leftRubberNode = null;
    this.rightRubberNode = null;
    this.pouchNode = null;
    this.inputNode = null;
    this.readyProjectileNode = null;
    this.timers = [];
};

Game.ProjectileController.prototype.attach = function (
    levelNode,
    leftRubberNode,
    rightRubberNode,
    pouchNode,
    inputNode
) {
    var controller = this;

    this.levelNode = levelNode;
    this.leftRubberNode = leftRubberNode;
    this.rightRubberNode = rightRubberNode;
    this.pouchNode = pouchNode;
    this.inputNode = inputNode;

    inputNode.__dragDist = 1;

    inputNode.__dragStart = function () {
        controller.prepareProjectile();
        controller.leftRubberNode.__killAllAnimations();
        controller.rightRubberNode.__killAllAnimations();
        controller.pouchNode.__killAllAnimations();
    };

    inputNode.__drag = function (x, y) {
        var dragVector = this.__worldPosition
            .__clone()
            .sub(new Vector2(x, y));

        this.__dmouse = dragVector;
        controller.movePouch(x, y);
    };

    inputNode.__dragEnd = function () {
        if (!this.__dmouse) {
            controller.removePreparedProjectile();
            controller.resetSling();
            return;
        }

        controller.session.shots++;
        controller.launch(this.__dmouse);
        controller.removePreparedProjectile();
        controller.resetSling();
        this.__dmouse = null;
    };
};

Game.ProjectileController.prototype.prepareProjectile = function () {
    if (
        this.readyProjectileNode &&
        !this.readyProjectileNode.__destructed
    ) {
        return this.readyProjectileNode;
    }

    this.readyProjectileNode = this.pouchNode.__addChildBox({
        __img: this.config.image,
        __size: this.config.readySize,
        __ofs: this.config.readyOffset
    }).update();

    return this.readyProjectileNode;
};

Game.ProjectileController.prototype.removePreparedProjectile = function () {
    if (
        this.readyProjectileNode &&
        !this.readyProjectileNode.__destructed
    ) {
        this.readyProjectileNode.__removeFromParent();
    }

    this.readyProjectileNode = null;
};

Game.ProjectileController.prototype.pointRubberAt = function (
    rubberNode,
    x,
    y
) {
    var anchorPosition = rubberNode.__parent.__worldPosition;
    var rubberVector = anchorPosition
        .__clone()
        .sub(new Vector2(x, y));

    rubberNode.__parent.__rotate = -rubberVector.__angle() * RAD2DEG;
    rubberNode.__width = rubberVector.__length();
};

Game.ProjectileController.prototype.movePouch = function (x, y) {
    var inputPosition = this.inputNode.__worldPosition;

    this.pouchNode.__x = x - inputPosition.x;
    this.pouchNode.__y = y - inputPosition.y;

    this.pointRubberAt(this.leftRubberNode, x, y);
    this.pointRubberAt(this.rightRubberNode, x, y);
};

Game.ProjectileController.prototype.resetSling = function () {
    var inputPosition = this.inputNode.__worldPosition;

    this.pouchNode.__x = 0;
    this.pouchNode.__y = 0;
    this.pointRubberAt(
        this.leftRubberNode,
        inputPosition.x,
        inputPosition.y
    );
    this.pointRubberAt(
        this.rightRubberNode,
        inputPosition.x,
        inputPosition.y
    );
};

Game.ProjectileController.prototype.launch = function (dragVector) {
    var controller = this;
    var worldPosition = this.inputNode.__worldPosition
        .__clone()
        .sub(dragVector);
    var projectile;
    var velocity;
    var timerId;

    playSound('punch');

    projectile = this.levelNode.__addChildBox({
        __img: this.config.image,
        __size: this.config.size,
        __ofs: [worldPosition.x, worldPosition.y, -20],
        __physics: this.config.physics
    }).update();

    velocity = dragVector
        .__clone()
        .__multiplyScalar(this.config.launchPower);

    if (projectile.__ph_body) {
        ph_Body.setInertia(projectile.__ph_body, Infinity);
        ph_Body.setAngularVelocity(projectile.__ph_body, 0);
        ph_Body.setVelocity(projectile.__ph_body, velocity);
    }

    this.session.projectiles.push(projectile);

    timerId = _setTimeout(function () {
        controller.remove(projectile);
        removeFromArray(timerId, controller.timers);
    }, this.config.lifetime);
    this.timers.push(timerId);

    return projectile;
};

Game.ProjectileController.prototype.remove = function (projectile) {
    removeFromArray(projectile, this.session.projectiles);

    if (projectile && !projectile.__destructed) {
        projectile.__removeFromParent();
    }
};

Game.ProjectileController.prototype.dispose = function () {
    var i;

    for (i = 0; i < this.timers.length; i++) {
        _clearTimeout(this.timers[i]);
    }
    this.timers = [];

    for (i = this.session.projectiles.length - 1; i >= 0; i--) {
        this.remove(this.session.projectiles[i]);
    }

    this.removePreparedProjectile();

    if (this.inputNode && !this.inputNode.__destructed) {
        this.inputNode.__dragStart = 0;
        this.inputNode.__drag = 0;
        this.inputNode.__dragEnd = 0;
        this.inputNode.__dmouse = null;
    }

    this.levelNode = null;
    this.leftRubberNode = null;
    this.rightRubberNode = null;
    this.pouchNode = null;
    this.inputNode = null;
    this.readyProjectileNode = null;
};
