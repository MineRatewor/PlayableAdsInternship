var Game = Game || {};

Game.Config = {
    levels: [
        {
            layout: 'level_1'
        }
    ],
    projectile: {
        image: 'bird_1',
        size: [72, 72],
        readySize: [52, 52],
        readyOffset: [0, -6, 8],
        launchPower: 0.2,
        lifetime: 2,
        trajectory: {
            points: 24,
            spacing: 34,
            maxLevelWidthFactor: 0.85,
            startSize: 14,
            endSize: 5,
            color: '#ffffff',
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
        targetHp: 100,
        fragmentHp: 50
    }
};
