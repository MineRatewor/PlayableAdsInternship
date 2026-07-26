var Game = Game || {};

Game.Config = {
    levels: [
        {
            layout: 'level_1'
        }
    ],
    projectile: {
        image: 'bird_1',
        size: [22, 22],
        readySize: [16, 16],
        readyOffset: [0, -2, 8],
        maxPullDistance: 125,
        launchPower: 0.2,
        lifetime: 2,
        trajectory: {
            points: 24,
            spacing: 34,
            maxLevelWidthFactor: 0.85,
            startSize: 14,
            endSize: 5,
            color: '#ffffff',
            outlineColor: '#000000',
            outlineFactor: 0.14,
            startAlpha: 0.95,
            endAlpha: 0.5,
            z: -18
        },
        physics: {
            __isStatic: false,
            __friction: 130,
            __frictionAir: 0.2,
            __frictionStatic: 500,
            __restitution: 0,
            __density: 4,
            __bodyType: 1
        }
    },
    destructible: {
        structureHp: 100,
        fragmentHp: 50
    },
    enemy: {
        hp: 160,
        projectileDamage: 90,
        collisionDamageMultiplier: 35,
        minCollisionSpeed: 1.5,
        density: 1.5,
        frictionAir: 0.15,
        sleepThreshold: 0
    }
};
