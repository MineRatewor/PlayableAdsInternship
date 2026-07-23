var Game = Game || {};

Game.GameSession = function () {
    this.levelIndex = 0;
    this.levelNode = null;
    this.rubberNode = null;
    this.targets = [];
    this.fragments = [];
    this.projectiles = [];
    this.targetsLeft = 0;
    this.shots = 0;
    this.status = 'idle';
};

Game.GameSession.prototype.resetLevelState = function () {
    this.levelNode = null;
    this.rubberNode = null;
    this.targets = [];
    this.fragments = [];
    this.projectiles = [];
    this.targetsLeft = 0;
    this.shots = 0;
    this.status = 'idle';
};
