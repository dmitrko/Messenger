import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { User } from '@nostachat/shared';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3002;

interface ClientWithId extends WebSocket {
    id?: string;
    username?: string;
}

wss.on('connection', (ws: ClientWithId) => {
    console.log('New client connected');

    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);

            if (data.type === 'register') {
                ws.username = data.username;
                ws.id = Math.floor(Math.random() * 1000000).toString(); // Simple UIN for now
                ws.send(JSON.stringify({
                    type: 'registered',
                    uin: ws.id,
                    username: ws.username
                }));
            }

            if (data.type === 'message') {
                // Broadcast to all
                wss.clients.forEach((client: ClientWithId) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'message',
                            from: ws.username || ws.id,
                            text: data.text
                        }));
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing message', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
