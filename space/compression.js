import { Vec3 } from './utils.js';

// Compress a number to a fixed precision
function compressNumber(num, precision = 2) {
    return Number(num.toFixed(precision));
}

// Compress a Vec3 object
function compressVec3(vec) {
    return {
        x: compressNumber(vec.x),
        y: compressNumber(vec.y),
        z: compressNumber(vec.z)
    };
}

// Compress a star object
export function compressStar(star) {
    return {
        p: compressVec3(star.position),
        s: compressNumber(star.size),
        c: star.color,
        pl: star.planets.map(compressPlanet)
    };
}

// Compress a planet object
function compressPlanet(planet) {
    return {
        s: compressNumber(planet.size),
        c: planet.color,
        d: compressNumber(planet.distanceFromStar),
        o: compressNumber(planet.orbitSpeed, 5),
        a: compressNumber(planet.orbitAngle),
        m: planet.moons.map(compressMoon)
    };
}

// Compress a moon object
function compressMoon(moon) {
    return {
        s: compressNumber(moon.size),
        c: moon.color,
        d: compressNumber(moon.distanceFromPlanet),
        o: compressNumber(moon.orbitSpeed, 5),
        a: compressNumber(moon.orbitAngle)
    };
}

// Decompress a star object
export function decompressStar(star) {
    return {
        position: new Vec3(star.p.x, star.p.y, star.p.z),
        size: star.s,
        color: star.c,
        planets: star.pl.map(decompressPlanet)
    };
}

// Decompress a planet object
function decompressPlanet(planet) {
    return {
        size: planet.s,
        color: planet.c,
        distanceFromStar: planet.d,
        orbitSpeed: planet.o,
        orbitAngle: planet.a,
        moons: planet.m.map(decompressMoon)
    };
}

// Decompress a moon object
function decompressMoon(moon) {
    return {
        size: moon.s,
        color: moon.c,
        distanceFromPlanet: moon.d,
        orbitSpeed: moon.o,
        orbitAngle: moon.a
    };
}