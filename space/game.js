import { Debug } from './debug.js';
import { Vec3, Quat } from './utils.js';
import { Renderer } from './renderer.js';
import { Player, OtherPlayer, initializeControls, createRollingBuffer } from './player.js';
import { STARFIELD_SIZE, initStar, updateLoadedStars, transformAndFilterCelestialBodies, loadStarmap, generateStarmap, saveStarmapToFile } from './celestial.js';
import { NetworkManager } from './network.js';
import { MobileControls } from './mobile.js';

const debug = new Debug();
debug.enable();

const player = new Player();
const rollingBuffer = createRollingBuffer();
const stars = [];
let loadedStars = [];
const otherPlayers = new Map();

// --- Chat & UI State ---
const chatBubbles = new Map();
const globalChatHistory = [];
const MAX_GLOBAL_MESSAGES = 7;
const CHAT_BUBBLE_DURATION = 8000;
let selectedPlayerId = null;

const canvas = document.getElementById('gameCanvas');
const renderer = new Renderer(canvas);
const chatInput = document.getElementById('chatInput');
const chatDisplay = document.getElementById('chatDisplay');
const playerListDisplay = document.getElementById('playerListDisplay');
const chatFocusButton = document.getElementById('chatFocusButton'); // Get chat focus button

const keys = initializeControls();
let mobileControls;

// --- Helper Function to Update Selected Player ---
function setSelectedPlayer(id) {
    if (id === player.id) id = null;
    if (selectedPlayerId === id) selectedPlayerId = null;
    else selectedPlayerId = id;
    if (selectedPlayerId) addGlobalChatMessage(null, `Target selected: ${selectedPlayerId.substring(0, 4)}`);
    else addGlobalChatMessage(null, `Target deselected.`);
    updatePlayerListDisplay();
}

// --- Network Manager Initialization ---
const networkManager = new NetworkManager( 'wss://ws.serec.cc:8443', player,
    // onNewPlayer
    (id, position, orientation) => {
        if (!otherPlayers.has(id) && id !== player.id) {
            const newPlayer = new OtherPlayer(id, position, orientation);
            otherPlayers.set(id, newPlayer);
            addGlobalChatMessage(null, `Player ${id.substring(0, 4)} joined.`);
            updatePlayerListDisplay();
        }
    },
    // onPlayerUpdate
    (id, position, orientation) => {
        if (id === player.id) return;
        const other = otherPlayers.get(id);
        if (other) { other.update(position, orientation); }
        else { // Create if unknown
            const newPlayer = new OtherPlayer(id, position, orientation);
            otherPlayers.set(id, newPlayer);
            addGlobalChatMessage(null, `Player ${id.substring(0, 4)} appeared.`);
            updatePlayerListDisplay();
        }
    },
    // onPlayerDisconnect
    (id) => {
        if (otherPlayers.has(id)) {
            const shortId = id.substring(0, 4);
            otherPlayers.delete(id);
            addGlobalChatMessage(null, `Player ${shortId} left.`);
            if (selectedPlayerId === id) setSelectedPlayer(null);
            updatePlayerListDisplay();
        }
    },
    // onChatMessage (FROM SERVER)
    (id, message) => { if (id !== player.id) handleChatMessageFromServer(id, message); }
);

// --- Chat Handling ---
function handleChatMessageFromServer(playerId, message) {
    chatBubbles.set(playerId, { message: message, time: Date.now() });
    addGlobalChatMessage(playerId, message);
}

function addGlobalChatMessage(playerId, message) {
    const messageData = { id: playerId, message: message, time: Date.now() };
    globalChatHistory.push(messageData);
    if (globalChatHistory.length > MAX_GLOBAL_MESSAGES) globalChatHistory.shift();
    updateChatDisplay();
}

// --- HTML UI Updates ---
function updateChatDisplay() {
    chatDisplay.innerHTML = '';
    globalChatHistory.forEach(msg => {
        const p = document.createElement('p');
        const shortId = msg.id ? msg.id.substring(0, 4) : 'System';
        const idSpan = document.createElement('span');
        if (msg.id && msg.id !== 'System') {
            idSpan.className = 'chat-id'; idSpan.textContent = `[${shortId}]:`;
            idSpan.title = `Click to select ${shortId}`;
            idSpan.onclick = (e) => {
                 e.stopPropagation();
                if (otherPlayers.has(msg.id) || msg.id === player.id) setSelectedPlayer(msg.id);
                else addGlobalChatMessage(null, `Player ${shortId} no longer available.`);
            };
        } else { idSpan.textContent = `[${shortId}]:`; }
        p.appendChild(idSpan);
        p.appendChild(document.createTextNode(` ${msg.message}`));
        chatDisplay.appendChild(p);
    });
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function updatePlayerListDisplay() {
     if (!playerListDisplay) return;
     playerListDisplay.innerHTML = '';
     const selfDiv = document.createElement('div');
     selfDiv.textContent = `You (${player.id ? player.id.substring(0, 4) : '...'})`;
     selfDiv.className = 'self';
     if (selectedPlayerId === null) { /* Highlight self if no target? */ }
     selfDiv.title = 'Click to deselect target';
     selfDiv.onclick = (e) => { e.stopPropagation(); setSelectedPlayer(null); };
     playerListDisplay.appendChild(selfDiv);
     otherPlayers.forEach(p => {
          const playerDiv = document.createElement('div');
          const shortId = p.id.substring(0, 4);
          playerDiv.textContent = `P: ${shortId}`;
          playerDiv.title = `Click to select ${shortId}`;
          if (p.id === selectedPlayerId) playerDiv.classList.add('selected');
          playerDiv.onclick = (e) => { e.stopPropagation(); setSelectedPlayer(p.id); };
          playerListDisplay.appendChild(playerDiv);
     });
}

// --- Chat Input Handling ---
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); const message = chatInput.value;
        if (message.trim() !== '') {
            networkManager.sendChatMessage(message);
            if (player.id) { // Local Echo
                 addGlobalChatMessage(player.id, message);
                 chatBubbles.set(player.id, { message: message, time: Date.now() });
            }
            chatInput.value = '';
        }
        chatInput.blur(); // Unfocus after sending
    }
    // Allow typing in chat without triggering game controls
     e.stopPropagation();
});

// Listener for the new Chat Focus Button
if (chatFocusButton) {
    chatFocusButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent potential game interactions
        chatInput.focus();
    });
}

// Global key listeners (removed 'Enter to focus' logic)
// window.addEventListener('keydown', (e) => { ... }); // Keep if other global keys needed


// Remove old chat bubbles
function updateChatBubbles() {
    const now = Date.now();
    for (const [id, bubble] of chatBubbles.entries()) {
        if (now - bubble.time > CHAT_BUBBLE_DURATION) chatBubbles.delete(id);
    }
}

// --- Game Initialization ---
async function initGame() {
    let starmap;
    try { starmap = await loadStarmap();
         if (!starmap) { starmap = generateStarmap(); console.warn('Generated new starmap.'); }
         else { console.log("Loaded starmap."); }
    } catch (error) { console.error("Error loading/generating starmap:", error); starmap = generateStarmap(100); }
    stars.length = 0;
    starmap.forEach(starData => { stars.push(initStar(starData)); });
    console.log(`Initialized ${stars.length} stars.`);
    addGlobalChatMessage(null, "Starmap initialized.");
    updatePlayerListDisplay();
}

let animationFrameId = null;
let isGameRunning = false;

function gameLoop(timestamp) {
    if (!isGameRunning) return;
    updateGame();
    renderGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateGame() {
    if (document.activeElement !== chatInput) {
        player.update(keys, rollingBuffer);
    } else { // Reset keys/decay speeds if chat is focused
         keys.arrowup = false; keys.arrowdown = false; keys.arrowleft = false; keys.arrowright = false;
         keys.a = false; keys.d = false; keys.w = false; keys.s = false; keys.q = false; keys.e = false;
         player.currentSpeed = lerp(player.currentSpeed, 0, 0.1);
         player.strafeSpeed = lerp(player.strafeSpeed, 0, 0.1);
         player.upDownSpeed = lerp(player.upDownSpeed, 0, 0.1);
         player.yawSpeed = lerp(player.yawSpeed, 0, 0.1);
         player.pitchSpeed = lerp(player.pitchSpeed, 0, 0.1);
         rollingBuffer.currentRollSpeed *= rollingBuffer.decelerationFactor;
          if (Math.abs(rollingBuffer.currentRollSpeed) > 0.001) {
               player.orientation = player.orientation.mul(Quat.fromEuler(0, rollingBuffer.currentRollSpeed, 0)).normalize();
           }
    }
    wrapPlayerPosition();
    loadedStars = updateLoadedStars(stars, player.position);
    updateChatBubbles();
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

    let navigatorTargetPos = null;
     if (selectedPlayerId) {
          const targetPlayer = otherPlayers.get(selectedPlayerId);
          if (targetPlayer) navigatorTargetPos = targetPlayer.position;
     }

    const sortedOtherPlayers = Array.from(otherPlayers.values()).sort((a, b) =>
        b.position.sub(player.position).lengthSquared() - a.position.sub(player.position).lengthSquared()
    );

    sortedOtherPlayers.forEach(otherPlayer => {
        const relativePosRaw = otherPlayer.position.sub(player.position);
        if (relativePosRaw.lengthSquared() > renderer.farPlane * renderer.farPlane * 1.1) return;
        const transformedVertices = otherPlayer.getTransformedVertices();
        const relativeVertices = transformedVertices.map(v => player.orientation.inverse().rotate(v.sub(player.position)));
        renderer.renderOtherPlayer(relativeVertices, otherPlayer.getFaces(), otherPlayer.color, otherPlayer.id, chatBubbles);
    });

    renderer.renderUI(
        selectedPlayerId, // Pass ID for potential future use in renderer UI
        navigatorTargetPos ? navigatorTargetPos.sub(player.position) : null,
        player.orientation,
        frameCounter
    );
    frameCounter++;
}

let frameCounter = 0;

// --- Start Game Logic & Mobile Controls Initialization ---
window.addEventListener('startgame', () => {
     if (isGameRunning) return;
     console.log('Start game event received.');
     isGameRunning = true;
     // Initialize Mobile Controls AFTER game start signal
     mobileControls = new MobileControls(keys); // Initializes if mobile
     console.log("Mobile controls initialized:", mobileControls);
     // Initialize game assets and state
     initGame().then(() => {
         console.log('Game initialized. Starting game loop...');
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
         animationFrameId = requestAnimationFrame(gameLoop);
     }).catch(error => {
         console.error('Error initializing game:', error);
         addGlobalChatMessage(null, "Error initializing game.");
         isGameRunning = false;
     });
});

addGlobalChatMessage(null, "Loading...");
updatePlayerListDisplay(); // Initial list display

const lerp = (a, b, t) => a + (b - a) * t;
