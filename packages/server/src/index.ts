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
    publicKey?: string;
    kyberPublicKey?: string;
}

const onlineUsers = new Map<string, ClientWithId>();

function broadcastUserList() {
    const users = Array.from(onlineUsers.values()).map(u => ({
        uin: u.id,
        username: u.username,
        publicKey: u.publicKey,
        kyberPublicKey: u.kyberPublicKey
    }));
    const listMsg = JSON.stringify({ type: 'user_list', users });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(listMsg);
        }
    });
}

function generateUIN(): string {
    const min = 100000;
    const max = 999999999;
    let uin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    while (onlineUsers.has(uin)) {
        uin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    }
    return uin;
}

wss.on('connection', (ws: ClientWithId) => {
    console.log('New client connected');

    ws.on('message', (rawData: any) => {
        try {
            const message = rawData.toString();
            const data = JSON.parse(message);
            console.log('--- Incoming Message ---');
            console.log('Type:', data.type);
            console.log('Data:', data);

            if (data.type === 'register') {
                console.log('Processing registration for:', data.username);
                const uin = generateUIN();
                ws.id = uin;
                ws.username = data.username || `User_${uin}`;
                ws.publicKey = data.publicKey;
                ws.kyberPublicKey = data.kyberPublicKey;
                onlineUsers.set(uin, ws);

                console.log('Assigning UIN:', uin);

                const response = JSON.stringify({
                    type: 'registered',
                    uin: ws.id,
                    username: ws.username
                });

                console.log('Sending confirmation to client:', response);
                ws.send(response);

                broadcastUserList();
            }

            if (data.type === 'signal') {
                const target = onlineUsers.get(data.to);
                if (target && target.readyState === WebSocket.OPEN) {
                    target.send(JSON.stringify({
                        type: 'signal',
                        from: ws.id,
                        signal: data.signal
                    }));
                }
            }

            if (data.type === 'direct_message') {
                const target = onlineUsers.get(data.to);
                if (target && target.readyState === WebSocket.OPEN) {
                    target.send(JSON.stringify({
                        type: 'direct_message',
                        from: ws.id,
                        fromUsername: ws.username,
                        text: data.text
                    }));
                }
            }

            if (data.type === 'message') {
                wss.clients.forEach((client: ClientWithId) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'message',
                            from: ws.id,
                            fromUsername: ws.username,
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
        if (ws.id) {
            onlineUsers.delete(ws.id);
            broadcastUserList();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
