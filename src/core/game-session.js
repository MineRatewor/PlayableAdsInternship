var Game = Game || {};

Game.GameSession = function () {
    this.levelIndex = 0;
    this.levelNode = null;
    this.rubberNode = null;
    this.structures = [];
    this.enemies = [];
    this.fragments = [];
    this.tnts = [];
    this.projectiles = [];
    this.projectileSequence = 0;
    this.enemiesLeft = 0;
    this.shots = 0;
    this.shotsRemaining = 0;
    this.score = 0;
    this.stars = 0;
    this.structuresDestroyed = 0;
    this.scoreFinalized = false;
    this.status = 'idle';
};

Game.GameSession.prototype.resetLevelState = function () {
    this.levelNode = null;
    this.rubberNode = null;
    this.structures = [];
    this.enemies = [];
    this.fragments = [];
    this.tnts = [];
    this.projectiles = [];
    this.projectileSequence = 0;
    this.enemiesLeft = 0;
    this.shots = 0;
    this.shotsRemaining = 0;
    this.score = 0;
    this.stars = 0;
    this.structuresDestroyed = 0;
    this.scoreFinalized = false;
    this.status = 'idle';
};
