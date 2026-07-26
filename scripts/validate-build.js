'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const projectPath = path.join(root, 'project.json');
const optsPath = path.join(root, 'build_res', 'opts.json');
const buildPath = path.join(root, 'builds', '1.0.0', 'index.html');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeTextureName(name) {
    return path.basename(name).replace(/\.[^.]+$/, '');
}

function atlasJsonPaths(resources) {
    const result = [];

    for (const resource of resources) {
        if (resource[0] !== 'atlas') {
            continue;
        }

        for (let i = 1; i < resource.length; i++) {
            if (/\.json\??$/.test(resource[i])) {
                result.push(resource[i].replace(/\?$/, ''));
            }
        }
    }

    return result.sort();
}

function collectLayoutTextures(value, textures) {
    if (!value || typeof value !== 'object') {
        return;
    }

    if (typeof value.__img === 'string') {
        textures.add(normalizeTextureName(value.__img));
    }

    for (const key of Object.keys(value)) {
        collectLayoutTextures(value[key], textures);
    }
}

function walkFiles(directory, extensions, output) {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const name of fs.readdirSync(directory)) {
        const filePath = path.join(directory, name);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkFiles(filePath, extensions, output);
        } else if (extensions.has(path.extname(name))) {
            output.push(filePath);
        }
    }
}

function fail(errors, message) {
    errors.push(message);
}

const project = readJson(projectPath);
const opts = readJson(optsPath);
const errors = [];
const projectAtlases = atlasJsonPaths(project.res);
const builtAtlases = atlasJsonPaths(opts.res);

if (JSON.stringify(projectAtlases) !== JSON.stringify(builtAtlases)) {
    fail(
        errors,
        'opts.json atlas list does not match project.json: ' +
            builtAtlases.join(', ') + ' vs ' + projectAtlases.join(', ')
    );
}

const packedTextures = new Set();

for (const relativePath of projectAtlases) {
    const atlasPath = path.join(root, relativePath);

    if (!fs.existsSync(atlasPath)) {
        fail(errors, 'Missing atlas metadata: ' + relativePath);
        continue;
    }

    const frames = readJson(atlasPath);

    for (const frame of frames) {
        packedTextures.add(normalizeTextureName(frame[0]));
    }
}

const referencedTextures = new Set();
const layoutFiles = [];
const sourceFiles = [];
const imageFiles = [];
const fontFiles = [];
const soundFiles = [];

walkFiles(
    path.join(root, 'layouts'),
    new Set(['.json']),
    layoutFiles
);
walkFiles(
    path.join(root, 'src'),
    new Set(['.js']),
    sourceFiles
);
walkFiles(
    path.join(root, 'img'),
    new Set(['.png']),
    imageFiles
);
walkFiles(
    path.join(root, 'fonts'),
    new Set(['.ttf', '.otf', '.woff', '.woff2']),
    fontFiles
);
walkFiles(
    path.join(root, 'sounds'),
    new Set(['.mp3', '.wav', '.ogg']),
    soundFiles
);

for (const layoutFile of layoutFiles) {
    collectLayoutTextures(readJson(layoutFile), referencedTextures);
}

const imagePattern = /__img\s*:\s*['"]([^'"]+)['"]/g;

for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(sourceFile, 'utf8');
    let match;

    while ((match = imagePattern.exec(source))) {
        referencedTextures.add(normalizeTextureName(match[1]));
    }
}

for (const texture of Array.from(referencedTextures).sort()) {
    if (!packedTextures.has(texture)) {
        fail(errors, 'Texture is referenced but not packed: ' + texture);
    }
}

if (!fs.existsSync(buildPath)) {
    fail(errors, 'Missing production build: builds/1.0.0/index.html');
} else {
    const inputs = [projectPath].concat(
        layoutFiles,
        sourceFiles,
        imageFiles,
        fontFiles,
        soundFiles,
        projectAtlases.map(relativePath => path.join(root, relativePath))
    );
    const latestInputTime = Math.max.apply(
        null,
        inputs.map(filePath => fs.statSync(filePath).mtimeMs)
    );
    const buildTime = fs.statSync(buildPath).mtimeMs;

    if (buildTime < latestInputTime) {
        fail(errors, 'Production build is older than its source files');
    }
}

if (errors.length) {
    console.error('Build validation failed:');
    for (const error of errors) {
        console.error('- ' + error);
    }
    process.exit(1);
}

console.log(
    'Build validation passed: ' +
        projectAtlases.length + ' atlas(es), ' +
        packedTextures.size + ' textures, ' +
        fs.statSync(buildPath).size + ' byte production HTML'
);
