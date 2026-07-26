var Game = Game || {};

Game.TrajectoryPointPool = function (config) {
    this.config = config;
    this.parentNode = null;
    this.nodes = [];
    this.activeCount = 0;
};

Game.TrajectoryPointPool.prototype.attach = function (parentNode) {
    this.parentNode = parentNode;
};

Game.TrajectoryPointPool.prototype.ensureCapacity = function () {
    var outline;
    var fill;

    while (this.nodes.length < this.config.points) {
        outline = this.parentNode.__addChildBox({
            __img: 'circle1',
            __color: this.config.outlineColor,
            __alpha: this.config.startAlpha,
            __size: [
                this.config.startSize,
                this.config.startSize
            ],
            __z: this.config.z,
            __visible: 0
        }).update();
        fill = outline.__addChildBox({
            __img: 'circle1',
            __color: this.config.color,
            __size: [
                this.config.startSize,
                this.config.startSize
            ],
            __z: -1
        }).update();
        this.nodes.push({
            outline: outline,
            fill: fill
        });
    }
};

Game.TrajectoryPointPool.prototype.begin = function () {
    this.ensureCapacity();
    this.activeCount = 0;
};

Game.TrajectoryPointPool.prototype.show = function (
    x,
    y,
    progress
) {
    var point = this.nodes[this.activeCount++];
    var size = this.config.startSize +
        (
            this.config.endSize -
            this.config.startSize
        ) * progress;
    var outlineWidth = Math.max(
        1,
        size * this.config.outlineFactor
    );
    var fillSize = Math.max(1, size - outlineWidth * 2);
    var alpha = this.config.startAlpha +
        (
            this.config.endAlpha -
            this.config.startAlpha
        ) * progress;

    point.outline.__x = x;
    point.outline.__y = y;
    point.outline.__width = size;
    point.outline.__height = size;
    point.outline.__alpha = alpha;
    point.outline.__visible = 1;
    point.fill.__width = fillSize;
    point.fill.__height = fillSize;
};

Game.TrajectoryPointPool.prototype.end = function () {
    var i;

    for (i = this.activeCount; i < this.nodes.length; i++) {
        this.nodes[i].outline.__visible = 0;
    }
};

Game.TrajectoryPointPool.prototype.hide = function () {
    this.activeCount = 0;
    this.end();
};

Game.TrajectoryPointPool.prototype.dispose = function () {
    var i;

    for (i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].outline.__destructed) {
            this.nodes[i].outline.__removeFromParent();
        }
    }

    this.nodes = [];
    this.parentNode = null;
    this.activeCount = 0;
};
