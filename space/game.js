import { Debug } from './debug.js';
import { Vec3 } from './utils.js';
import { Renderer } from './renderer.js';
import { Player, OtherPlayer, initializeControls, createRollingBuffer } from './player.js';
import { STARFIELD_SIZE, initStar, updateLoadedStars, transformAndFilterCelestialBodies, loadStarmap, generateStarmap, saveStarmapToFile } from './celestial.js';
import { NetworkManager } from './network.js';

const debug = new Debug();
debug.enable();

const player = new Player();
const rollingBuffer = createRollingBuffer();
const stars = [];
let loadedStars = [];
const otherPlayers = new Map();

const canvas = document.getElementById('gameCanvas');
const renderer = new Renderer(canvas);

const networkManager = new NetworkManager(
    'wss://145.14.158.182:8080',
    player,
    (id, position, orientation) => {
        const newPlayer = new OtherPlayer(id, position, orientation);
        otherPlayers.set(id, newPlayer);
    },
    (id, position, orientation) => {
        const player = otherPlayers.get(id);
        if (player) {
            player.update(position, orientation);
        }
    },
    (id) => {
        otherPlayers.delete(id);
    }
);

async function initGame() {
    let starmap = await loadStarmap();
    if (!starmap) {
        console.log('No starmap found. Generating new starmap...');
        starmap = generateStarmap();
        saveStarmapToFile(starmap);
        console.log('New starmap generated and saved. Please upload the starmap.json file to your server.');
    }

    starmap.forEach(starData => {
        stars.push(initStar(starData));
    });

    console.log(`Initialized ${stars.length} stars from starmap.`);
}

function gameLoop(timestamp) {
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    player.update(keys, rollingBuffer);
    wrapPlayerPosition();
    loadedStars = updateLoadedStars(stars, player.position);
    debug.logPlayerInfo(player);
}

function wrapPlayerPosition() {
    const halfSize = STARFIELD_SIZE / 2;
    if (Math.abs(player.position.x) > halfSize) player.position.x -= Math.sign(player.position.x) * STARFIELD_SIZE;
    if (Math.abs(player.position.y) > halfSize) player.position.y -= Math.sign(player.position.y) * STARFIELD_SIZE;
    if (Math.abs(player.position.z) > halfSize) player.position.z -= Math.sign(player.position.z) * STARFIELD_SIZE;
}

function renderGame() {
    renderer.clearCanvas();
    const transformedBodies = transformAndFilterCelestialBodies(stars, loadedStars, player.position, player.orientation);
    renderer.renderBodies(transformedBodies, frameCounter);

    // Sort other players by distance from the player
    const sortedOtherPlayers = Array.from(otherPlayers.values()).sort((a, b) => {
        const distA = a.position.sub(player.position).lengthSquared();
        const distB = b.position.sub(player.position).lengthSquared();
        return distB - distA; // Sort in descending order
    });

    // Render other players
    sortedOtherPlayers.forEach(otherPlayer => {
        const transformedVertices = otherPlayer.getTransformedVertices();
        const relativeVertices = transformedVertices.map(v => {
            const relativePos = v.sub(player.position);
            // Apply player's orientation to get the correct relative position
            return player.orientation.inverse().rotate(relativePos);
        });
        renderer.renderOtherPlayer(relativeVertices, otherPlayer.getFaces(), otherPlayer.color);
    });

    frameCounter++;
}

const keys = initializeControls();
let frameCounter = 0;

// Initialize the game and start the game loop
initGame().then(() => {
    console.log('Game initialized. Starting game loop...');
    requestAnimationFrame(gameLoop);
}).catch(error => {
    console.error('Error initializing game:', error);
});
