var Game = Game || {};

Game.ObjectPool = function (
    factory,
    onAcquire,
    onRelease,
    onDestroy,
    maxSize
) {
    this.factory = factory;
    this.onAcquire = onAcquire;
    this.onRelease = onRelease;
    this.onDestroy = onDestroy;
    this.maxSize = maxSize || 0;
    this.items = [];
    this.available = [];
    this.active = [];
};

Game.ObjectPool.prototype.prewarm = function (count) {
    var item;

    while (
        this.items.length < count &&
        (!this.maxSize || this.items.length < this.maxSize)
    ) {
        item = this.factory();
        this.items.push(item);
        this.available.push(item);
    }
};

Game.ObjectPool.prototype.acquire = function () {
    var item = this.available.pop();

    if (!item) {
        if (this.maxSize && this.items.length >= this.maxSize) {
            return null;
        }

        item = this.factory();
        this.items.push(item);
    }

    this.active.push(item);

    if (this.onAcquire) {
        this.onAcquire.apply(null, [item].concat(
            Array.prototype.slice.call(arguments)
        ));
    }

    return item;
};

Game.ObjectPool.prototype.release = function (item) {
    var index = this.active.indexOf(item);

    if (index === -1) {
        return false;
    }

    this.active.splice(index, 1);

    if (this.onRelease) {
        this.onRelease(item);
    }

    this.available.push(item);
    return true;
};

Game.ObjectPool.prototype.releaseAll = function () {
    var active = this.active.slice();
    var i;

    for (i = 0; i < active.length; i++) {
        this.release(active[i]);
    }
};

Game.ObjectPool.prototype.dispose = function () {
    var i;

    this.releaseAll();

    if (this.onDestroy) {
        for (i = 0; i < this.items.length; i++) {
            this.onDestroy(this.items[i]);
        }
    }

    this.items = [];
    this.available = [];
    this.active = [];
};
