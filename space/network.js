export class NetworkManager {
    constructor(url, player, onNewPlayer, onPlayerUpdate, onPlayerDisconnect, onChatMessage) { // Added onChatMessage
        this.socket = null;
        this.url = url;
        this.player = player;
        this.onNewPlayer = onNewPlayer;
        this.onPlayerUpdate = onPlayerUpdate;
        this.onPlayerDisconnect = onPlayerDisconnect;
        this.onChatMessage = onChatMessage; // Store chat handler
        this.updateInterval = null;

        this.connect(); // Attempt connection immediately
    }

    connect() {
         // Don't reconnect if already connecting or open
        if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
             return;
        }

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('Connected to server');
            this.startUpdateInterval();
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse message or handle it:', event.data, error);
            }
        };

        this.socket.onclose = () => {
            console.log('Disconnected from server. Attempting to reconnect...');
            this.stopUpdateInterval();
            this.socket = null; // Clear the socket object
            // Simple reconnection strategy: try again after a delay
            setTimeout(() => this.connect(), 5000);
        };

        this.socket.onerror = (error) => {
             console.error('WebSocket Error:', error);
             // The onclose event will likely fire after this, triggering reconnection logic
             this.socket.close(); // Ensure connection is closed to trigger onclose
        };
    }


    handleMessage(message) {
        if (!message || !message.type) {
            console.warn('Received invalid message:', message);
            return;
        }

        switch (message.type) {
            case 'init':
                this.player.id = message.id;
                console.log('Received player ID:', this.player.id);
                // Send initial state now that we have ID
                this.sendUpdate();
                break;
            case 'newPlayer':
                 if (message.id !== this.player.id) { // Don't add self
                    console.log(`New player joined: ${message.id}`);
                    this.onNewPlayer(message.id, message.position, message.orientation);
                 }
                break;
            case 'playerUpdate':
                 if (message.id !== this.player.id) { // Don't update self from server message
                     this.onPlayerUpdate(message.id, message.position, message.orientation);
                 }
                break;
            case 'playerDisconnect':
                console.log(`Player disconnected: ${message.id}`);
                this.onPlayerDisconnect(message.id);
                break;
            case 'chat': // Handle incoming chat messages
                // Call the handler function passed in the constructor
                 if (this.onChatMessage) {
                     this.onChatMessage(message.id, message.message);
                 }
                break;
            default:
                 console.warn(`Received unknown message type: ${message.type}`);
                 break;
        }
    }


    startUpdateInterval() {
        // Clear existing interval if any
        this.stopUpdateInterval();
        this.updateInterval = setInterval(() => {
            this.sendUpdate();
        }, 50); // Send updates 20 times per second
    }

    stopUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    sendUpdate() {
        // Ensure we have an ID and the socket is open
        if (this.player.id && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'update',
                position: this.player.position,
                orientation: this.player.orientation
            }));
        }
    }

    // Method to send chat messages
    sendChatMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
             // Basic sanitization/length check
             const cleanMessage = message.trim().substring(0, 100); // Limit length
             if (cleanMessage) {
                 this.socket.send(JSON.stringify({
                     type: 'chat',
                     message: cleanMessage
                 }));
             }
        } else {
             console.warn("Cannot send chat message, socket not open.");
        }
    }
}
