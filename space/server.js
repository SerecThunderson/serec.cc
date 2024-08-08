const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server is running on port ${port}`);

// Get the local IP address
const interfaces = os.networkInterfaces();
let localIP = 'localhost'; // Default to localhost if no IP found

for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
            localIP = alias.address;
        }
    }
}

console.log(`WebSocket server is available at ws://${localIP}:${port}`);

const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    const clientInfo = {
        id: clientId,
        ws: ws,
        position: { x: 0, y: 0, z: 0 },
        orientation: { w: 1, x: 0, y: 0, z: 0 }
    };
    clients.set(clientId, clientInfo);

    console.log(`New client connected: ${clientId}`);

    ws.send(JSON.stringify({ type: 'init', id: clientId }));

    // Notify the new client of existing players
    clients.forEach((client) => {
        if (client.id !== clientId) {
            ws.send(JSON.stringify({
                type: 'newPlayer',
                id: client.id,
                position: client.position,
                orientation: client.orientation
            }));
        }
    });

    // Notify existing clients about the new player
    broadcast(clientId, {
        type: 'newPlayer',
        id: clientId,
        position: clientInfo.position,
        orientation: clientInfo.orientation
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'update':
                clientInfo.position = data.position;
                clientInfo.orientation = data.orientation;
                broadcast(clientId, {
                    type: 'playerUpdate',
                    id: clientId,
                    position: data.position,
                    orientation: data.orientation
                });
                break;
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(clientId);
        broadcast(clientId, { type: 'playerDisconnect', id: clientId });
    });
});

function broadcast(senderId, message) {
    clients.forEach((client) => {
        if (client.id !== senderId) {
            client.ws.send(JSON.stringify(message));
        }
    });
}
