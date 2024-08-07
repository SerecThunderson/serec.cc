import { Debug } from './debug.js';
import { Vec3 } from './utils.js';
import { Renderer } from './renderer.js';
import { Player, initializeControls, createRollingBuffer } from './player.js';
import { STARFIELD_SIZE, initStar, updateLoadedStars, transformAndFilterCelestialBodies, loadStarmap, generateStarmap, saveStarmapToFile } from './celestial.js';

const debug = new Debug();
debug.enable();

const player = new Player();
const rollingBuffer = createRollingBuffer();
const stars = [];
let loadedStars = [];

const canvas = document.getElementById('gameCanvas');
const renderer = new Renderer(canvas);

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
