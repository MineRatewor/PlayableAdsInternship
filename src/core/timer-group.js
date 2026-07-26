var Game = Game || {};

Game.TimerGroup = function () {
    this.ids = [];
    this.generation = 0;
};

Game.TimerGroup.prototype.schedule = function (callback, delay) {
    var group = this;
    var generation = this.generation;
    var timerId = _setTimeout(function () {
        removeFromArray(timerId, group.ids);

        if (group.generation === generation) {
            callback();
        }
    }, delay);

    this.ids.push(timerId);
    return timerId;
};

Game.TimerGroup.prototype.cancel = function (timerId) {
    if (this.ids.indexOf(timerId) === -1) {
        return false;
    }

    _clearTimeout(timerId);
    removeFromArray(timerId, this.ids);
    return true;
};

Game.TimerGroup.prototype.clear = function () {
    var i;

    this.generation++;

    for (i = 0; i < this.ids.length; i++) {
        _clearTimeout(this.ids[i]);
    }

    this.ids = [];
};
