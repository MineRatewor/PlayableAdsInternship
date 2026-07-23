var Game = Game || {};

Game.Config = {
    projectile: {
        image: 'bird_1',
        size: [72, 72],
        launchPower: 0.2,
        lifetime: 2,
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
