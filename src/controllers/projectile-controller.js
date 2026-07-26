var Game = Game || {};

Game.ProjectileController = function (
    session,
    config,
    trajectorySystem
) {
    this.session = session;
    this.config = config;
    this.trajectorySystem = trajectorySystem;
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
    this.trajectorySystem.attach(levelNode, inputNode);

    inputNode.__dragDist = 1;

    inputNode.__dragStart = function () {
        controller.prepareProjectile();
        controller.trajectorySystem.beginAiming();
        controller.leftRubberNode.__killAllAnimations();
        controller.rightRubberNode.__killAllAnimations();
        controller.pouchNode.__killAllAnimations();
    };

    inputNode.__drag = function (x, y) {
        var dragVector = this.__worldPosition
            .__clone()
            .sub(new Vector2(x, y));
        var pouchPosition;

        controller.limitDragVector(dragVector);
        this.__dmouse = dragVector;
        pouchPosition = this.__worldPosition
            .__clone()
            .sub(dragVector);
        controller.movePouch(pouchPosition.x, pouchPosition.y);
        controller.trajectorySystem.update(dragVector);
    };

    inputNode.__dragEnd = function () {
        controller.trajectorySystem.hide();

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

Game.ProjectileController.prototype.limitDragVector = function (
    dragVector
) {
    var maxDistance = this.config.maxPullDistance;
    var distanceSquared;

    if (!maxDistance || maxDistance <= 0) {
        return dragVector;
    }

    distanceSquared =
        dragVector.x * dragVector.x +
        dragVector.y * dragVector.y;

    if (distanceSquared > maxDistance * maxDistance) {
        dragVector.__multiplyScalar(
            maxDistance / Math.sqrt(distanceSquared)
        );
    }

    return dragVector;
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
    var bodyPartIndex;

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
        projectile.__ph_body.__isProjectile = true;

        for (
            bodyPartIndex = 0;
            bodyPartIndex < projectile.__ph_body.parts.length;
            bodyPartIndex++
        ) {
            projectile.__ph_body.parts[bodyPartIndex].__isProjectile = true;
        }

        ph_Body.setInertia(projectile.__ph_body, Infinity);
        ph_Body.setAngularVelocity(projectile.__ph_body, 0);
        ph_Body.setVelocity(projectile.__ph_body, velocity);
    }

    this.session.projectiles.push(projectile);

    timerId = _setTimeout(function () {
        removeFromArray(timerId, controller.timers);
        controller.disappear(projectile);
    }, this.config.lifetime);
    this.timers.push(timerId);

    return projectile;
};

Game.ProjectileController.prototype.disappear = function (projectile) {
    var controller = this;
    var parent;
    var x;
    var y;
    var feather;
    var timerId;

    if (
        !projectile ||
        projectile.__destructed ||
        projectile.__disappearing
    ) {
        return;
    }

    projectile.__disappearing = true;
    parent = projectile.__parent;
    x = projectile.__offset.x;
    y = projectile.__offset.y;

    projectile.__physics = 0;
    projectile.__killAllAnimations();
    projectile.__anim({
        __scaleF: 0.65,
        __alpha: 0
    }, 0.3, 0, easeSineO);

    if (parent) {
        feather = parent.__addChildBox({
            __img: 'feather',
            __ofs: [x, y, -21],
            __size: [42, 42],
            __rotate: randomInt(0, 360),
            __alpha: 0.9
        }).update();

        feather.__anim({
            __x: x + randomInt(-12, 12),
            __y: y - 18,
            __rotate: feather.__rotate + randomInt(80, 160),
            __scaleF: 0.75,
            __alpha: 0
        }, 0.4, 0, easeSineO).__removeAfter(0.42);
    }

    timerId = _setTimeout(function () {
        removeFromArray(timerId, controller.timers);
        controller.remove(projectile);
    }, 0.32);
    this.timers.push(timerId);
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
    this.trajectorySystem.dispose();

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
