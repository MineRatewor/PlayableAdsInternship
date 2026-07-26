var Game = Game || {};

Game.TrajectoryPredictor = function (
    trajectoryConfig,
    projectileConfig
) {
    this.config = trajectoryConfig;
    this.projectileConfig = projectileConfig;
};

Game.TrajectoryPredictor.prototype.predict = function (
    options,
    onPoint
) {
    var gravity = ph_Engine && ph_Engine.gravity
        ? ph_Engine.gravity
        : { x: 0, y: 1, scale: 0.001 };
    var gravityScale = gravity.scale === undefined
        ? 0.001
        : gravity.scale;
    var frameDuration = 1000 / 60;
    var accelerationX =
        gravity.x * gravityScale * frameDuration * frameDuration;
    var accelerationY =
        gravity.y * gravityScale * frameDuration * frameDuration;
    var airFriction = 1 -
        this.projectileConfig.physics.__frictionAir / 100;
    var positionX = options.startX;
    var positionY = options.startY;
    var velocityX = options.velocityX;
    var velocityY = options.velocityY;
    var pointIndex = 0;
    var frame;
    var previousX;
    var previousY;
    var segmentStartX;
    var segmentStartY;
    var segmentX;
    var segmentY;
    var segmentLength;
    var segmentUnitX;
    var segmentUnitY;
    var distanceToNextPoint = this.config.spacing;
    var shownDistance = 0;
    var reachedTarget = false;
    var progress;

    for (
        frame = 1;
        pointIndex < this.config.points &&
        shownDistance < options.maxDistance &&
        !reachedTarget &&
        frame < 600;
        frame++
    ) {
        previousX = positionX;
        previousY = positionY;
        velocityX = velocityX * airFriction + accelerationX;
        velocityY = velocityY * airFriction + accelerationY;
        positionX += velocityX;
        positionY += velocityY;

        if (
            positionX < options.minX ||
            positionX > options.maxX ||
            positionY > options.maxY
        ) {
            break;
        }

        segmentStartX = previousX;
        segmentStartY = previousY;
        segmentX = positionX - previousX;
        segmentY = positionY - previousY;
        segmentLength = Math.sqrt(
            segmentX * segmentX + segmentY * segmentY
        );

        if (segmentLength <= 0) {
            continue;
        }

        segmentUnitX = segmentX / segmentLength;
        segmentUnitY = segmentY / segmentLength;

        while (
            segmentLength >= distanceToNextPoint &&
            pointIndex < this.config.points &&
            shownDistance + distanceToNextPoint <=
                options.maxDistance
        ) {
            segmentStartX += segmentUnitX * distanceToNextPoint;
            segmentStartY += segmentUnitY * distanceToNextPoint;

            if (
                options.targetX !== null &&
                options.direction * segmentStartX >=
                    options.direction * options.targetX
            ) {
                reachedTarget = true;
                break;
            }

            pointIndex++;
            progress = pointIndex / this.config.points;
            onPoint(
                segmentStartX,
                segmentStartY,
                progress
            );

            shownDistance += distanceToNextPoint;
            segmentLength -= distanceToNextPoint;
            distanceToNextPoint = this.config.spacing;
        }

        distanceToNextPoint -= segmentLength;
    }

    return pointIndex;
};
