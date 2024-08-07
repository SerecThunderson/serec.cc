import { Vec3 } from './utils.js';
import { compressStar, decompressStar } from './compression.js';

export const STARFIELD_SIZE = 0.8 * 10**7;
export const WRAP_THRESHOLD = STARFIELD_SIZE * 0.4;
export const MAX_LOADED_PLANETS = 400;

export const starColorPalette = ['#FFFFFF', '#FFFAFA', '#F8F8FF', '#F0FFFF', '#E6E6FA', '#FFF5EE', '#FFFAF0', '#F0FFF0', '#E0FFFF', '#F0F8FF', '#F5F5F5', '#FFF0F5', '#FFFFF0', '#F0E68C', '#FFD700', '#87CEFA', '#ADD8E6', '#B0E0E6', '#AFEEEE'];
export const planetColorPalette = ['#FF6347', '#FFA07A', '#FF8C00', '#FFD700', '#9ACD32', '#32CD32', '#00FA9A', '#48D1CC', '#1E90FF', '#4169E1', '#8A2BE2', '#9932CC', '#FF69B4', '#DDA0DD', '#D2691E', '#CD853F', '#A0522D', '#808080', '#708090', '#2F4F4F'];

export class CelestialBody {
    constructor(position, size, color) {
        this.position = position;
        this.size = size;
        this.color = color;
    }
}

export class Star extends CelestialBody {
    constructor(position, size, color) {
        super(position, size, color);
        this.planets = [];
    }
}

export class Planet extends CelestialBody {
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

export class Moon extends CelestialBody {
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

export function generateStarmap(numStars = 5000) {
    const starmap = [];
    for (let i = 0; i < numStars; i++) {
        const star = {
            position: {
                x: Math.random() * STARFIELD_SIZE - STARFIELD_SIZE / 2,
                y: Math.random() * STARFIELD_SIZE - STARFIELD_SIZE / 2,
                z: Math.random() * STARFIELD_SIZE - STARFIELD_SIZE / 2
            },
            size: Math.random() * 4000 + 2000,
            color: Math.floor(Math.random() * starColorPalette.length),
            planets: []
        };

        const numPlanets = Math.floor(Math.random() * 23) - 3;
        for (let j = 0; j < numPlanets; j++) {
            const planet = generatePlanet(star);
            star.planets.push(planet);
        }

        starmap.push(star);
    }
    return starmap;
}

function generatePlanet(star) {
    const minDistanceFromStar = star.size * 1.3;
    const maxAdditionalDistance = star.size * 6;
    const distanceFromStar = minDistanceFromStar + Math.random() * maxAdditionalDistance;
    const orbitSpeed = 0.01 - ((distanceFromStar - minDistanceFromStar) / maxAdditionalDistance) * (0.01 - 0.00001);
    const orbitAngle = Math.random() * 2 * Math.PI;
    const planetSize = star.size * 0.05 + Math.random() * star.size * 0.15;

    const planet = {
        size: planetSize,
        color: Math.floor(Math.random() * planetColorPalette.length),
        distanceFromStar: distanceFromStar,
        orbitSpeed: orbitSpeed,
        orbitAngle: orbitAngle,
        moons: []
    };

    const numMoons = Math.floor(Math.random() * 5);
    for (let j = 0; j < numMoons; j++) {
        const moon = generateMoon(planet);
        planet.moons.push(moon);
    }

    return planet;
}

function generateMoon(planet) {
    const minDistanceFromPlanet = planet.size * 1.5;
    const maxAdditionalDistance = planet.size * 5;
    const distanceFromPlanet = minDistanceFromPlanet + Math.random() * maxAdditionalDistance;
    const orbitSpeed = 0.03 - ((distanceFromPlanet - minDistanceFromPlanet) / maxAdditionalDistance) * (0.03 - 0.003);
    const orbitAngle = Math.random() * 2 * Math.PI;
    const moonSize = planet.size * 0.1 + Math.random() * planet.size * 0.2;

    return {
        size: moonSize,
        color: Math.floor(Math.random() * planetColorPalette.length),
        distanceFromPlanet: distanceFromPlanet,
        orbitSpeed: orbitSpeed,
        orbitAngle: orbitAngle
    };
}

export function saveStarmapToFile(starmap) {
    const compressedStarmap = starmap.map(compressStar);
    const starmapJSON = JSON.stringify(compressedStarmap);
    const blob = new Blob([starmapJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'starmap.json';
    a.click();
    URL.revokeObjectURL(url);
}

export async function loadStarmap() {
    try {
        const response = await fetch('starmap.json');
        if (!response.ok) {
            throw new Error('Failed to load starmap');
        }
        const compressedStarmap = await response.json();
        return compressedStarmap.map(decompressStar);
    } catch (error) {
        console.error('Error loading starmap:', error);
        return null;
    }
}

export function initStar(starData) {
    const star = new Star(starData.position, starData.size, starData.color);
    starData.planets.forEach(planetData => {
        const planet = initPlanet(star, planetData);
        star.planets.push(planet);
    });
    return star;
}

export function initPlanet(star, planetData) {
    const planet = new Planet(
        new Vec3(0, 0, 0),
        planetData.size,
        planetData.color,
        planetData.distanceFromStar,
        planetData.orbitSpeed,
        planetData.orbitAngle
    );
    planetData.moons.forEach(moonData => {
        const moon = initMoon(planet, moonData);
        planet.moons.push(moon);
    });
    return planet;
}

export function initMoon(planet, moonData) {
    return new Moon(
        new Vec3(0, 0, 0),
        moonData.size,
        moonData.color,
        moonData.distanceFromPlanet,
        moonData.orbitSpeed,
        moonData.orbitAngle
    );
}

export function wrapOffset(offset) {
    const halfSize = STARFIELD_SIZE / 2;
    if (offset.x > halfSize) offset.x -= STARFIELD_SIZE;
    else if (offset.x < -halfSize) offset.x += STARFIELD_SIZE;
    if (offset.y > halfSize) offset.y -= STARFIELD_SIZE;
    else if (offset.y < -halfSize) offset.y += STARFIELD_SIZE;
    if (offset.z > halfSize) offset.z -= STARFIELD_SIZE;
    else if (offset.z < -halfSize) offset.z += STARFIELD_SIZE;
    return offset;
}

export function updateLoadedStars(stars, playerPos) {
    const loadedStars = stars.filter(star => {
        const wrappedOffset = wrapOffset(star.position.sub(playerPos));
        return wrappedOffset.length() <= WRAP_THRESHOLD;
    }).sort((a, b) => 
        wrapOffset(a.position.sub(playerPos)).lengthSquared() - wrapOffset(b.position.sub(playerPos)).lengthSquared()
    ).slice(0, MAX_LOADED_PLANETS);

    loadedStars.forEach(star => {
        star.planets.forEach(planet => planet.update(star.position));
    });

    return loadedStars;
}

export function transformAndFilterCelestialBodies(stars, loadedStars, playerPos, playerOrientation) {
    const transformedBodies = [];
    const invOrientation = playerOrientation.inverse();
    
    function transformBody(body, isStar = false) {
        const wrappedOffset = wrapOffset(body.position.sub(playerPos));
        const transformed = invOrientation.rotate(wrappedOffset);
        if (transformed.z > 0.3) {
            transformedBodies.push({
                x: transformed.x,
                y: transformed.y,
                z: transformed.z,
                size: body.size,
                color: isStar ? starColorPalette[body.color] : planetColorPalette[body.color],
                colorIndex: body.color,
                isStar: isStar,
                original: body
            });
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