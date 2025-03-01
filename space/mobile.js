// mobile.js - Mobile touch controls for the space game
export class MobileControls {
    constructor(keys) {
        this.keys = keys;
        this.leftJoystick = null;
        this.rightJoystick = null;
        this.leftJoystickHandle = null;
        this.rightJoystickHandle = null;
        
        // Track joystick state
        this.leftTouchId = null;
        this.rightTouchId = null;
        this.leftStartPos = { x: 0, y: 0 };
        this.rightStartPos = { x: 0, y: 0 };
        
        // Check if on mobile device
        this.isMobile = 'ontouchstart' in window;
        
        if (this.isMobile) {
            this.createJoysticks();
            this.setupEventListeners();
        }
    }
    
    createJoysticks() {
        // Create left joystick
        this.leftJoystick = document.createElement('div');
        this.leftJoystick.className = 'joystick-container left-joystick';
        
        const leftBase = document.createElement('div');
        leftBase.className = 'joystick-base';
        
        this.leftJoystickHandle = document.createElement('div');
        this.leftJoystickHandle.className = 'joystick-handle';
        
        leftBase.appendChild(this.leftJoystickHandle);
        this.leftJoystick.appendChild(leftBase);
        
        // Create right joystick
        this.rightJoystick = document.createElement('div');
        this.rightJoystick.className = 'joystick-container right-joystick';
        
        const rightBase = document.createElement('div');
        rightBase.className = 'joystick-base';
        
        this.rightJoystickHandle = document.createElement('div');
        this.rightJoystickHandle.className = 'joystick-handle';
        
        rightBase.appendChild(this.rightJoystickHandle);
        this.rightJoystick.appendChild(rightBase);
        
        // Add to DOM
        document.body.appendChild(this.leftJoystick);
        document.body.appendChild(this.rightJoystick);
    }
    
    setupEventListeners() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    handleTouchStart(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Determine if touch is on left or right side of screen
            if (touchX < window.innerWidth / 2 && !this.leftTouchId) {
                this.leftTouchId = touch.identifier;
                this.leftStartPos = { x: touchX, y: touchY };
                
                // Position joystick at touch point
                this.leftJoystick.style.display = 'block';
                this.leftJoystick.style.left = `${touchX - 60}px`;
                this.leftJoystick.style.top = `${touchY - 60}px`;
                
                // Reset handle position
                this.leftJoystickHandle.style.transform = 'translate(-50%, -50%)';
            } 
            else if (touchX >= window.innerWidth / 2 && !this.rightTouchId) {
                this.rightTouchId = touch.identifier;
                this.rightStartPos = { x: touchX, y: touchY };
                
                // Position joystick at touch point
                this.rightJoystick.style.display = 'block';
                this.rightJoystick.style.left = `${touchX - 60}px`;
                this.rightJoystick.style.top = `${touchY - 60}px`;
                
                // Reset handle position
                this.rightJoystickHandle.style.transform = 'translate(-50%, -50%)';
            }
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling while using joysticks
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            if (touch.identifier === this.leftTouchId) {
                // Calculate joystick position relative to start
                let deltaX = touch.clientX - this.leftStartPos.x;
                let deltaY = touch.clientY - this.leftStartPos.y;
                
                // Limit joystick movement to the base radius
                const maxDistance = 50; // Max distance handle can move from center
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > maxDistance) {
                    const angle = Math.atan2(deltaY, deltaX);
                    deltaX = Math.cos(angle) * maxDistance;
                    deltaY = Math.sin(angle) * maxDistance;
                }
                
                // Move joystick handle
                this.leftJoystickHandle.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                
                // Map joystick position to movement keys
                const normalizedX = deltaX / maxDistance; // Range: -1 to 1
                const normalizedY = deltaY / maxDistance; // Range: -1 to 1
                
                // Map to arrow keys (movement)
                this.keys.arrowup = normalizedY < -0.2;
                this.keys.arrowdown = normalizedY > 0.2;
                this.keys.arrowleft = normalizedX < -0.2;
                this.keys.arrowright = normalizedX > 0.2;
            }
            
            if (touch.identifier === this.rightTouchId) {
                // Calculate joystick position relative to start
                let deltaX = touch.clientX - this.rightStartPos.x;
                let deltaY = touch.clientY - this.rightStartPos.y;
                
                // Limit joystick movement
                const maxDistance = 50;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > maxDistance) {
                    const angle = Math.atan2(deltaY, deltaX);
                    deltaX = Math.cos(angle) * maxDistance;
                    deltaY = Math.sin(angle) * maxDistance;
                }
                
                // Move joystick handle
                this.rightJoystickHandle.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                
                // Map joystick position to rotation keys
                const normalizedX = deltaX / maxDistance;
                const normalizedY = deltaY / maxDistance;
                
                // Map to WASD keys (camera rotation)
                this.keys.a = normalizedX < -0.2;
                this.keys.d = normalizedX > 0.2;
                this.keys.w = normalizedY < -0.2;
                this.keys.s = normalizedY > 0.2;
            }
        }
    }
    
    handleTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            if (touch.identifier === this.leftTouchId) {
                this.leftTouchId = null;
                this.leftJoystick.style.display = 'none';
                
                // Reset movement keys
                this.keys.arrowup = false;
                this.keys.arrowdown = false;
                this.keys.arrowleft = false;
                this.keys.arrowright = false;
            }
            
            if (touch.identifier === this.rightTouchId) {
                this.rightTouchId = null;
                this.rightJoystick.style.display = 'none';
                
                // Reset rotation keys
                this.keys.a = false;
                this.keys.d = false;
                this.keys.w = false;
                this.keys.s = false;
            }
        }
    }
}
