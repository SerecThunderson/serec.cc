export const lerp = (a, b, t) => a + (b - a) * t;

export class Vec3 {
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
    cross(v) { 
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
}

export class Quat {
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