var Game = Game || {};

Game.VfxPool = function () {
    this.parentNode = null;
    this.configs = {};
    this.pools = {};
    this.timerGroup = new Game.TimerGroup();
    this.nextLeaseId = 1;
};

Game.VfxPool.prototype.register = function (
    key,
    options,
    prewarmCount,
    maxSize
) {
    this.configs[key] = {
        options: options,
        prewarmCount: prewarmCount || 0,
        maxSize: maxSize || 0
    };

    if (this.parentNode) {
        this.ensurePool(key).prewarm(prewarmCount || 0);
    }
};

Game.VfxPool.prototype.attach = function (parentNode) {
    var key;

    this.dispose();
    this.parentNode = parentNode;

    for (key in this.configs) {
        if (this.configs.hasOwnProperty(key)) {
            this.ensurePool(key).prewarm(
                this.configs[key].prewarmCount
            );
        }
    }
};

Game.VfxPool.prototype.ensurePool = function (key) {
    var vfxPool = this;
    var config = this.configs[key];
    var pool = this.pools[key];

    if (pool) {
        return pool;
    }

    if (!config || !this.parentNode) {
        throw new Error('Unknown or unattached VFX pool: ' + key);
    }

    pool = new Game.ObjectPool(
        function () {
            return vfxPool.parentNode.__addChildBox(
                deepCloneNotNull(config.options)
            ).update();
        },
        function (node) {
            node.__killAllAnimations();
            node.__visible = 1;
            node.__alpha = 1;
            node.__scaleF = 1;
            node.__scalex = 1;
            node.__scaley = 1;
            node.__rotate = 0;
            node.__vfxLeaseId = vfxPool.nextLeaseId++;
        },
        function (node) {
            node.__killAllAnimations();
            node.__visible = 0;
        },
        function (node) {
            if (!node.__destructed) {
                node.__removeFromParent();
            }
        },
        config.maxSize
    );

    this.pools[key] = pool;
    return pool;
};

Game.VfxPool.prototype.acquire = function (key) {
    return this.ensurePool(key).acquire();
};

Game.VfxPool.prototype.release = function (key, node) {
    var pool = this.pools[key];

    return pool ? pool.release(node) : false;
};

Game.VfxPool.prototype.releaseAfter = function (
    key,
    node,
    delay
) {
    var vfxPool = this;
    var leaseId = node && node.__vfxLeaseId;

    this.timerGroup.schedule(function () {
        if (
            node &&
            !node.__destructed &&
            node.__vfxLeaseId === leaseId
        ) {
            vfxPool.release(key, node);
        }
    }, delay);
};

Game.VfxPool.prototype.toLocal = function (x, y) {
    var parentPosition = this.parentNode &&
        this.parentNode.__worldPosition;

    return new Vector2(
        x - (parentPosition ? parentPosition.x : 0),
        y - (parentPosition ? parentPosition.y : 0)
    );
};

Game.VfxPool.prototype.getNodePosition = function (node) {
    var position = node.__worldPosition;
    return this.toLocal(position.x, position.y);
};

Game.VfxPool.prototype.dispose = function () {
    var key;

    this.timerGroup.clear();

    for (key in this.pools) {
        if (this.pools.hasOwnProperty(key)) {
            this.pools[key].dispose();
        }
    }

    this.pools = {};
    this.parentNode = null;
};
