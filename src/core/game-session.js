var Game = Game || {};

Game.GameSession = function () {
    this.levelIndex = 0;
    this.levelNode = null;
    this.rubberNode = null;
    this.structures = [];
    this.enemies = [];
    this.fragments = [];
    this.projectiles = [];
    this.enemiesLeft = 0;
    this.shots = 0;
    this.status = 'idle';
};

Game.GameSession.prototype.resetLevelState = function () {
    this.levelNode = null;
    this.rubberNode = null;
    this.structures = [];
    this.enemies = [];
    this.fragments = [];
    this.projectiles = [];
    this.enemiesLeft = 0;
    this.shots = 0;
    this.status = 'idle';
};
