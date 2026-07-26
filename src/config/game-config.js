var Game = Game || {};

Game.Config = {
    levels: [
        {
            layout: 'level_1'
        },
        {
            layout: 'level_2'
        },
        {
            layout: 'level_3'
        }
    ],
    projectile: {
        image: 'bird_1',
        size: [22, 22],
        readySize: [16, 16],
        readyOffset: [0, -2, -24],
        shotsPerRound: 3,
        reloadDelay: 1,
        settle: {
            checkInterval: 0.25,
            stableChecks: 3,
            speedThreshold: 0.35,
            maxWait: 6
        },
        reserve: {
            size: [20, 20],
            startOffset: [-52, 72, -14],
            spacing: 31
        },
        hud: {
            offset: [-500, -314, -100],
            size: [150, 66],
            iconSize: [58, 58],
            iconOffset: [-43, 0, -3],
            badgeSize: [82, 42],
            badgeOffset: [34, 4, -2]
        },
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
        fragmentHp: 50,
        fragmentSize: [16, 16],
        fragmentStep: 56,
        fragmentPrewarm: 12,
        fragmentLimit: 28,
        fragmentLifetime: [4, 7],
        defaultMaterial: 'ice',
        materials: {
            ice: {
                hits: 1,
                damagedImage: null,
                fragmentImages: [
                    'break_1',
                    'break_2',
                    'break_3',
                    'break_4',
                    'break_5',
                    'break_6',
                    'break_7',
                    'break_8',
                    'break_9'
                ]
            },
            wood: {
                hits: 2,
                damagedImage: 'wood_block_cracked',
                fragmentImages: ['wood_fragment']
            },
            stone: {
                hits: 3,
                damagedImage: 'stone_block_cracked',
                fragmentImages: ['stone_fragment']
            }
        },
        impact: {
            projectileMinSpeed: 0.5,
            structureMinSpeed: 2,
            iceStructureMinSpeed: 6,
            environmentMinSpeed: 2,
            armDelayMs: 1000,
            cooldownMs: 250
        },
        sleepThreshold: 0
    },
    tnt: {
        triggerSpeed: 4,
        fuseDelay: 0.18,
        radius: 190,
        maxImpulse: 18,
        enemyDamage: 240,
        size: [52, 52]
    },
    scoring: {
        enemy: 5000,
        structure: 500,
        unusedProjectile: 7500,
        twoStars: 8000,
        threeStars: 15000,
        hud: {
            offset: [452, -314, -100],
            size: [300, 58]
        }
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
