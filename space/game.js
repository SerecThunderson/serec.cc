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

let isLoading = true;
let loadingProgress = 0;

async function initGame() {
    updateLoadingBar(0);
    let starmap = await loadStarmap(updateLoadingBar);
    if (!starmap) {
        console.log('No starmap found. Generating new starmap...');
        starmap = await generateStarmap(updateLoadingBar);
        await saveStarmapToFile(starmap);
        console.log('New starmap generated and saved. Please upload the starmap.json file to your server.');
    }

    starmap.forEach(starData => {
        stars.push(initStar(starData));
    });

    console.log(`Initialized ${stars.length} stars from starmap.`);
    isLoading = false;
}

function updateLoadingBar(progress) {
    loadingProgress = progress;
    renderLoadingBar();
}

function renderLoadingBar() {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw the loading bar
    const barWidth = width * 0.8;
    const barHeight = height * 0.1;
    const barX = (width - barWidth) / 2;
    const barY = (height - barHeight) / 2;

    // Draw the outline
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Draw the fill
    ctx.fillStyle = 'white';
    ctx.fillRect(barX, barY, barWidth * loadingProgress, barHeight);

    // Draw the text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Loading: ${Math.round(loadingProgress * 100)}%`, width / 2, barY + barHeight + 30);
}

function gameLoop(timestamp) {
    if (isLoading) {
        renderLoadingBar();
    } else {
        updateGame();
        renderGame();
    }
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
