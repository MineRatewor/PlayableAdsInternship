options.__soundDisabled = 0;

Game.session = new Game.GameSession();
Game.collisionSystem = new Game.CollisionSystem();
Game.destructibles = new Game.DestructibleSystem(
    Game.session,
    Game.collisionSystem,
    function () {
        _setTimeout(function () {
            show_win();
        }, 1);
    }
);

function show_win() {
    playSound('win');

    showWindow('win', function (windowNode) {
        windowNode.__setAliasesData({
            button: {
                __onTap: function () {
                    windowNode.__close();
                    restartLevel();
                },
                __onTapHighlight: 1
            }
        });
    });
}

function restartLevel() {
    Game.destructibles.dispose();

    if (Game.session.levelNode && !Game.session.levelNode.__destructed) {
        Game.session.levelNode.__removeFromParent();
    }

    Game.session.resetLevelState();
    initLevel();
}

function initLevel() {
    Game.session.levelNode = scene
        .__addChildBox('level_1')
        .__setAliasesData({
            rubber: function (node) {
                Game.session.rubberNode = node;
            },

            userInputArea: {
                __dragDist: 1,

                __drag: function (x, y) {
                    var dragVector = this.__dmouse =
                        this.__worldPosition.__clone().sub(new Vector2(x, y));

                    Game.session.rubberNode.__parent.__rotate =
                        -dragVector.__angle() * RAD2DEG;
                    Game.session.rubberNode.__width = dragVector.__length();
                },

                __dragStart: function () {
                    Game.session.rubberNode.__killAllAnimations();
                },

                __dragEnd: function () {
                    var worldPosition;
                    var projectile;
                    var velocity;

                    playSound('punch');

                    Game.session.rubberNode.__anim({
                        __width: 10
                    }, 0.4, 0, easeElasticO);

                    worldPosition = this.__worldPosition;
                    projectile = Game.session.levelNode.__addChildBox({
                        __img: Game.Config.projectile.image,
                        __size: Game.Config.projectile.size,
                        __ofs: [worldPosition.x, worldPosition.y, -20],
                        __physics: Game.Config.projectile.physics
                    }).update();
                    velocity = this.__dmouse.__multiplyScalar(
                        Game.Config.projectile.launchPower
                    );

                    if (projectile.__ph_body) {
                        ph_Body.setInertia(projectile.__ph_body, Infinity);
                        ph_Body.setAngularVelocity(projectile.__ph_body, 0);
                        ph_Body.setVelocity(projectile.__ph_body, velocity);
                    }

                    _setTimeout(function () {
                        if (!projectile.__destructed) {
                            projectile.__removeFromParent();
                        }
                    }, Game.Config.projectile.lifetime);
                }
            }
        });

    _setTimeout(function () {
        Game.session.levelNode.update(1);
        Game.collisionSystem.start();

        Game.session.levelNode.__traverse(function (node) {
            if (node.__ph_body && node.__isDestructibleTarget) {
                Game.destructibles.registerTarget(
                    node,
                    Game.Config.destructible.targetHp
                );
            }
        });
    }, 0.01);
}

BUS.__addEventListener(__ON_GAME_LOADED, function () {
    initLevel();
    return 1;
});
