var Game = Game || {};

Game.DestructibleSystem = function (
    session,
    collisionSystem,
    scoreSystem,
    config
) {
    this.session = session;
    this.collisionSystem = collisionSystem;
    this.scoreSystem = scoreSystem;
    this.config = config;
    this.awakeScheduled = false;
    this.active = false;
    this.generation = 0;
    this.timerGroup = new Game.TimerGroup();
    this.fragmentPool = null;
    this.nextFragmentLeaseId = 1;
};

Game.DestructibleSystem.prototype.registerStructure = function (
    node,
    material
) {
    var body = node.__ph_body;
    var config = this.config;
    var materialConfig;
    var destructibles = this;

    if (!body) {
        return false;
    }

    material = this.resolveMaterial(node, material);
    materialConfig = this.getMaterialConfig(material);

    if (!materialConfig) {
        consoleLog(
            'Unknown structure material "' + material +
            '" on node "' + node.name + '"; using "' +
            config.defaultMaterial + '"'
        );
        material = config.defaultMaterial;
        materialConfig = this.getMaterialConfig(material);
    }

    this.active = true;
    this.session.structures.push(node);
    node.__destructibleType = 'structure';
    node.__structureState = {
        material: material,
        hits: 0,
        maxHits: materialConfig.hits,
        hitProjectiles: {},
        lastHitTime: 0,
        damageEnabledAt: Date.now() + config.impact.armDelayMs
    };
    body.__hp = materialConfig.hits;
    body.__isStructure = true;
    body.__structureNode = node;
    body.sleepThreshold = config.sleepThreshold;
    ph_Sleeping.set(body, false);

    this.collisionSystem.register(
        body,
        function (
            impactSpeed,
            otherBody,
            pair,
            normalImpactSpeed
        ) {
            destructibles.damage(
                node,
                normalImpactSpeed === undefined
                    ? impactSpeed
                    : mmax(impactSpeed, normalImpactSpeed),
                otherBody
            );
        }
    );

    return true;
};

Game.DestructibleSystem.prototype.resolveMaterial = function (
    node,
    material
) {
    var userMaterial = node.__userData && node.__userData.material;
    var image = isString(node.__img) ? node.__img.toLowerCase() : '';

    material = material || userMaterial;

    if (this.getMaterialConfig(material)) {
        return material;
    }

    if (image.indexOf('stone_') === 0) {
        return 'stone';
    }

    if (image.indexOf('wood_') === 0) {
        return 'wood';
    }

    return this.config.defaultMaterial;
};

Game.DestructibleSystem.prototype.getMaterialConfig = function (material) {
    var materials = this.config.materials;

    switch (material) {
    case 'ice':
        return materials.ice;
    case 'wood':
        return materials.wood;
    case 'stone':
        return materials.stone;
    default:
        return null;
    }
};

Game.DestructibleSystem.prototype.registerFragment = function (node, hp) {
    if (this.session.fragments.indexOf(node) === -1) {
        this.session.fragments.push(node);
    }
    node.__destructibleType = 'fragment';
    this.registerDamage(node, hp);
};

Game.DestructibleSystem.prototype.registerDamage = function (node, hp) {
    var body = node.__ph_body;
    var destructibles = this;

    if (!body) {
        return;
    }

    body.__hp = hp;
    this.collisionSystem.register(body, function (impactSpeed) {
        destructibles.damageFragment(node, impactSpeed);
    });
};

Game.DestructibleSystem.prototype.damage = function (node, impactSpeed) {
    var body = node.__ph_body;
    var state = node.__structureState;
    var otherBody = arguments[2];
    var impactConfig = this.config.impact;
    var minImpactSpeed;
    var now;
    var projectileId;

    if (otherBody && otherBody.__isProjectile) {
        minImpactSpeed = impactConfig.projectileMinSpeed;
    } else if (otherBody && otherBody.__isStructure) {
        minImpactSpeed = state.material === 'ice'
            ? impactConfig.iceStructureMinSpeed
            : impactConfig.structureMinSpeed;
    } else {
        minImpactSpeed = impactConfig.environmentMinSpeed;
    }

    if (
        !this.active ||
        !body ||
        !state ||
        state.hits >= state.maxHits ||
        Date.now() < state.damageEnabledAt ||
        impactSpeed < minImpactSpeed
    ) {
        return;
    }

    now = Date.now();

    if (otherBody && otherBody.__isProjectile) {
        projectileId = otherBody.__projectileId;

        if (state.hitProjectiles[projectileId]) {
            return;
        }
    }

    if (now - state.lastHitTime < impactConfig.cooldownMs) {
        return;
    }

    if (projectileId !== undefined) {
        state.hitProjectiles[projectileId] = true;
    }

    state.lastHitTime = now;
    state.hits++;
    body.__hp = state.maxHits - state.hits;

    if (state.hits >= state.maxHits) {
        this.destroy(node);
    } else {
        this.showDamaged(node);
    }
};

Game.DestructibleSystem.prototype.damageFragment = function (
    node,
    impactSpeed
) {
    var body = node.__ph_body;
    var damage;
    var destructibles;
    var generation;

    if (!this.active || !body || !body.__hp) {
        return;
    }

    damage = impactSpeed <= 2
        ? 0
        : floor(clamp(
            (impactSpeed - 1) * (impactSpeed - 2),
            0,
            100
        ));

    if (!damage) {
        return;
    }

    body.__hp = mmax(0, body.__hp - damage);

    if (!body.__hp) {
        destructibles = this;
        generation = this.generation;
        this.collisionSystem.unregister(body);
        looperPost(function () {
            if (destructibles.isCurrent(generation)) {
                destructibles.remove(node);
            }
        });
    }
};

Game.DestructibleSystem.prototype.showDamaged = function (node) {
    var state = node.__structureState;
    var materialConfig = state &&
        this.getMaterialConfig(state.material);

    if (materialConfig && materialConfig.damagedImage) {
        node.__img = materialConfig.damagedImage;
    }
};

Game.DestructibleSystem.prototype.destroy = function (node) {
    var body = node && node.__ph_body;
    var destructibles = this;
    var generation = this.generation;

    if (
        !this.active ||
        !body ||
        !node.__structureState ||
        node.__structureState.destroying
    ) {
        return;
    }

    node.__structureState.destroying = true;
    node.__structureState.hits = node.__structureState.maxHits;
    body.__hp = 0;
    this.collisionSystem.unregister(body);

    looperPost(function () {
        if (destructibles.isCurrent(generation)) {
            destructibles.remove(node);
        }
    });
};

Game.DestructibleSystem.prototype.remove = function (node) {
    var body;
    var velocity;
    var size;
    var x;
    var y;
    var destructibleType;
    var collection;
    var material;

    if (!this.active || !node || node.__destructed) {
        return;
    }

    body = node.__ph_body;
    velocity = body ? body.velocity : new Vector2();
    size = node.__size;
    x = node.__x;
    y = node.__y;
    destructibleType = node.__destructibleType;
    material = node.__structureState
        ? node.__structureState.material
        : this.config.defaultMaterial;
    collection = destructibleType === 'structure'
        ? this.session.structures
        : this.session.fragments;

    if (body) {
        this.collisionSystem.unregister(body);
        body.__isStructure = false;
        body.__structureNode = null;
    }

    removeFromArray(node, collection);

    if (
        destructibleType === 'fragment' &&
        node.__isPooledFragment &&
        this.fragmentPool
    ) {
        this.fragmentPool.release(node);
    } else {
        node.__removeFromParent();
        this.scheduleAwakeDestructibles();
    }

    if (destructibleType === 'structure') {
        this.scoreSystem.addStructure(x, y);
        this.playBreakSound();
        this.createFragments(x, y, size, velocity, material);
    } else if (random() > 0.5 && !windowManager.__hasOpenedWindow()) {
        this.playBreakSound();
    }
};

Game.DestructibleSystem.prototype.createFragments = function (
    centerX,
    centerY,
    size,
    velocity,
    material
) {
    var step = this.config.fragmentStep;
    var startX = centerX - size.x / 2;
    var startY = centerY - size.y / 2;
    var x;
    var y;

    for (x = 0; x < size.x; x += step) {
        for (y = 0; y < size.y; y += step) {
            this.createFragment(
                startX + x,
                startY + y,
                velocity,
                material
            );
        }
    }
};

Game.DestructibleSystem.prototype.createFragment = function (
    x,
    y,
    velocity,
    material
) {
    var destructibles = this;
    var generation = this.generation;
    var fragment = this.ensureFragmentPool().acquire(
        x,
        y,
        material
    );
    var leaseId;

    if (!fragment) {
        return null;
    }

    leaseId = fragment.__fragmentLeaseId;

    looperPost(function () {
        if (
            !destructibles.isCurrent(generation) ||
            fragment.__fragmentLeaseId !== leaseId ||
            !fragment.__ph_body
        ) {
            return;
        }

        ph_Body.setVelocity(fragment.__ph_body, new Vector2(
            velocity.x + randomFloat(-10, 10),
            velocity.y + randomFloat(-8, 3)
        ));

        destructibles.schedule(function () {
            if (
                fragment.__fragmentLeaseId !== leaseId ||
                !fragment.__ph_body ||
                fragment.__destructed
            ) {
                return;
            }

            destructibles.registerFragment(
                fragment,
                destructibles.config.fragmentHp
            );

            destructibles.schedule(function () {
                if (fragment.__fragmentLeaseId === leaseId) {
                    destructibles.remove(fragment);
                }
            }, randomFloat(
                destructibles.config.fragmentLifetime[0],
                destructibles.config.fragmentLifetime[1]
            ));
        }, 0.75);
    });

    return fragment;
};

Game.DestructibleSystem.prototype.ensureFragmentPool = function () {
    var destructibles = this;
    var config = this.config;

    if (this.fragmentPool) {
        return this.fragmentPool;
    }

    this.fragmentPool = new Game.ObjectPool(
        function () {
            return destructibles.session.levelNode.__addChildBox({
                __img: destructibles.getMaterialConfig(
                    config.defaultMaterial
                ).fragmentImages[0],
                __size: config.fragmentSize,
                __ofs: [0, 0, -20],
                __visible: 0
            }).update();
        },
        function (node, x, y, material) {
            destructibles.activateFragment(
                node,
                x,
                y,
                material
            );
        },
        function (node) {
            destructibles.deactivateFragment(node);
        },
        function (node) {
            if (!node.__destructed) {
                node.__removeFromParent();
            }
        },
        config.fragmentLimit
    );
    this.fragmentPool.prewarm(config.fragmentPrewarm);
    return this.fragmentPool;
};

Game.DestructibleSystem.prototype.activateFragment = function (
    node,
    x,
    y,
    material
) {
    var materialConfig = this.getMaterialConfig(material) ||
        this.getMaterialConfig(this.config.defaultMaterial);

    node.__killAllAnimations();
    node.__img = materialConfig.fragmentImages[
        randomInt(0, materialConfig.fragmentImages.length - 1)
    ];
    node.__x = x;
    node.__y = y;
    node.__width = this.config.fragmentSize[0];
    node.__height = this.config.fragmentSize[1];
    node.__rotate = randomInt(0, 360);
    node.__scaleF = randomFloat(0.75, 1);
    node.__alpha = 1;
    node.__visible = 1;
    node.__destructibleType = 'fragment';
    node.__isPooledFragment = true;
    node.__fragmentLeaseId = this.nextFragmentLeaseId++;
    node.__physics = {
        __isStatic: false,
        __friction: 10,
        __frictionAir: 1,
        __frictionStatic: 50,
        __restitution: 0,
        __density: 1,
        __bodyType: 1
    };
    node.update(1);
    this.session.fragments.push(node);
};

Game.DestructibleSystem.prototype.deactivateFragment = function (node) {
    if (node.__ph_body) {
        this.collisionSystem.unregister(node.__ph_body);
    }

    removeFromArray(node, this.session.fragments);
    node.__killAllAnimations();
    node.__physics = 0;
    node.__visible = 0;
    node.__alpha = 1;
    node.__scaleF = 1;
    node.__destructibleType = null;
    node.__isPooledFragment = false;
    node.__fragmentLeaseId = null;
};

Game.DestructibleSystem.prototype.scheduleAwakeDestructibles = function () {
    var destructibles = this;
    var generation = this.generation;

    if (this.awakeScheduled) {
        return;
    }

    this.awakeScheduled = true;
    looperPost(function () {
        if (!destructibles.isCurrent(generation)) {
            return;
        }

        destructibles.awakeScheduled = false;
        $each(destructibles.session.structures, function (structure) {
            var body = structure.__ph_body;

            if (body && !body.isStatic) {
                body.sleepThreshold =
                    destructibles.config.sleepThreshold;
                ph_Sleeping.set(body, false);
            }
        });
    });
};

Game.DestructibleSystem.prototype.playBreakSound = function () {
    try {
        playSound('break_' + randomInt(1, 4), 0, 0, 0.5);
    } catch (error) {
        consoleLog('Unable to play structure break sound');
    }
};

Game.DestructibleSystem.prototype.isCurrent = function (generation) {
    return this.active && this.generation === generation;
};

Game.DestructibleSystem.prototype.schedule = function (callback, delay) {
    var destructibles = this;
    var generation = this.generation;
    return this.timerGroup.schedule(function () {
        if (destructibles.isCurrent(generation)) {
            callback();
        }
    }, delay);
};

Game.DestructibleSystem.prototype.dispose = function () {
    var collisionSystem = this.collisionSystem;

    this.active = false;
    this.generation++;

    this.timerGroup.clear();

    $each(this.session.structures, function (structure) {
        if (structure.__ph_body) {
            collisionSystem.unregister(structure.__ph_body);
            structure.__ph_body.__isStructure = false;
            structure.__ph_body.__structureNode = null;
        }
    });

    $each(this.session.fragments, function (fragment) {
        if (fragment.__ph_body) {
            collisionSystem.unregister(fragment.__ph_body);
        }
    });

    if (this.fragmentPool) {
        this.fragmentPool.dispose();
        this.fragmentPool = null;
    }

    this.session.structures = [];
    this.session.fragments = [];
    this.awakeScheduled = false;
};
