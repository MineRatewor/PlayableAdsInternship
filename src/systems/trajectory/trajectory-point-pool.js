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
    var point;

    while (this.nodes.length < this.config.points) {
        point = this.parentNode.__addChildBox({
            __img: 'circle1',
            __color: this.config.color,
            __alpha: this.config.startAlpha,
            __size: [
                this.config.startSize,
                this.config.startSize
            ],
            __z: this.config.z,
            __visible: 0
        }).update();
        this.nodes.push(point);
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

    point.__x = x;
    point.__y = y;
    point.__width = size;
    point.__height = size;
    point.__alpha = this.config.startAlpha +
        (
            this.config.endAlpha -
            this.config.startAlpha
        ) * progress;
    point.__visible = 1;
};

Game.TrajectoryPointPool.prototype.end = function () {
    var i;

    for (i = this.activeCount; i < this.nodes.length; i++) {
        this.nodes[i].__visible = 0;
    }
};

Game.TrajectoryPointPool.prototype.hide = function () {
    this.activeCount = 0;
    this.end();
};

Game.TrajectoryPointPool.prototype.dispose = function () {
    var i;

    for (i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].__destructed) {
            this.nodes[i].__removeFromParent();
        }
    }

    this.nodes = [];
    this.parentNode = null;
    this.activeCount = 0;
};
