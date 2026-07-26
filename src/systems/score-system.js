var Game = Game || {};

Game.ScoreSystem = function (session, config, vfxPool) {
    this.session = session;
    this.config = config;
    this.vfxPool = vfxPool;
    this.hudNode = null;
    this.hudTextNode = null;
    this.levelNode = null;
    this.displayedScore = 0;
    this.animationGeneration = 0;
    this.timerGroup = new Game.TimerGroup();
};

Game.ScoreSystem.prototype.reset = function () {
    this.session.score = 0;
    this.session.stars = 0;
    this.session.structuresDestroyed = 0;
    this.session.scoreFinalized = false;
    this.displayedScore = 0;
    this.animationGeneration++;
    this.timerGroup.clear();
    this.updateHudText(0);
};

Game.ScoreSystem.prototype.addEnemy = function (x, y) {
    if (!this.session.scoreFinalized) {
        this.session.score += this.config.enemy;
        this.animateHudTo(this.session.score);
        this.showFloatingScore(
            x,
            y,
            this.config.enemy,
            'scoreEnemy'
        );
    }
};

Game.ScoreSystem.prototype.addStructure = function (x, y) {
    if (!this.session.scoreFinalized) {
        this.session.structuresDestroyed++;
        this.session.score += this.config.structure;
        this.animateHudTo(this.session.score);
        this.showFloatingScore(
            x,
            y,
            this.config.structure,
            'scoreStructure'
        );
    }
};

Game.ScoreSystem.prototype.finalize = function () {
    if (!this.session.scoreFinalized) {
        this.session.score +=
            this.session.shotsRemaining *
            this.config.unusedProjectile;
        this.session.scoreFinalized = true;
        this.session.stars = this.calculateStars(this.session.score);
        this.animateHudTo(this.session.score);
    }

    return {
        score: this.session.score,
        stars: this.session.stars
    };
};

Game.ScoreSystem.prototype.attachHud = function (levelNode) {
    var hudConfig = this.config.hud;

    this.detachHud();
    this.levelNode = levelNode;
    this.hudNode = levelNode.__addChildBox({
        __size: hudConfig.size,
        __ofs: hudConfig.offset
    }).update();
    this.hudTextNode = this.hudNode.__addChildBox({
        __size: hudConfig.size,
        __text: {
            __text: '',
            __fontsize: 34,
            __fontface: 'RussoOne',
            __fontWeight: 10,
            __color: '#ffffff',
            __autoscale: 0,
            __dontLocalize: 1,
            __lineWidth: 2,
            __lineColor: '#07101f',
            __lineAlpha: 0.9
        }
    }).update();
    this.displayedScore = 0;
    this.updateHudText(0);
};

Game.ScoreSystem.prototype.showFloatingScore = function (
    x,
    y,
    points,
    poolKey
) {
    var system = this;
    var popup;

    if (
        x === undefined ||
        y === undefined ||
        !this.levelNode ||
        this.levelNode.__destructed ||
        !this.vfxPool
    ) {
        return;
    }

    popup = this.vfxPool.acquire(poolKey);

    if (!popup) {
        return;
    }

    popup.__text = '+' + points;
    popup.__x = x;
    popup.__y = y - 8;
    popup.__scaleF = 0.25;
    popup.__alpha = 0;
    popup.__anim({
        __y: y - 45,
        __scaleF: 1,
        __alpha: 1
    }, 0.32, 0, easeBackO);

    this.timerGroup.schedule(function () {
        if (!popup || popup.__destructed) {
            return;
        }

        popup.__anim({
            __y: y - 82,
            __scaleF: 0.88,
            __alpha: 0
        }, 0.55, 0, easeSineO);
        system.vfxPool.releaseAfter(poolKey, popup, 0.58);
    }, 0.55);
};

Game.ScoreSystem.prototype.updateHudText = function (score) {
    if (!this.hudTextNode || this.hudTextNode.__destructed) {
        return;
    }

    this.hudTextNode.__text =
        TR('score') + ': ' +
        String(score).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

Game.ScoreSystem.prototype.animateHudTo = function (targetScore) {
    var system = this;
    var startScore = this.displayedScore;
    var step = 0;
    var steps = 14;
    var generation = ++this.animationGeneration;

    function update() {
        var progress;

        if (
            generation !== system.animationGeneration ||
            !system.hudTextNode ||
            system.hudTextNode.__destructed
        ) {
            return;
        }

        step++;
        progress = 1 - pow(1 - step / steps, 3);
        system.displayedScore = step === steps
            ? targetScore
            : round(startScore + (targetScore - startScore) * progress);
        system.updateHudText(system.displayedScore);

        if (step < steps) {
            system.timerGroup.schedule(update, 0.025);
        } else {
            system.hudTextNode.__killAllAnimations();
            system.hudTextNode.__scaleF = 1.1;
            system.hudTextNode.__anim({
                __scaleF: 1
            }, 0.18, 0, easeSineO);
        }
    }

    update();
};

Game.ScoreSystem.prototype.detachHud = function () {
    this.animationGeneration++;
    this.timerGroup.clear();

    if (this.hudNode && !this.hudNode.__destructed) {
        this.hudNode.__removeFromParent();
    }

    this.hudNode = null;
    this.hudTextNode = null;
    this.levelNode = null;
};

Game.ScoreSystem.prototype.calculateStars = function (score) {
    if (score >= this.config.threeStars) {
        return 3;
    }

    if (score >= this.config.twoStars) {
        return 2;
    }

    return 1;
};
