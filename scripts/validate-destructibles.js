'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let now = 1000;
let collisionCallback = null;
let fragmentsCreated = null;
let scoredStructures = 0;

const context = vm.createContext({
    Game: {
        TimerGroup: function () {
            this.schedule = function (callback) {
                callback();
            };
            this.clear = function () {};
        }
    },
    Date: {
        now: function () {
            now += 300;
            return now;
        }
    },
    Vector2: function (x, y) {
        this.x = x || 0;
        this.y = y || 0;
    },
    consoleLog: function () {},
    isString: function (value) {
        return typeof value === 'string';
    },
    looperPost: function (callback) {
        callback();
    },
    mmax: Math.max,
    $each: function (array, callback) {
        array.forEach(callback);
    },
    ph_Sleeping: {
        set: function () {}
    },
    removeFromArray: function (value, array) {
        const index = array.indexOf(value);
        if (index !== -1) {
            array.splice(index, 1);
        }
    },
    playSound: function () {
        throw new Error('Simulated packed audio failure');
    },
    random: Math.random,
    randomInt: function (min) {
        return min;
    },
    windowManager: {
        __hasOpenedWindow: function () {
            return false;
        }
    }
});

vm.runInContext(
    fs.readFileSync(
        path.join(root, 'src', 'config', 'game-config.js'),
        'utf8'
    ),
    context
);
vm.runInContext(
    fs.readFileSync(
        path.join(root, 'src', 'systems', 'destructible-system.js'),
        'utf8'
    ),
    context
);

const session = {
    structures: [],
    fragments: []
};
const collisionSystem = {
    register: function (body, callback) {
        collisionCallback = callback;
    },
    unregister: function () {}
};
const scoreSystem = {
    addStructure: function () {
        scoredStructures++;
    }
};
const system = new context.Game.DestructibleSystem(
    session,
    collisionSystem,
    scoreSystem,
    context.Game.Config.destructible
);
const body = {
    velocity: new context.Vector2(3, -1)
};
const node = {
    name: 'target_test',
    __img: 'wood_block',
    __ph_body: body,
    __size: new context.Vector2(112, 56),
    __x: 100,
    __y: 50,
    __removeFromParent: function () {
        this.__destructed = true;
    }
};

system.createFragments = function (x, y, size, velocity, material) {
    fragmentsCreated = {
        x: x,
        y: y,
        size: size,
        velocity: velocity,
        material: material
    };
};

assert.strictEqual(system.registerStructure(node), true);
assert.strictEqual(node.__structureState.material, 'wood');
assert.strictEqual(node.__structureState.maxHits, 2);

now += context.Game.Config.destructible.impact.armDelayMs;

collisionCallback(
    5,
    {
        __isProjectile: true,
        __projectileId: 1
    },
    null,
    0.1
);

assert.strictEqual(node.__img, 'wood_block_cracked');
assert.strictEqual(node.__structureState.hits, 1);
assert.strictEqual(fragmentsCreated, null);

collisionCallback(
    5,
    {
        __isProjectile: true,
        __projectileId: 2
    },
    null,
    0.1
);

assert.strictEqual(node.__destructed, true);
assert.strictEqual(scoredStructures, 1);
assert.strictEqual(fragmentsCreated.material, 'wood');
assert.strictEqual(session.structures.length, 0);

console.log(
    'Destructible validation passed: wood -> cracked -> fragments'
);
