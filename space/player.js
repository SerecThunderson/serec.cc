import { lerp, Vec3, Quat } from './utils.js';

export class Player {
    constructor() {
        this.position = new Vec3(0, 0, 0);
        this.currentSpeed = 0;
        this.maxSpeed = 3333;
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
            targetUpDownSpeed = this.maxSpeed * -forwardInput;
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

export const initializeControls = () => {
    const keys = {};
    window.addEventListener('keydown', (e) => {keys[e.key.toLowerCase()] = true;});
    window.addEventListener('keyup', (e) => {keys[e.key.toLowerCase()] = false;});
    return keys;
};

export const createRollingBuffer = () => ({
    btn14Frames: 0,
    btn15Frames: 0,
    threshold: 3,
    decelerationFactor: 0.95,
    currentRollSpeed: 0,
    maxRollSpeed: 0.022
});