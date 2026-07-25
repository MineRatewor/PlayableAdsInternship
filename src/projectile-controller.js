var Game = Game || {};

Game.ProjectileController = function (session, config) {
    this.session = session;
    this.config = config;
    this.levelNode = null;
    this.rubberNode = null;
    this.inputNode = null;
    this.timers = [];
};

Game.ProjectileController.prototype.attach = function (levelNode, rubberNode, inputNode) {
    var controller = this;

    this.levelNode = levelNode;
    this.rubberNode = rubberNode;
    this.inputNode = inputNode;

    inputNode.__dragDist = 1;

    inputNode.__dragStart = function () {
        controller.rubberNode.__killAllAnimations();
    };

    inputNode.__drag = function (x, y) {
        var dragVector = this.__worldPosition
            .__clone()
            .sub(new Vector2(x, y));

        this.__dmouse = dragVector;
        controller.rubberNode.__parent.__rotate =
            -dragVector.__angle() * RAD2DEG;
        controller.rubberNode.__width = dragVector.__length();
    };

    inputNode.__dragEnd = function () {
        if (!this.__dmouse) {
            return;
        }

        controller.session.shots++;
        controller.launch(this.__dmouse);
        this.__dmouse = null;
    };
};

Game.ProjectileController.prototype.launch = function (dragVector) {
    var controller = this;
    var worldPosition = this.inputNode.__worldPosition;
    var projectile;
    var velocity;
    var timerId;

    playSound('punch');

    this.rubberNode.__anim({
        __width: 10
    }, 0.4, 0, easeElasticO);

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

    if (this.inputNode && !this.inputNode.__destructed) {
        this.inputNode.__dragStart = 0;
        this.inputNode.__drag = 0;
        this.inputNode.__dragEnd = 0;
        this.inputNode.__dmouse = null;
    }

    this.levelNode = null;
    this.rubberNode = null;
    this.inputNode = null;
};
