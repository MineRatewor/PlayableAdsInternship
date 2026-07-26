var Game = Game || {};

Game.LevelController = function (
    session,
    collisionSystem,
    destructibleSystem,
    enemySystem,
    projectileController,
    levels,
    onLevelComplete
) {
    this.session = session;
    this.collisionSystem = collisionSystem;
    this.destructibleSystem = destructibleSystem;
    this.enemySystem = enemySystem;
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
    var leftRubberNode;
    var rightRubberNode;
    var pouchNode;
    var generation;
    var enemiesRegistered;
    var enemyNodes = [];

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
            leftRubber: function (node) {
                leftRubberNode = node;
            },

            rightRubber: function (node) {
                rightRubberNode = node;
                controller.session.rubberNode = node;
            },

            pouch: function (node) {
                pouchNode = node;
            },

            userInputArea: function (node) {
                inputNode = node;
            },

            enemy_1: function (node) {
                enemyNodes.push(node);
            }
        });

    this.projectileController.attach(
        this.session.levelNode,
        leftRubberNode,
        rightRubberNode,
        pouchNode,
        inputNode
    );

    this.schedule(function () {
        var levelNode = controller.session.levelNode;

        if (!levelNode || levelNode.__destructed) {
            return;
        }

        levelNode.update(1);
        controller.collisionSystem.start();
        enemiesRegistered = 0;

        $each(enemyNodes, function (enemyNode) {
            if (controller.enemySystem.register(enemyNode)) {
                enemiesRegistered++;
            }
        });

        levelNode.__traverse(function (node) {
            if (!node.__ph_body || !node.name) {
                return;
            }

            if (node.name.indexOf('target_') === 0) {
                controller.destructibleSystem.registerStructure(
                    node,
                    Game.Config.destructible.structureHp
                );
            } else if (node.name.indexOf('death_zone_') === 0) {
                controller.enemySystem.registerDeathZone(node);
            } else if (
                node.name.indexOf('enemy_') === 0 &&
                enemyNodes.indexOf(node) === -1
            ) {
                if (controller.enemySystem.register(node)) {
                    enemiesRegistered++;
                }
            }
        });

        if (controller.generation === generation) {
            controller.session.status = 'playing';

            if (!enemiesRegistered) {
                consoleLog(
                    'Level "' + levelConfig.layout +
                    '" has no registered enemy_* nodes'
                );
            }
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
    this.enemySystem.dispose();

    if (levelNode && !levelNode.__destructed) {
        levelNode.__removeFromParent();
    }

    this.session.resetLevelState();
};
