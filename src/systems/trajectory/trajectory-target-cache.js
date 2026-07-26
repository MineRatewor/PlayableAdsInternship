var Game = Game || {};

Game.TrajectoryTargetCache = function () {
    this.targets = [];
};

Game.TrajectoryTargetCache.prototype.refresh = function (levelNode) {
    var targets = this.targets;

    targets.length = 0;

    levelNode.__traverse(function (node) {
        var position;

        if (
            node.__destructed ||
            !node.name ||
            node.name.indexOf('target_') !== 0
        ) {
            return;
        }

        position = node.__worldPosition;
        targets.push({
            x: position.x,
            halfWidth: node.__size.x / 2
        });
    });
};

Game.TrajectoryTargetCache.prototype.getNearestEdgeX = function (
    startX,
    direction
) {
    var targetX = null;
    var i;
    var edgeX;

    for (i = 0; i < this.targets.length; i++) {
        edgeX = this.targets[i].x -
            direction * this.targets[i].halfWidth;

        if (
            direction * (edgeX - startX) > 0 &&
            (
                targetX === null ||
                direction * edgeX < direction * targetX
            )
        ) {
            targetX = edgeX;
        }
    }

    return targetX;
};

Game.TrajectoryTargetCache.prototype.clear = function () {
    this.targets.length = 0;
};
