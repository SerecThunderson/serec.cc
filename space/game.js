const NUM_STARS = 4000;
const STARFIELD_RADIUS = 100 * 100 * 100 * 5;
const MAX_LOADED_PLANETS = 500;
const PLANET_LOAD_DISTANCE = STARFIELD_RADIUS * 0.5;

const lerp = (a, b, t) => a + (b - a) * t;

class Vec3 {
    constructor(x, y, z) {
        this.x = x; this.y = y; this.z = z;
    }
    add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    lengthSquared() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    normalize() { const len = this.length(); return len > 0 ? this.mul(1 / len) : new Vec3(0, 0, 0); }
}

class Quat {
    constructor(w, x, y, z) {
        this.w = w; this.x = x; this.y = y; this.z = z;
    }
    static fromEuler(pitch, yaw, roll) {
        const cy = Math.cos(yaw * 0.5), sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5), sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5), sr = Math.sin(roll * 0.5);
        return new Quat(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy
        );
    }
    mul(q) {
        return new Quat(
            this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
            this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
            this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
            this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
        );
    }
    normalize() {
        const len = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
        return len > 0 ? new Quat(this.w / len, this.x / len, this.y / len, this.z / len) : new Quat(1, 0, 0, 0);
    }
    inverse() {
        const len = this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
        return new Quat(this.w / len, -this.x / len, -this.y / len, -this.z / len);
    }
    rotate(v) {
        const qv = new Quat(0, v.x, v.y, v.z);
        const qr = this.mul(qv).mul(this.inverse());
        return new Vec3(qr.x, qr.y, qr.z);
    }
}

class Player {
    constructor() {
        this.position = new Vec3(0, 0, 0);
        this.currentSpeed = 1;
        this.maxSpeed = 2777;
        this.orientation = Quat.fromEuler(0, 0, 0);
        this.yawSpeed = 0;
        this.pitchSpeed = 0;
        this.strafeSpeed = 0;
        this.upDownSpeed = 0;
    }
    update(keys, rollingBuffer) {
        this.updateRotation(keys, rollingBuffer);
        this.updateMovement(keys);
    }
    updateRotation(keys, rollingBuffer) {
        const maxRotSpeed = 0.022;
        const smoothFactor = 0.033;
        const yawInput = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        const pitchInput = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
        this.yawSpeed = lerp(this.yawSpeed, maxRotSpeed * yawInput, smoothFactor);
        this.pitchSpeed = lerp(this.pitchSpeed, maxRotSpeed * pitchInput, smoothFactor);
        if (this.yawSpeed !== 0) {
            this.orientation = this.orientation.mul(Quat.fromEuler(this.yawSpeed, 0, 0)).normalize();
        }
        if (this.pitchSpeed !== 0) {
            this.orientation = this.orientation.mul(Quat.fromEuler(0, 0, this.pitchSpeed)).normalize();
        }
        this.updateRoll(keys, rollingBuffer);
    }
    updateRoll(keys, rollingBuffer) {
        if (keys.q && !keys.e) {
            rollingBuffer.btn14Frames++;
            rollingBuffer.btn15Frames = 0;
            if (rollingBuffer.btn14Frames >= rollingBuffer.threshold) {
                rollingBuffer.currentRollSpeed = lerp(rollingBuffer.currentRollSpeed, rollingBuffer.maxRollSpeed, 0.05);
            }
        } else if (keys.e && !keys.q) {
            rollingBuffer.btn15Frames++;
            rollingBuffer.btn14Frames = 0;
            if (rollingBuffer.btn15Frames >= rollingBuffer.threshold) {
                rollingBuffer.currentRollSpeed = lerp(rollingBuffer.currentRollSpeed, -rollingBuffer.maxRollSpeed, 0.05);
            }
        } else {
            rollingBuffer.btn14Frames = 0;
            rollingBuffer.btn15Frames = 0;
            rollingBuffer.currentRollSpeed *= rollingBuffer.decelerationFactor;
        }
        if (Math.abs(rollingBuffer.currentRollSpeed) > 0.001) {
            this.orientation = this.orientation.mul(Quat.fromEuler(0, rollingBuffer.currentRollSpeed, 0)).normalize();
        }
    }
    updateMovement(keys) {
        const smoothFactor = 0.03;
        const forwardInput = (keys.arrowup ? 1 : 0) - (keys.arrowdown ? 1 : 0);
        const strafeInput = (keys.arrowright ? 1 : 0) - (keys.arrowleft ? 1 : 0);
        const isPanningMode = keys.shift;
        let targetForwardSpeed, targetStrafeSpeed, targetUpDownSpeed;
        if (isPanningMode) {
            targetForwardSpeed = 0;
            targetUpDownSpeed = this.maxSpeed * forwardInput;
        } else {
            targetForwardSpeed = this.maxSpeed * forwardInput;
            targetUpDownSpeed = 0;
        }
        targetStrafeSpeed = this.maxSpeed * strafeInput;
        this.currentSpeed = lerp(this.currentSpeed, targetForwardSpeed, smoothFactor);
        this.strafeSpeed = lerp(this.strafeSpeed, targetStrafeSpeed, smoothFactor);
        this.upDownSpeed = lerp(this.upDownSpeed, targetUpDownSpeed, smoothFactor);
        const forward = this.orientation.rotate(new Vec3(0, 0, 1));
        const right = this.orientation.rotate(new Vec3(1, 0, 0));
        const up = this.orientation.rotate(new Vec3(0, -1, 0));
        this.position = this.position.add(forward.mul(this.currentSpeed))
                                     .add(right.mul(this.strafeSpeed))
                                     .add(up.mul(this.upDownSpeed));
    }
}

class CelestialBody {
    constructor(position, size, color) {
        this.position = position;
        this.size = size;
        this.color = color;
    }
}

class Star extends CelestialBody {
    constructor(position, size, color) {
        super(position, size, color);
        this.planets = [];
    }
}

class Planet extends CelestialBody {
    constructor(position, size, color, distanceFromStar, orbitSpeed, orbitAngle) {
        super(position, size, color);
        this.distanceFromStar = distanceFromStar;
        this.orbitSpeed = orbitSpeed;
        this.orbitAngle = orbitAngle;
        this.moons = [];
    }
    update(starPosition) {
        this.orbitAngle += this.orbitSpeed;
        const x = starPosition.x + this.distanceFromStar * Math.cos(this.orbitAngle);
        const y = starPosition.y + this.distanceFromStar * Math.sin(this.orbitAngle);
        const z = starPosition.z;
        this.position = new Vec3(x, y, z);
        this.moons.forEach(moon => moon.update(this.position));
    }
}

class Moon extends CelestialBody {
    constructor(position, size, color, distanceFromPlanet, orbitSpeed, orbitAngle) {
        super(position, size, color);
        this.distanceFromPlanet = distanceFromPlanet;
        this.orbitSpeed = orbitSpeed;
        this.orbitAngle = orbitAngle;
    }
    update(planetPosition) {
        this.orbitAngle += this.orbitSpeed;
        const x = planetPosition.x + this.distanceFromPlanet * Math.cos(this.orbitAngle);
        const y = planetPosition.y + this.distanceFromPlanet * Math.sin(this.orbitAngle);
        const z = planetPosition.z;
        this.position = new Vec3(x, y, z);
    }
}

const starColorPalette = ['#FFFFFF', '#FFFAFA', '#F8F8FF', '#F0FFFF', '#E6E6FA', '#FFF5EE', '#FFFAF0', '#F0FFF0', '#E0FFFF', '#F0F8FF', '#F5F5F5', '#FFF0F5', '#FFFFF0', '#F0E68C', '#FFD700', '#87CEFA', '#ADD8E6', '#B0E0E6', '#AFEEEE'];
const planetColorPalette = ['#FF6347', '#FFA07A', '#FF8C00', '#FFD700', '#9ACD32', '#32CD32', '#00FA9A', '#48D1CC', '#1E90FF', '#4169E1', '#8A2BE2', '#9932CC', '#FF69B4', '#DDA0DD', '#D2691E', '#CD853F', '#A0522D', '#808080', '#708090', '#2F4F4F'];

const player = new Player();
const rollingBuffer = { btn14Frames: 0, btn15Frames: 0, threshold: 3, decelerationFactor: 0.95, currentRollSpeed: 0, maxRollSpeed: 0.022 };
const stars = [];
let loadedStars = [];
let nearestStarDistance = Infinity;
let nearestStarIndex = null;
let updateCounter = 0;
const updateFrequency = 30;

function initGame() {
    for (let i = 0; i < NUM_STARS; i++) {
        initStar();
    }
}

function initStar() {
    const phi = Math.random() * 2 * Math.PI;
    const cosTheta = Math.random() * 2 - 1;
    const theta = Math.acos(cosTheta);
    const r = STARFIELD_RADIUS * Math.pow(Math.random(), 1/3);
    const position = new Vec3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
    );
    const size = Math.random() * 4000 + 2000;
    const color = Math.floor(Math.random() * starColorPalette.length);
    const star = new Star(position, size, color);
    const numPlanets = Math.floor(Math.random() * 23) - 3;
    for (let j = 0; j < numPlanets; j++) {
        initPlanet(star);
    }
    stars.push(star);
}

function initPlanet(star) {
    const minDistanceFromStar = star.size * 1.3;
    const maxAdditionalDistance = star.size * 6;
    const distanceFromStar = minDistanceFromStar + Math.random() * maxAdditionalDistance;
    const maxOrbitSpeed = 0.01;
    const minOrbitSpeed = 0.00001;
    const orbitSpeed = maxOrbitSpeed - ((distanceFromStar - minDistanceFromStar) / maxAdditionalDistance) * (maxOrbitSpeed - minOrbitSpeed);
    const orbitAngle = Math.random() * 2 * Math.PI;
    const planetSize = star.size * 0.05 + Math.random() * star.size * 0.15;
    const planet = new Planet(
        new Vec3(0, 0, 0),
        planetSize,
        Math.floor(Math.random() * planetColorPalette.length),
        distanceFromStar,
        orbitSpeed,
        orbitAngle
    );
    const numMoons = Math.floor(Math.random() * 5);
    for (let j = 0; j < numMoons; j++) {
        initMoon(planet);
    }
    star.planets.push(planet);
}

function initMoon(planet) {
    const minDistanceFromPlanet = planet.size * 1.5;
    const maxAdditionalDistance = planet.size * 5;
    const distanceFromPlanet = minDistanceFromPlanet + Math.random() * maxAdditionalDistance;
    const maxOrbitSpeed = 0.03;
    const minOrbitSpeed = 0.003;
    const orbitSpeed = maxOrbitSpeed - ((distanceFromPlanet - minDistanceFromPlanet) / maxAdditionalDistance) * (maxOrbitSpeed - minOrbitSpeed);
    const orbitAngle = Math.random() * 2 * Math.PI;
    const moonSize = planet.size * 0.1 + Math.random() * planet.size * 0.2;

    const moon = new Moon(
        new Vec3(0, 0, 0),
        moonSize,
        Math.floor(Math.random() * planetColorPalette.length),
        distanceFromPlanet,
        orbitSpeed,
        orbitAngle
    );

    planet.moons.push(moon);
}

function gameLoop(timestamp) {
    updateGame();
    renderGame();
    calculateFrameTime(timestamp);
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    player.update(keys, rollingBuffer);
    updateCelestialBodies();
}

function updateCelestialBodies() {
    manageStars();
    updateLoadedStars();
    updateNearestStar();
}

function manageStars() {
    const forward = player.orientation.rotate(new Vec3(0, 0, 1));
    stars.forEach(star => {
        const offset = star.position.sub(player.position);
        if (offset.dot(forward) < -STARFIELD_RADIUS) {
            manageStar(star);
        }
    });
}

function manageStar(star) {
    const r = STARFIELD_RADIUS;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI - Math.PI / 2;
    const position = new Vec3(
        r * Math.cos(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(phi)
    );
    star.position = player.position.add(player.orientation.rotate(position));
    star.planets = [];
    const numPlanets = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < numPlanets; j++) {
        initPlanet(star);
    }
}

function updateLoadedStars() {
    const playerPos = player.position;
    const starsInRange = stars.filter(star => 
        star.position.sub(playerPos).length() <= PLANET_LOAD_DISTANCE
    );
    const sortedStars = [...stars].sort((a, b) => 
        a.position.sub(playerPos).lengthSquared() - b.position.sub(playerPos).lengthSquared()
    );
    const nearestStars = sortedStars.slice(0, MAX_LOADED_PLANETS);
    loadedStars = starsInRange.length < nearestStars.length ? starsInRange : nearestStars;
    loadedStars.forEach(star => {
        if (!star.planets || star.planets.length === 0) {
            const numPlanets = Math.floor(Math.random() * 23) - 3;
            star.planets = [];
            for (let i = 0; i < numPlanets; i++) {
                initPlanet(star);
            }
        }
        star.planets.forEach(planet => planet.update(star.position));
    });
    stars.forEach(star => {
        if (!loadedStars.includes(star)) {
            star.planets = [];
        }
    });
}

function updateNearestStar() {
    updateCounter++;
    if (updateCounter >= updateFrequency) {
        updateCounter = 0;
        let nearestDistanceSquared = Infinity;
        stars.forEach((star, i) => {
            const distanceSquared = star.position.sub(player.position).lengthSquared();
            if (distanceSquared < nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
                nearestStarIndex = i;
            }
        });
        nearestStarDistance = Math.sqrt(nearestDistanceSquared);
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function renderGame() {
    clearCanvas();
    const transformedBodies = transformAndFilterCelestialBodies();
    renderCelestialBodies(transformedBodies);
    renderDebugInfo();
}

function clearCanvas() {
    ctx.fillStyle = '#261e56';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function transformAndFilterCelestialBodies() {
    const transformedBodies = [];
    const invOrientation = player.orientation.inverse();
    const forward = player.orientation.rotate(new Vec3(0, 0, 1));
    
    function transformBody(body, isStar = false) {
        const offset = body.position.sub(player.position);
        if (offset.dot(forward) > -STARFIELD_RADIUS) {
            const transformed = invOrientation.rotate(offset);
            if (transformed.z > 0.3) {
                transformedBodies.push({
                    x: transformed.x,
                    y: transformed.y,
                    z: transformed.z,
                    size: body.size,
                    color: body.color,
                    isStar: isStar,
                    original: body
                });
            }
        }
    }
    
    stars.forEach(star => transformBody(star, true));
    loadedStars.forEach(star => {
        star.planets.forEach(planet => {
            transformBody(planet);
            planet.moons.forEach(moon => transformBody(moon));
        });
    });
    
    return transformedBodies.sort((a, b) => b.z - a.z);
}

function renderCelestialBodies(transformedBodies) {
    const fov = Math.PI / 3;
    const aspectRatio = canvas.width / canvas.height;
    const nearPlane = 0.1;
    const farPlane = STARFIELD_RADIUS * 3;

    function projectPoint(x, y, z) {
        const tanHalfFOV = Math.tan(fov / 2);
        const screenX = (x / (z * tanHalfFOV * aspectRatio) + 1) * canvas.width / 2;
        const screenY = (-y / (z * tanHalfFOV) + 1) * canvas.height / 2;
        const size = 1 / (z * tanHalfFOV) * canvas.height / 2;
        return { x: screenX, y: screenY, size: size };
    }

    transformedBodies.forEach(body => {
        if (body.z <= nearPlane || body.z >= farPlane) return;

        const projected = projectPoint(body.x, body.y, body.z);
        const screenX = projected.x;
        const screenY = projected.y;
        const pixelSize = body.size * projected.size;

        const color = body.isStar ? starColorPalette[body.color] : planetColorPalette[body.color];

        // Apply distance-based effects
        const distanceFactor = 1 - (body.z / farPlane);
        const alpha = Math.max(0.1, distanceFactor);
        const scaledSize = pixelSize * (body.isStar ? 1 : Math.max(0.5, distanceFactor));

        if (scaledSize < 1) {
            if (body.isStar) {
                const drawProbability = scaledSize * 200;
                const offsetFrame = (frameCounter + body.color * 10) % 100;
                if (offsetFrame < drawProbability) {
                    drawPixel(screenX, screenY, color, alpha);
                }
            } else {
                const drawProbability = scaledSize * 1000;
                const offsetFrame = (frameCounter + body.color * 10) % 100;
                if (offsetFrame < drawProbability && scaledSize >0.2) {
                    drawPixel(screenX, screenY, color, alpha);
                }
            }
        } else {
            drawCircle(screenX, screenY, scaledSize, color, alpha);
        }

        if (body.original === currentTarget) {
            drawTargetIndicator(screenX, screenY, scaledSize);
        }
    });
}

function drawPixel(x, y, color, alpha) {
    ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(x, y, 1, 1);
}

function drawCircle(x, y, radius, color, alpha) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
}

function drawTargetIndicator(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

let frameCounter = 0;
let lastFrameTime = performance.now();
let frameTime = 0;
let currentTarget = null;

// New variables for FPS calculation
const FPS_UPDATE_INTERVAL = 500; // Update FPS every 500ms
let lastFpsUpdateTime = performance.now();
let framesSinceLastUpdate = 0;
let currentFps = 0;

function calculateFrameTime(timestamp) {
    frameTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    frameCounter++;
    
    // FPS calculation
    framesSinceLastUpdate++;
    if (timestamp - lastFpsUpdateTime > FPS_UPDATE_INTERVAL) {
        currentFps = Math.round((framesSinceLastUpdate * 1000) / (timestamp - lastFpsUpdateTime));
        framesSinceLastUpdate = 0;
        lastFpsUpdateTime = timestamp;
    }
}

function renderDebugInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Speed: ${player.currentSpeed.toFixed(3)}`, 10, 20);
    ctx.fillText(`Nearest star: ${nearestStarDistance.toFixed(3)}`, 10, 40);
    ctx.fillText(`FPS: ${currentFps}`, 10, 60);
}

initGame();
requestAnimationFrame(gameLoop);