'use strict';

var fs = require('fs');
var path = require('path');
var sharp;

try {
    sharp = require('sharp');
} catch (error) {
    console.error(
        'Atlas build requires the "sharp" package. ' +
        'Install it for the active Node.js runtime and retry.'
    );
    process.exit(1);
}

var projectDir = path.resolve(__dirname, '..');
var sourceDir = path.join(projectDir, 'img');
var outputDir = path.join(projectDir, 'build_res');
var atlasSize = 2048;
var padding = 2;
var frameNameOverrides = {
    'Enemy.png': 'enemy'
};

function listPngFiles(directory) {
    return fs.readdirSync(directory)
        .filter(function (filename) {
            return /\.png$/i.test(filename);
        })
        .sort();
}

function frameName(filename) {
    return (
        frameNameOverrides[filename] ||
        path.basename(filename, path.extname(filename))
    );
}

async function readFrames() {
    var names = {};
    var frames = [];
    var files = listPngFiles(sourceDir);

    for (var i = 0; i < files.length; i++) {
        var filename = files[i];
        var name = frameName(filename);
        var metadata;

        if (names[name]) {
            throw new Error('Duplicate atlas frame name: ' + name);
        }

        names[name] = true;
        metadata = await sharp(path.join(sourceDir, filename)).metadata();

        if (!metadata.width || !metadata.height) {
            throw new Error('Unable to read image dimensions: ' + filename);
        }
        if (
            metadata.width + padding * 2 > atlasSize ||
            metadata.height + padding * 2 > atlasSize
        ) {
            throw new Error('Image exceeds atlas size: ' + filename);
        }

        frames.push({
            filename: filename,
            name: name,
            width: metadata.width,
            height: metadata.height
        });
    }

    return frames.sort(function (a, b) {
        return (
            b.height - a.height ||
            b.width - a.width ||
            a.name.localeCompare(b.name)
        );
    });
}

function addToAtlas(atlas, frame) {
    var i;
    var shelf;
    var nextY;

    for (i = 0; i < atlas.shelves.length; i++) {
        shelf = atlas.shelves[i];

        if (
            frame.height + padding <= shelf.height &&
            shelf.x + frame.width + padding <= atlasSize
        ) {
            frame.x = shelf.x;
            frame.y = shelf.y;
            shelf.x += frame.width + padding;
            atlas.frames.push(frame);
            return true;
        }
    }

    nextY = padding;
    for (i = 0; i < atlas.shelves.length; i++) {
        nextY = Math.max(
            nextY,
            atlas.shelves[i].y + atlas.shelves[i].height
        );
    }

    if (nextY + frame.height + padding > atlasSize) {
        return false;
    }

    frame.x = padding;
    frame.y = nextY;
    atlas.shelves.push({
        x: padding + frame.width + padding,
        y: nextY,
        height: frame.height + padding
    });
    atlas.frames.push(frame);
    return true;
}

function packFrames(frames) {
    var atlases = [];

    frames.forEach(function (frame) {
        var placed = false;
        var i;

        for (i = 0; i < atlases.length; i++) {
            if (addToAtlas(atlases[i], frame)) {
                placed = true;
                break;
            }
        }

        if (!placed) {
            atlases.push({
                shelves: [],
                frames: []
            });
            addToAtlas(atlases[atlases.length - 1], frame);
        }
    });

    return atlases;
}

function removeStaleAtlases() {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.readdirSync(outputDir).forEach(function (filename) {
        if (/^atlas-\d+\.(png|json)$/i.test(filename)) {
            fs.unlinkSync(path.join(outputDir, filename));
        }
    });
}

async function writeAtlas(atlas, index) {
    var pngPath = path.join(outputDir, 'atlas-' + index + '.png');
    var jsonPath = path.join(outputDir, 'atlas-' + index + '.json');
    var composites = atlas.frames.map(function (frame) {
        return {
            input: path.join(sourceDir, frame.filename),
            left: frame.x,
            top: frame.y
        };
    });
    var data = atlas.frames.map(function (frame) {
        return [
            frame.name,
            frame.x,
            frame.y,
            frame.width,
            frame.height
        ];
    });

    await sharp({
        create: {
            width: atlasSize,
            height: atlasSize,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite(composites)
        .png({
            compressionLevel: 9,
            palette: true,
            quality: 90,
            effort: 10
        })
        .toFile(pngPath);

    fs.writeFileSync(jsonPath, JSON.stringify(data), 'utf8');
}

async function main() {
    var frames = await readFrames();
    var atlases = packFrames(frames);

    removeStaleAtlases();

    for (var i = 0; i < atlases.length; i++) {
        await writeAtlas(atlases[i], i);
    }

    console.log(
        'Packed ' + frames.length + ' images into ' +
        atlases.length + ' atlas file(s).'
    );
}

main().catch(function (error) {
    console.error(error.stack || error);
    process.exit(1);
});
