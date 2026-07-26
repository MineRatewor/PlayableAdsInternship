var Game = Game || {};

Game.TrajectorySystem = function (
    config,
    predictor,
    pointPool,
    targetCache
) {
    this.config = config;
    this.predictor = predictor;
    this.pointPool = pointPool;
    this.targetCache = targetCache;
    this.levelNode = null;
    this.inputNode = null;
    this.lastDragX = null;
    this.lastDragY = null;
};

Game.TrajectorySystem.prototype.attach = function (
    levelNode,
    inputNode
) {
    this.levelNode = levelNode;
    this.inputNode = inputNode;
    this.pointPool.attach(levelNode);
};

Game.TrajectorySystem.prototype.beginAiming = function () {
    this.hide();
    this.targetCache.refresh(this.levelNode);
};

Game.TrajectorySystem.prototype.update = function (dragVector) {
    var dragDeltaX;
    var dragDeltaY;
    var startX;
    var startY;
    var levelX;
    var levelY;
    var direction;
    var targetX;
    var levelHalfWidth;
    var levelHalfHeight;
    var levelMargin = this.config.trajectory.spacing * 2;
    var system = this;

    if (
        !dragVector ||
        dragVector.x * dragVector.x +
            dragVector.y * dragVector.y < 4
    ) {
        this.hide();
        return;
    }

    if (this.lastDragX !== null) {
        dragDeltaX = dragVector.x - this.lastDragX;
        dragDeltaY = dragVector.y - this.lastDragY;

        if (
            dragDeltaX * dragDeltaX +
            dragDeltaY * dragDeltaY < 1
        ) {
            return;
        }
    }

    this.lastDragX = dragVector.x;
    this.lastDragY = dragVector.y;
    startX = this.inputNode.__worldPosition.x - dragVector.x;
    startY = this.inputNode.__worldPosition.y - dragVector.y;
    levelX = this.levelNode.__worldPosition.x;
    levelY = this.levelNode.__worldPosition.y;
    direction = dragVector.x < 0 ? -1 : 1;
    targetX = this.targetCache.getNearestEdgeX(
        startX,
        direction
    );
    levelHalfWidth = this.levelNode.__size.x / 2;
    levelHalfHeight = this.levelNode.__size.y / 2;

    this.pointPool.begin();
    this.predictor.predict(
        {
            startX: startX,
            startY: startY,
            velocityX:
                dragVector.x * this.config.launchPower,
            velocityY:
                dragVector.y * this.config.launchPower,
            direction: direction,
            targetX: targetX,
            maxDistance:
                this.levelNode.__size.x *
                this.config.trajectory.maxLevelWidthFactor,
            minX: levelX - levelHalfWidth - levelMargin,
            maxX: levelX + levelHalfWidth + levelMargin,
            maxY: levelY + levelHalfHeight + levelMargin
        },
        function (x, y, progress) {
            system.pointPool.show(
                x - levelX,
                y - levelY,
                progress
            );
        }
    );
    this.pointPool.end();
};

Game.TrajectorySystem.prototype.hide = function () {
    this.lastDragX = null;
    this.lastDragY = null;
    this.pointPool.hide();
};

Game.TrajectorySystem.prototype.dispose = function () {
    this.pointPool.dispose();
    this.targetCache.clear();
    this.levelNode = null;
    this.inputNode = null;
    this.lastDragX = null;
    this.lastDragY = null;
};
