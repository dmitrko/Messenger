import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { User, CryptoService } from '@nostachat/shared';
import sodium_ from 'libsodium-wrappers';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3002;

const sodiumReady = sodium_.ready;
// --- Global Room Configuration ---
let PUBLIC_ROOM_KEY: Uint8Array;
async function initRoom() {
    await sodiumReady;
    PUBLIC_ROOM_KEY = sodium_.randombytes_buf(32);
    console.log('Public Room Key generated.');
}
initRoom();

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
    const min = 10;
    const max = 99;
    let uin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    while (onlineUsers.has(uin)) {
        uin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    }
    return uin;
}

wss.on('connection', async (ws: ClientWithId) => {
    console.log('New client connected');

    ws.on('message', async (rawData: any) => {
        try {
            const message = rawData.toString();
            const data = JSON.parse(message);

            if (data.type === 'direct_message') {
                console.log(`--- Incoming Private Message ---`);
                console.log(`To: ${data.to} | Content: ${data.isEncrypted ? '[Encrypted E2EE Content]' : data.text}`);
            } else if (data.type === 'message') {
                console.log(`--- Incoming Public Message ---`);
                console.log(`From: ${ws.id} | Text: ${data.isEncrypted ? '[Encrypted Public Content]' : data.text}`);
            } else {
                console.log('--- Incoming System Message ---');
                console.log('Type:', data.type);
            }

            if (data.type === 'register') {
                console.log('Processing registration/login for:', data.username);
                // If UIN is provided, reuse it (Legacy or persistent)
                const uin = data.uin || generateUIN();
                ws.id = uin;
                ws.username = data.username || `User_${uin}`;
                ws.publicKey = data.publicKey;
                ws.kyberPublicKey = data.kyberPublicKey;
                onlineUsers.set(uin, ws);

                console.log('Assigning UIN:', uin);

                // Seal the Room Key for the user
                const sealedRoomKey = await CryptoService.sealRoomKey(
                    PUBLIC_ROOM_KEY,
                    sodium_.from_base64(data.publicKey)
                );

                const response = JSON.stringify({
                    type: 'registered',
                    uin: ws.id,
                    username: ws.username,
                    sealedRoomKey
                });

                console.log('Sending confirmation to client (with sealed key)');
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
                console.log(`Relaying DM to ${data.to}. Target found? ${!!target}`);

                if (target && target.readyState === WebSocket.OPEN) {
                    const relayData = {
                        ...data,
                        from: ws.id,
                        fromUsername: ws.username
                    };
                    console.log(`Sending relay packet to target UIN: ${data.to}`);
                    target.send(JSON.stringify(relayData));
                } else {
                    console.error(`Relay FAILED: Target ${data.to} not online or connection closed.`);
                }
            }

            if (data.type === 'message') {
                wss.clients.forEach((client: ClientWithId) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            ...data,
                            from: ws.id,
                            fromUsername: ws.username
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
