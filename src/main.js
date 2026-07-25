options.__soundDisabled = 0;

Game.session = new Game.GameSession();
Game.collisionSystem = new Game.CollisionSystem();
Game.projectiles = new Game.ProjectileController(
    Game.session,
    Game.Config.projectile
);
Game.destructibles = new Game.DestructibleSystem(
    Game.session,
    Game.collisionSystem,
    function () {
        Game.levelController.complete();
    }
);
Game.levelController = new Game.LevelController(
    Game.session,
    Game.collisionSystem,
    Game.destructibles,
    Game.projectiles,
    Game.Config.levels,
    function () {
        Game.levelController.schedule(show_win, 1);
    }
);

function show_win() {
    playSound('win');

    showWindow('win', function (windowNode) {
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

function restartLevel() {
    Game.levelController.restart();
}

BUS.__addEventListener(__ON_GAME_LOADED, function () {
    Game.levelController.load(0);
    return 1;
});
