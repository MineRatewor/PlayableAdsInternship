var Game = Game || {};

Game.LevelController = function (
    session,
    collisionSystem,
    destructibleSystem,
    projectileController,
    levels,
    onLevelComplete
) {
    this.session = session;
    this.collisionSystem = collisionSystem;
    this.destructibleSystem = destructibleSystem;
    this.projectileController = projectileController;
    this.levels = levels;
    this.onLevelComplete = onLevelComplete;
    this.timers = [];
    this.generation = 0;
};

Game.LevelController.prototype.load = function (levelIndex) {
    var controller = this;
    var levelConfig = this.levels[levelIndex];
    var inputNode;
    var generation;

    if (!levelConfig) {
        throw new Error('Unknown level index: ' + levelIndex);
    }

    if (this.session.levelNode) {
        this.dispose();
    }

    this.session.levelIndex = levelIndex;
    this.session.status = 'loading';
    generation = this.generation;

    this.session.levelNode = scene
        .__addChildBox(levelConfig.layout)
        .__setAliasesData({
            rubber: function (node) {
                controller.session.rubberNode = node;
            },

            userInputArea: function (node) {
                inputNode = node;
            }
        });

    this.projectileController.attach(
        this.session.levelNode,
        this.session.rubberNode,
        inputNode
    );

    this.schedule(function () {
        var levelNode = controller.session.levelNode;

        if (!levelNode || levelNode.__destructed) {
            return;
        }

        levelNode.update(1);
        controller.collisionSystem.start();

        levelNode.__traverse(function (node) {
            if (node.__ph_body && node.__isDestructibleTarget) {
                controller.destructibleSystem.registerTarget(
                    node,
                    Game.Config.destructible.targetHp
                );
            }
        });

        if (controller.generation === generation) {
            controller.session.status = 'playing';
        }
    }, 0.01);

    return this.session.levelNode;
};

Game.LevelController.prototype.restart = function () {
    this.load(this.session.levelIndex);
};

Game.LevelController.prototype.next = function () {
    var nextIndex = (this.session.levelIndex + 1) % this.levels.length;
    this.load(nextIndex);
};

Game.LevelController.prototype.complete = function () {
    if (this.session.status !== 'playing') {
        return;
    }

    this.session.status = 'won';
    this.onLevelComplete();
};

Game.LevelController.prototype.schedule = function (callback, delay) {
    var controller = this;
    var generation = this.generation;
    var timerId = _setTimeout(function () {
        removeFromArray(timerId, controller.timers);

        if (controller.generation === generation) {
            callback();
        }
    }, delay);

    this.timers.push(timerId);
    return timerId;
};

Game.LevelController.prototype.dispose = function () {
    var i;
    var levelNode = this.session.levelNode;

    this.session.status = 'disposing';
    this.generation++;

    for (i = 0; i < this.timers.length; i++) {
        _clearTimeout(this.timers[i]);
    }
    this.timers = [];

    this.projectileController.dispose();
    this.destructibleSystem.dispose();

    if (levelNode && !levelNode.__destructed) {
        levelNode.__removeFromParent();
    }

    this.session.resetLevelState();
};
