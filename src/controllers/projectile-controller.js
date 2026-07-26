var Game = Game || {};

Game.ProjectileController = function (
    session,
    config,
    trajectorySystem,
    projectilePool,
    vfxPool,
    onShotsExhausted
) {
    this.session = session;
    this.config = config;
    this.trajectorySystem = trajectorySystem;
    this.projectilePool = projectilePool;
    this.vfxPool = vfxPool;
    this.onShotsExhausted = onShotsExhausted;
    this.levelNode = null;
    this.leftRubberNode = null;
    this.rightRubberNode = null;
    this.pouchNode = null;
    this.inputNode = null;
    this.readyProjectileNode = null;
    this.reserveProjectileNodes = [];
    this.ammoHudNode = null;
    this.ammoTextNode = null;
    this.isReloading = false;
    this.isAiming = false;
    this.timerGroup = new Game.TimerGroup();
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
    this.timerGroup.clear();
    this.projectilePool.attach(levelNode);
    this.trajectorySystem.attach(levelNode, inputNode);
    this.session.shotsRemaining = this.config.shotsPerRound;
    this.isReloading = false;
    this.isAiming = false;

    inputNode.__dragDist = 1;

    inputNode.__dragStart = function () {
        if (!controller.canAim()) {
            controller.isAiming = false;
            return;
        }

        controller.isAiming = true;
        controller.prepareProjectile();
        controller.trajectorySystem.beginAiming();
        controller.leftRubberNode.__killAllAnimations();
        controller.rightRubberNode.__killAllAnimations();
        controller.pouchNode.__killAllAnimations();
    };

    inputNode.__drag = function (x, y) {
        if (!controller.isAiming) {
            return;
        }

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
        if (!controller.isAiming) {
            this.__dmouse = null;
            return;
        }

        controller.isAiming = false;
        controller.trajectorySystem.hide();

        if (!this.__dmouse) {
            controller.removePreparedProjectile();
            controller.resetSling();
            return;
        }

        controller.session.shots++;
        controller.session.shotsRemaining--;
        controller.updateAmmoHud();
        controller.launch(this.__dmouse);
        controller.removePreparedProjectile();
        controller.resetSling();
        controller.updateReserveProjectiles();
        controller.scheduleReload();
        controller.scheduleLoseCheck();
        this.__dmouse = null;
    };

    this.prepareProjectile();
    this.updateReserveProjectiles();
    this.createAmmoHud();
    this.updateAmmoHud();
};

Game.ProjectileController.prototype.scheduleLoseCheck = function () {
    var controller = this;
    var config = this.config.settle;
    var stableChecks = 0;
    var elapsed = 0;

    if (this.session.shotsRemaining > 0) {
        return;
    }

    function checkLevelState() {
        if (controller.session.status !== 'playing') {
            return;
        }

        elapsed += config.checkInterval;
        stableChecks = controller.isLevelSettled()
            ? stableChecks + 1
            : 0;

        if (
            stableChecks >= config.stableChecks ||
            elapsed >= config.maxWait
        ) {
            controller.onShotsExhausted();
            return;
        }

        controller.timerGroup.schedule(
            checkLevelState,
            config.checkInterval
        );
    }

    this.timerGroup.schedule(checkLevelState, config.checkInterval);
};

Game.ProjectileController.prototype.isLevelSettled = function () {
    var threshold = this.config.settle.speedThreshold;
    var thresholdSquared = threshold * threshold;
    var settled = this.session.projectiles.length === 0;

    if (!settled) {
        return false;
    }

    $each(this.session.enemies, function (enemy) {
        var state = enemy.__enemyState;

        if (
            state &&
            state.status === 'dying'
        ) {
            settled = false;
            return;
        }

        if (
            enemy.__ph_body &&
            controllerBodyIsMoving(
                enemy.__ph_body,
                thresholdSquared
            )
        ) {
            settled = false;
        }
    });

    $each(this.session.structures, function (structure) {
        if (
            structure.__ph_body &&
            controllerBodyIsMoving(
                structure.__ph_body,
                thresholdSquared
            )
        ) {
            settled = false;
        }
    });

    $each(this.session.tnts, function (tnt) {
        if (
            tnt.__tntState === 'fused' ||
            (
                tnt.__ph_body &&
                controllerBodyIsMoving(
                    tnt.__ph_body,
                    thresholdSquared
                )
            )
        ) {
            settled = false;
        }
    });

    return settled;
};

function controllerBodyIsMoving(body, thresholdSquared) {
    return (
        !body.isStatic &&
        !body.isSleeping &&
        (
            body.velocity.x * body.velocity.x +
            body.velocity.y * body.velocity.y >
                thresholdSquared
        )
    );
}

Game.ProjectileController.prototype.canAim = function () {
    return (
        this.session.status === 'playing' &&
        this.session.shotsRemaining > 0 &&
        !this.isReloading &&
        this.readyProjectileNode &&
        !this.readyProjectileNode.__destructed
    );
};

Game.ProjectileController.prototype.prepareProjectile = function () {
    if (
        this.readyProjectileNode &&
        !this.readyProjectileNode.__destructed
    ) {
        this.readyProjectileNode.__visible = 1;
        return this.readyProjectileNode;
    }

    this.readyProjectileNode = this.pouchNode.__addChildBox({
        __img: this.config.image,
        __size: this.config.readySize,
        __ofs: this.config.readyOffset
    }).update();

    return this.readyProjectileNode;
};

Game.ProjectileController.prototype.updateReserveProjectiles = function () {
    var reserveConfig = this.config.reserve;
    var reserveCount = this.session.shotsRemaining;
    var i;

    if (!this.isReloading && this.readyProjectileNode) {
        reserveCount--;
    }

    while (
        this.reserveProjectileNodes.length <
        this.config.shotsPerRound - 1
    ) {
        i = this.reserveProjectileNodes.length;
        this.reserveProjectileNodes.push(
            this.inputNode.__addChildBox({
                __img: this.config.image,
                __size: reserveConfig.size,
                __ofs: [
                    reserveConfig.startOffset[0] -
                        i * reserveConfig.spacing,
                    reserveConfig.startOffset[1],
                    reserveConfig.startOffset[2]
                ]
            }).update()
        );
    }

    for (i = 0; i < this.reserveProjectileNodes.length; i++) {
        this.reserveProjectileNodes[i].__visible =
            i < reserveCount ? 1 : 0;
    }
};

Game.ProjectileController.prototype.createAmmoHud = function () {
    var hudConfig = this.config.hud;
    var ammoBadge;

    this.ammoHudNode = this.levelNode.__addChildBox({
        __size: hudConfig.size,
        __ofs: hudConfig.offset
    }).update();

    this.ammoHudNode.__addChildBox({
        __img: this.config.image,
        __size: hudConfig.iconSize,
        __ofs: hudConfig.iconOffset
    }).update();

    ammoBadge = this.ammoHudNode.__addChildBox({
        __color: '#18243d',
        __alpha: 0.92,
        __corner: [21, 21],
        __size: hudConfig.badgeSize,
        __ofs: hudConfig.badgeOffset
    }).update();

    this.ammoTextNode = ammoBadge.__addChildBox({
        __size: [72, 38],
        __text: {
            __text: '0/0',
            __fontsize: 29,
            __fontface: 'RussoOne',
            __fontWeight: 10,
            __color: '#ffffff',
            __autoscale: 0,
            __dontLocalize: 1,
            __lineWidth: 1.5,
            __lineColor: '#07101f',
            __lineAlpha: 0.9
        }
    }).update();
};

Game.ProjectileController.prototype.updateAmmoHud = function () {
    if (!this.ammoTextNode || this.ammoTextNode.__destructed) {
        return;
    }

    this.ammoTextNode.__text =
        this.session.shotsRemaining +
        '/' +
        this.config.shotsPerRound;
};

Game.ProjectileController.prototype.scheduleReload = function () {
    var controller = this;

    if (this.session.shotsRemaining <= 0) {
        this.isReloading = false;
        return;
    }

    this.isReloading = true;
    this.timerGroup.schedule(function () {
        if (
            !controller.inputNode ||
            controller.inputNode.__destructed ||
            controller.session.status !== 'playing'
        ) {
            return;
        }

        controller.isReloading = false;
        controller.prepareProjectile();
        controller.updateReserveProjectiles();
    }, this.config.reloadDelay);
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
        this.readyProjectileNode.__visible = 0;
    }
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
    var velocity;
    var projectile;
    var shotId;

    playSound('punch');

    velocity = dragVector
        .__clone()
        .__multiplyScalar(this.config.launchPower);
    shotId = ++this.session.projectileSequence;
    projectile = this.projectilePool.acquire(
        worldPosition,
        velocity,
        shotId
    );

    if (!projectile) {
        consoleLog('Projectile pool is exhausted');
        return null;
    }

    this.session.projectiles.push(projectile);

    this.timerGroup.schedule(function () {
        controller.disappear(projectile);
    }, this.config.lifetime);

    return projectile;
};

Game.ProjectileController.prototype.disappear = function (projectile) {
    var controller = this;
    var x;
    var y;
    var feather;

    if (
        !projectile ||
        projectile.__destructed ||
        projectile.__disappearing
    ) {
        return;
    }

    projectile.__disappearing = true;
    x = projectile.__offset.x;
    y = projectile.__offset.y;

    projectile.__physics = 0;
    projectile.__killAllAnimations();
    projectile.__anim({
        __scaleF: 0.65,
        __alpha: 0
    }, 0.3, 0, easeSineO);

    if (this.vfxPool) {
        feather = this.vfxPool.acquire('feather');

        if (feather) {
            feather.__x = x;
            feather.__y = y;
            feather.__width = 42;
            feather.__height = 42;
            feather.__rotate = randomInt(0, 360);
            feather.__alpha = 0.9;

            feather.__anim({
                __x: x + randomInt(-12, 12),
                __y: y - 18,
                __rotate: feather.__rotate + randomInt(80, 160),
                __scaleF: 0.75,
                __alpha: 0
            }, 0.4, 0, easeSineO);
            this.vfxPool.releaseAfter('feather', feather, 0.42);
        }
    }

    this.timerGroup.schedule(function () {
        controller.remove(projectile);
    }, 0.32);
};

Game.ProjectileController.prototype.remove = function (projectile) {
    removeFromArray(projectile, this.session.projectiles);

    if (projectile && !projectile.__destructed) {
        this.projectilePool.release(projectile);
    }
};

Game.ProjectileController.prototype.dispose = function () {
    var i;

    this.timerGroup.clear();

    for (i = this.session.projectiles.length - 1; i >= 0; i--) {
        this.remove(this.session.projectiles[i]);
    }

    if (
        this.readyProjectileNode &&
        !this.readyProjectileNode.__destructed
    ) {
        this.readyProjectileNode.__removeFromParent();
    }
    this.readyProjectileNode = null;
    for (i = 0; i < this.reserveProjectileNodes.length; i++) {
        if (!this.reserveProjectileNodes[i].__destructed) {
            this.reserveProjectileNodes[i].__removeFromParent();
        }
    }
    this.reserveProjectileNodes = [];
    if (this.ammoHudNode && !this.ammoHudNode.__destructed) {
        this.ammoHudNode.__removeFromParent();
    }
    this.ammoHudNode = null;
    this.ammoTextNode = null;
    this.isReloading = false;
    this.isAiming = false;
    this.projectilePool.dispose();
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
};
