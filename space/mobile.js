// mobile.js - Mobile touch controls for the space game
export class MobileControls {
    constructor(keys) {
        this.keys = keys;
        this.leftJoystick = null;
        this.rightJoystick = null;
        this.leftJoystickHandle = null;
        this.rightJoystickHandle = null;
        this.leftTouchId = null;
        this.rightTouchId = null;
        this.leftStartPos = { x: 0, y: 0 };
        this.rightStartPos = { x: 0, y: 0 };

        // --- Get references to UI containers to ignore touches within them ---
        this.chatContainer = document.getElementById('chatContainer');
        this.playerListContainer = document.getElementById('playerListContainer');
        // --- End UI container references ---

        this.isMobile = 'ontouchstart' in window;
        if (this.isMobile) {
            console.log("Mobile device detected, creating joysticks...");
            this.createJoysticks();
            this.setupEventListeners();
        } else {
             console.log("Not a mobile device, skipping joystick creation.");
        }
    }

    createJoysticks() {
        this.leftJoystick = document.createElement('div');
        this.leftJoystick.className = 'joystick-container left-joystick';
        const leftBase = document.createElement('div'); leftBase.className = 'joystick-base';
        this.leftJoystickHandle = document.createElement('div'); this.leftJoystickHandle.className = 'joystick-handle';
        leftBase.appendChild(this.leftJoystickHandle); this.leftJoystick.appendChild(leftBase);

        this.rightJoystick = document.createElement('div');
        this.rightJoystick.className = 'joystick-container right-joystick';
        const rightBase = document.createElement('div'); rightBase.className = 'joystick-base';
        this.rightJoystickHandle = document.createElement('div'); this.rightJoystickHandle.className = 'joystick-handle';
        rightBase.appendChild(this.rightJoystickHandle); this.rightJoystick.appendChild(rightBase);

        document.body.appendChild(this.leftJoystick); document.body.appendChild(this.rightJoystick);
        console.log("Joysticks added to DOM.");
    }

    setupEventListeners() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        console.log("Touch event listeners set up.");
    }

    // --- Helper to check if touch is inside a UI element ---
    isTouchInsideElement(touchX, touchY, element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
            touchX >= rect.left &&
            touchX <= rect.right &&
            touchY >= rect.top &&
            touchY <= rect.bottom
        );
    }
    // --- End helper ---


    handleTouchStart(e) {
        if (!this.leftJoystick || !this.rightJoystick) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            let preventDefault = false; // Flag to prevent default only if joystick assigned

            // --- Check if touch is inside UI element BEFORE assigning to joystick ---
            if (this.isTouchInsideElement(touchX, touchY, this.chatContainer) ||
                this.isTouchInsideElement(touchX, touchY, this.playerListContainer)) {
                console.log(`Touch started inside UI element (ID: ${touch.identifier}), ignoring for joystick.`);
                continue; // Skip joystick assignment for this touch
            }
            // --- End UI touch check ---


            // Determine if touch is on left or right side AND if joystick is available
            if (touchX < window.innerWidth / 2 && this.leftTouchId === null) {
                this.leftTouchId = touch.identifier;
                this.leftStartPos = { x: touchX, y: touchY };
                this.leftJoystick.style.display = 'block';
                this.leftJoystick.style.left = `${touchX - 60}px`;
                this.leftJoystick.style.top = `${touchY - 60}px`;
                this.leftJoystickHandle.style.transform = 'translate(-50%, -50%)';
                console.log(`Left joystick activated: ID ${this.leftTouchId}`);
                preventDefault = true; // Prevent default only if we assigned a joystick

            } else if (touchX >= window.innerWidth / 2 && this.rightTouchId === null) {
                this.rightTouchId = touch.identifier;
                this.rightStartPos = { x: touchX, y: touchY };
                this.rightJoystick.style.display = 'block';
                this.rightJoystick.style.left = `${touchX - 60}px`;
                this.rightJoystick.style.top = `${touchY - 60}px`;
                this.rightJoystickHandle.style.transform = 'translate(-50%, -50%)';
                console.log(`Right joystick activated: ID ${this.rightTouchId}`);
                preventDefault = true; // Prevent default only if we assigned a joystick
            }

            // Prevent default only if a joystick was activated by this touch
            if (preventDefault) {
                 e.preventDefault();
            }
        }
    }

    handleTouchMove(e) {
        // If a touch is actively controlling a joystick, prevent default scroll/zoom etc.
        let isJoystickTouchMoving = false;
         for (let i = 0; i < e.changedTouches.length; i++) {
              const touch = e.changedTouches[i];
              if(touch.identifier === this.leftTouchId || touch.identifier === this.rightTouchId) {
                   isJoystickTouchMoving = true;
                   break;
              }
         }
         if(isJoystickTouchMoving) {
            e.preventDefault();
         } else {
             // Allow moving/scrolling if the touch isn't controlling a joystick (e.g., scrolling chat)
             return;
         }


        if (!this.leftJoystickHandle || !this.rightJoystickHandle) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const maxDistance = 50;

            if (touch.identifier === this.leftTouchId) {
                let deltaX = touch.clientX - this.leftStartPos.x;
                let deltaY = touch.clientY - this.leftStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (distance > maxDistance) {
                    const angle = Math.atan2(deltaY, deltaX);
                    deltaX = Math.cos(angle) * maxDistance; deltaY = Math.sin(angle) * maxDistance;
                }
                this.leftJoystickHandle.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                const normalizedX = deltaX / maxDistance; const normalizedY = deltaY / maxDistance;
                this.keys.arrowup = normalizedY < -0.3; this.keys.arrowdown = normalizedY > 0.3;
                this.keys.arrowleft = normalizedX < -0.3; this.keys.arrowright = normalizedX > 0.3;
            }

            if (touch.identifier === this.rightTouchId) {
                let deltaX = touch.clientX - this.rightStartPos.x;
                let deltaY = touch.clientY - this.rightStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (distance > maxDistance) {
                    const angle = Math.atan2(deltaY, deltaX);
                    deltaX = Math.cos(angle) * maxDistance; deltaY = Math.sin(angle) * maxDistance;
                }
                this.rightJoystickHandle.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                const normalizedX = deltaX / maxDistance; const normalizedY = deltaY / maxDistance;
                this.keys.a = normalizedX < -0.3; this.keys.d = normalizedX > 0.3;
                this.keys.w = normalizedY < -0.3; this.keys.s = normalizedY > 0.3;
                this.keys.q = false; this.keys.e = false; // Ensure roll is off
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.leftJoystick || !this.rightJoystick) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.leftTouchId) {
                this.leftTouchId = null; this.leftJoystick.style.display = 'none';
                console.log("Left joystick deactivated");
                this.keys.arrowup = false; this.keys.arrowdown = false;
                this.keys.arrowleft = false; this.keys.arrowright = false;
            }
            if (touch.identifier === this.rightTouchId) {
                this.rightTouchId = null; this.rightJoystick.style.display = 'none';
                console.log("Right joystick deactivated");
                this.keys.a = false; this.keys.d = false; this.keys.w = false; this.keys.s = false;
                this.keys.q = false; this.keys.e = false;
            }
        }
    }
}
