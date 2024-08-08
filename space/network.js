export class NetworkManager {
    constructor(url, player, onNewPlayer, onPlayerUpdate, onPlayerDisconnect) {
        this.socket = new WebSocket(url);
        this.player = player;
        this.onNewPlayer = onNewPlayer;
        this.onPlayerUpdate = onPlayerUpdate;
        this.onPlayerDisconnect = onPlayerDisconnect;

        this.socket.onopen = () => {
            console.log('Connected to server');
            this.startUpdateInterval();
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.socket.onclose = () => {
            console.log('Disconnected from server');
            this.stopUpdateInterval();
        };
    }

	handleMessage(message) {
		switch (message.type) {
			case 'init':
				this.player.id = message.id;
				console.log('Received player ID:', this.player.id);
				break;
			case 'newPlayer':
				this.onNewPlayer(message.id, message.position, message.orientation);
				break;
			case 'playerUpdate':
				this.onPlayerUpdate(message.id, message.position, message.orientation);
				break;
			case 'playerDisconnect':
				this.onPlayerDisconnect(message.id);
				break;
			case 'chat':
				chatBubbles.set(message.id, { message: message.message, time: Date.now() });
				break;
		}
	}


    startUpdateInterval() {
        this.updateInterval = setInterval(() => {
            this.sendUpdate();
        }, 50); // Send updates 20 times per second
    }

    stopUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    sendUpdate() {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'update',
                position: this.player.position,
                orientation: this.player.orientation
            }));
        }
    }
	
	sendChatMessage(message) {
    if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
            type: 'chat',
            message: message
        }));
    }
	}
}