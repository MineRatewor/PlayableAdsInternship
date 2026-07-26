options.__soundDisabled = 0;

Game.session = new Game.GameSession();
Game.collisionSystem = new Game.CollisionSystem();
Game.standaloneSounds = {};
Game.playStandaloneSound = function (name, volume) {
    var sound = Game.standaloneSounds[name];
    var source;

    if (options.__soundDisabled) {
        return;
    }

    if (!sound) {
        source = getCachedData('sounds/' + name + '.mp3');

        if (!source) {
            return;
        }

        sound = Game.standaloneSounds[name] = new __window.Howl({
            src: [source],
            volume: volume == undefined ? 1 : volume
        });
    }

    sound.play();
};
Game.vfx = new Game.VfxPool();
Game.vfx.register('feather', {
    __img: 'feather',
    __ofs: [0, 0, -25],
    __size: [58, 58],
    __visible: 0
}, 8, 18);
Game.vfx.register('explosion', {
    __img: 'explosion_core',
    __ofs: [0, 0, -40],
    __size: [120, 120],
    __visible: 0
}, 2, 5);
Game.vfx.register('scoreEnemy', {
    __size: [190, 58],
    __visible: 0,
    __text: {
        __text: '+0',
        __fontsize: 38,
        __fontface: 'RussoOne',
        __fontWeight: 10,
        __color: '#ff3b2f',
        __autoscale: 0,
        __dontLocalize: 1,
        __lineWidth: 2,
        __lineColor: '#2b0b08',
        __lineAlpha: 0.95
    }
}, 2, 6);
Game.vfx.register('scoreStructure', {
    __size: [190, 58],
    __visible: 0,
    __text: {
        __text: '+0',
        __fontsize: 38,
        __fontface: 'RussoOne',
        __fontWeight: 10,
        __color: '#ffffff',
        __autoscale: 0,
        __dontLocalize: 1,
        __lineWidth: 2,
        __lineColor: '#2b0b08',
        __lineAlpha: 0.95
    }
}, 3, 10);
Game.score = new Game.ScoreSystem(
    Game.session,
    Game.Config.scoring,
    Game.vfx
);
Game.trajectoryPointPool = new Game.TrajectoryPointPool(
    Game.Config.projectile.trajectory
);
Game.trajectoryTargetCache = new Game.TrajectoryTargetCache();
Game.trajectoryPredictor = new Game.TrajectoryPredictor(
    Game.Config.projectile.trajectory,
    Game.Config.projectile
);
Game.trajectorySystem = new Game.TrajectorySystem(
    Game.Config.projectile,
    Game.trajectoryPredictor,
    Game.trajectoryPointPool,
    Game.trajectoryTargetCache
);
Game.projectilePool = new Game.ProjectilePool(
    Game.Config.projectile
);
Game.projectiles = new Game.ProjectileController(
    Game.session,
    Game.Config.projectile,
    Game.trajectorySystem,
    Game.projectilePool,
    Game.vfx,
    function () {
        Game.levelController.lose();
    }
);
Game.destructibles = new Game.DestructibleSystem(
    Game.session,
    Game.collisionSystem,
    Game.score,
    Game.Config.destructible
);
Game.enemies = new Game.EnemySystem(
    Game.session,
    Game.collisionSystem,
    Game.score,
    Game.Config.enemy,
    Game.vfx,
    function () {
        Game.levelController.complete();
    }
);
Game.tnt = new Game.TntSystem(
    Game.session,
    Game.collisionSystem,
    Game.destructibles,
    Game.enemies,
    Game.Config.tnt,
    Game.vfx
);
Game.levelController = new Game.LevelController(
    Game.session,
    Game.collisionSystem,
    Game.destructibles,
    Game.enemies,
    Game.tnt,
    Game.projectiles,
    Game.score,
    Game.vfx,
    Game.Config.levels,
    function () {
        Game.levelController.schedule(show_win, 1);
    },
    function () {
        show_lose();
    }
);

function show_win() {
    var result = Game.score.finalize();
    var isLastLevel =
        Game.session.levelIndex === Game.Config.levels.length - 1;

    playSound('win');

    showWindow('win', function (windowNode) {
        var stars = [];
        var glows = [];
        var scoreNode;
        var replayButton;
        var nextLevelButton;

        windowNode.__setAliasesData({
            button: function (node) {
                replayButton = node;
                node.__visible = isLastLevel ? 1 : 0;
                node.__onTap = function () {
                    windowNode.__close();
                    Game.levelController.load(0);
                };
                node.__onTapHighlight = 1;
            },
            next_level_button: function (node) {
                nextLevelButton = node;
                node.__visible = isLastLevel ? 0 : 1;
                node.__onTap = function () {
                    windowNode.__close();
                    Game.levelController.next();
                };
                node.__onTapHighlight = 1;
            },
            score_value: function (node) {
                scoreNode = node;
            },
            star_1: function (node) {
                stars[0] = node;
            },
            star_2: function (node) {
                stars[1] = node;
            },
            star_3: function (node) {
                stars[2] = node;
            },
            star_1_glow: function (node) {
                glows[0] = node;
            },
            star_2_glow: function (node) {
                glows[1] = node;
            },
            star_3_glow: function (node) {
                glows[2] = node;
            }
        });

        if (replayButton) {
            replayButton.__x = 0;
        }
        if (nextLevelButton) {
            nextLevelButton.__x = 0;
        }

        animateWinScore(scoreNode, result.score);
        animateWinStars(stars, glows, result.stars);
    });
}

function show_lose() {
    playGameOverSound();

    showWindow('lose', function (windowNode) {
        windowNode.__setAliasesData({
            button: {
                __onTap: function () {
                    windowNode.__close();
                    Game.levelController.restart();
                },
                __onTapHighlight: 1
            }
        });
    });
}

function playGameOverSound() {
    Game.playStandaloneSound('game_over', 0.9);
}

function formatScore(score) {
    return String(score).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function setWinScoreText(scoreNode, score) {
    if (!scoreNode || scoreNode.__destructed) {
        return;
    }

    scoreNode.__text = formatScore(score) + ' ' + TR('points');
}

function animateWinScore(scoreNode, targetScore) {
    var step = 0;
    var steps = 24;

    function updateScore() {
        var progress;
        var displayedScore;

        if (!scoreNode || scoreNode.__destructed) {
            return;
        }

        step++;
        progress = 1 - pow(1 - step / steps, 3);
        displayedScore = round(targetScore * progress / 50) * 50;
        setWinScoreText(
            scoreNode,
            step === steps ? targetScore : displayedScore
        );

        if (step < steps) {
            Game.levelController.schedule(updateScore, 0.025);
        }
    }

    setWinScoreText(scoreNode, 0);
    Game.levelController.schedule(updateScore, 0.2);
}

function animateWinStars(stars, glows, starsEarned) {
    var i;

    for (i = 0; i < starsEarned; i++) {
        scheduleWinStar(stars[i], glows[i], 0.45 + i * 0.3);
    }
}

function scheduleWinStar(star, glow, delay) {
    Game.levelController.schedule(function () {
        if (!star || star.__destructed) {
            return;
        }

        star.__killAllAnimations();
        star.__scaleF = 0;
        star.__anim({
            __scaleF: 1
        }, 0.5, 0, easeElasticO);

        if (glow && !glow.__destructed) {
            glow.__killAllAnimations();
            glow.__scaleF = 0.45;
            glow.__alpha = 0.9;
            glow.__anim({
                __scaleF: 1.35,
                __alpha: 0
            }, 0.7, 0, easeSineO);
        }

        createWinStarBurst(star);
    }, delay);
}

function createWinStarBurst(star) {
    var parent = star.__parent;
    var i;
    var angle;
    var distance;
    var sparkle;

    if (!parent) {
        return;
    }

    for (i = 0; i < 7; i++) {
        angle = i * 360 / 7 + randomInt(-10, 10);
        distance = randomInt(70, 105);
        sparkle = parent.__addChildBox({
            __img: 'ui_sparkle',
            __size: [randomInt(18, 32), randomInt(18, 32)],
            __ofs: [star.__x, star.__y, -3],
            __rotate: randomInt(0, 360),
            __scaleF: 0.45,
            __alpha: 1
        }).update();

        sparkle.__anim({
            __x: star.__x + cos(angle * DEG2RAD) * distance,
            __y: star.__y + sin(angle * DEG2RAD) * distance,
            __rotate: sparkle.__rotate + randomInt(90, 180),
            __scaleF: 0,
            __alpha: 0
        }, 0.55, 0, easeSineO).__removeAfter(0.58);
    }
}

function restartLevel() {
    Game.levelController.restart();
}

BUS.__addEventListener(__ON_GAME_LOADED, function () {
    Game.levelController.load(0);
    return 1;
});
