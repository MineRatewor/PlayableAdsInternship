options.__soundDisabled = 0;

Game.session = new Game.GameSession();
Game.collisionSystem = new Game.CollisionSystem();
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
Game.projectiles = new Game.ProjectileController(
    Game.session,
    Game.Config.projectile,
    Game.trajectorySystem
);
Game.destructibles = new Game.DestructibleSystem(
    Game.session,
    Game.collisionSystem
);
Game.enemies = new Game.EnemySystem(
    Game.session,
    Game.collisionSystem,
    Game.Config.enemy,
    function () {
        Game.levelController.complete();
    }
);
Game.levelController = new Game.LevelController(
    Game.session,
    Game.collisionSystem,
    Game.destructibles,
    Game.enemies,
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
