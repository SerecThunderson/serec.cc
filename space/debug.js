export class Debug {
    constructor() {
        this.enabled = false;
        this.container = null;
    }

    enable() {
        this.enabled = true;
        this.createContainer();
    }

    disable() {
        this.enabled = false;
        if (this.container) {
            document.body.removeChild(this.container);
            this.container = null;
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.left = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.padding = '10px';
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '12px';
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);
    }

    log(message) {
        if (this.enabled && this.container) {
            const logElement = document.createElement('div');
            logElement.textContent = message;
            this.container.appendChild(logElement);

            // Keep only the last 10 messages
            while (this.container.children.length > 10) {
                this.container.removeChild(this.container.firstChild);
            }
        }
    }

    clear() {
        if (this.enabled && this.container) {
            this.container.innerHTML = '';
        }
    }

    logPlayerInfo(player) {
        this.clear();
        this.log(`Player position: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`);
        this.log(`Player rotation: w=${player.orientation.w.toFixed(2)}, x=${player.orientation.x.toFixed(2)}, y=${player.orientation.y.toFixed(2)}, z=${player.orientation.z.toFixed(2)}`);
        //this.log(`Player speed: ${player.currentSpeed.toFixed(2)}`);
    }
}