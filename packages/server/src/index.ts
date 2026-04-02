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

// --- System Logging System (from VPS version) ---
const systemLogs: { time: string, msg: string, type: 'info' | 'warn' | 'error' | 'msg' }[] = [];
function addLog(msg: string, type: 'info' | 'warn' | 'error' | 'msg' = 'info') {
    const time = new Date().toLocaleTimeString();
    systemLogs.push({ time, msg, type });
    if (systemLogs.length > 200) systemLogs.shift();
    console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);
}

// --- Global Room Configuration ---
let PUBLIC_ROOM_KEY: Uint8Array;
async function initRoom() {
    await sodiumReady;
    PUBLIC_ROOM_KEY = sodium_.randombytes_buf(32);
    addLog('Public Room Key generated.', 'info');
}
initRoom();

interface ClientWithId extends WebSocket {
    id?: string;
    username?: string;
    publicKey?: string;
    kyberPublicKey?: string;
}

const onlineUsers = new Map<string, ClientWithId>();

// --- Dashboard Routes (from VPS version) ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>NostaChat Server Dashboard</title>
        <style>
            :root { --bg: #0a0a0b; --card: #141417; --text: #e1e1e6; --dim: #828282; --accent: #00f2ff; }
            body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .card { background: var(--card); padding: 20px; border-radius: 15px; border: 1px solid #ffffff05; }
            .card h3 { margin: 0; color: var(--dim); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
            .card .value { font-size: 2.5rem; font-weight: 700; color: var(--accent); margin-top: 10px; }
            .grid-top { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .logs-full { background: var(--card); border-radius: 15px; padding: 20px; border: 1px solid #ffffff05; }
            .list-box { background: var(--card); border-radius: 15px; padding: 20px; border: 1px solid #ffffff05; height: 300px; overflow-y: auto; }
            .logs-scroll { height: 800px !important; overflow-y: auto; }
            h2 { font-size: 1.1rem; margin-top: 0; display: flex; align-items: center; gap: 10px; }
            .badge { background: #00ff8820; color: #00ff88; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; }
            
            .log-item { display: flex; gap: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; padding: 6px 0; border-bottom: 1px solid #ffffff05; }
            .log-time { color: var(--dim); min-width: 70px; }
            .log-type { padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; }
            .type-info { background: #444; }
            .type-msg { background: #005a5f; color: #00f2ff; }
            .type-warn { background: #5f5a00; color: #ffeb00; }

            .user-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: #ffffff03; margin-bottom: 8px; border-radius: 10px; border: 1px solid #ffffff05; }
            .user-avatar { width: 32px; height: 32px; background: linear-gradient(45deg, #222, #444); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--accent); }

            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div>
                    <h1>NostaChat<span style="color:var(--dim); font-weight:300">Server</span></h1>
                    <div style="font-size:0.8rem; color:var(--dim); margin-top:4px">Real-time Signaling Cluster v1.0</div>
                </div>
                <div class="badge">● ONLINE</div>
            </header>

            <div class="stats">
                <div class="card">
                    <h3>Clients Online</h3>
                    <div class="value" id="count">0</div>
                </div>
                <div class="card">
                    <h3>Uptime</h3>
                    <div class="value" id="uptime">0m</div>
                </div>
            </div>

            <div class="grid-top">
                <div class="list-box">
                    <h2>Live Users</h2>
                    <div id="users"></div>
                </div>
                <div class="list-box">
                    <h2>Quick Stats</h2>
                    <div id="quick-stats" style="font-family: monospace; font-size: 0.8rem; color: var(--dim);">Loading...</div>
                </div>
            </div>
            <div class="logs-full">
                <h2>System Logs <span style="font-size: 0.7rem; color: var(--dim); font-weight: normal;">— last 200 entries</span></h2>
                <div class="logs-scroll" id="logs"></div>
            </div>
        </div>

        <script>
            let startTime = Date.now();
            async function update() {
                try {
                    const res = await fetch('/api/stats');
                    const data = await res.json();
                    
                    document.getElementById('count').innerText = data.count;
                    document.getElementById('uptime').innerText = Math.floor((Date.now() - startTime) / 60000) + 'm';
                    
                    document.getElementById('users').innerHTML = data.users.map(u => \`
                        <div class="user-item">
                            <div class="user-avatar">\${u.username[0]}</div>
                            <div>
                                <div style="font-weight:600">\${u.username}</div>
                                <div style="font-size:0.7rem; color:var(--dim)">UIN: \${u.uin}</div>
                            </div>
                        </div>
                    \`).join('');

                    document.getElementById('quick-stats').innerHTML = \`
                        <div>🟢 Online: <b style="color:var(--accent)">\${data.count}</b></div>
                        <div style="margin-top:8px">📋 Log entries: <b>\${data.logs.length}</b></div>
                    \`;

                    document.getElementById('logs').innerHTML = data.logs.slice().reverse().map(l => \`
                        <div class="log-item">
                            <span class="log-time">\${l.time}</span>
                            <span class="log-type type-\${l.type}">\${l.type.toUpperCase()}</span>
                            <span>\${l.msg}</span>
                        </div>
                    \`).join('');
                } catch(e) {}
            }
            setInterval(update, 2000);
            update();
        </script>
    </body>
    </html>
    `);
});

app.get('/api/stats', (req, res) => {
    res.json({
        count: onlineUsers.size,
        users: Array.from(onlineUsers.values()).map(u => ({ uin: u.id, username: u.username })),
        logs: systemLogs
    });
});

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
    // UPDATED: 2-digit UINs for testing
    const min = 10;
    const max = 99;
    let uin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    while (onlineUsers.has(uin)) {
        uin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    }
    return uin;
}

wss.on('connection', async (ws: ClientWithId) => {
    addLog('New client connection attempt', 'info');

    ws.on('message', async (rawData: any) => {
        try {
            const message = rawData.toString();
            const data = JSON.parse(message);

            if (data.type === 'direct_message') {
                addLog(`Relaying private message to UIN: ${data.to}`, 'msg');
            } else if (data.type === 'message') {
                addLog(`Broadcast message from UIN: ${ws.id}`, 'msg');
            }

            if (data.type === 'register') {
                // Support Manual UIN override (e.g. "111") or auto-generate
                // Fix: Check both username and loginNickname from client
                let uin = data.uin || generateUIN();
                const possibleUin = data.username || data.loginNickname;
                if (possibleUin && /^\d+$/.test(possibleUin)) {
                    uin = possibleUin;
                }
                ws.id = uin;
                ws.username = possibleUin || `User_${uin}`;
                ws.publicKey = data.publicKey;
                ws.kyberPublicKey = data.kyberPublicKey;
                onlineUsers.set(uin, ws);

                addLog(`Registered/Logged in user: ${ws.username} (${uin})`, 'info');

                const sealedRoomKey = await CryptoService.sealRoomKey(
                    PUBLIC_ROOM_KEY,
                    sodium_.from_base64(data.publicKey)
                );

                const response = JSON.stringify({
                    type: 'registered',
                    uin: ws.id,
                    username: ws.username,
                    sealedRoomKey,
                    isManual: /^\d+$/.test(ws.username || '')
                });

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

            if (data.type === 'direct_message' || data.type === 'auth_request' || data.type === 'auth_sync') {
                const target = onlineUsers.get(data.to);
                if (target && target.readyState === WebSocket.OPEN) {
                    const relayData = {
                        ...data,
                        from: ws.id,
                        fromUsername: ws.username
                    };
                    addLog(`Relaying ${data.type} to UIN: ${data.to}`, 'msg');
                    target.send(JSON.stringify(relayData));
                } else {
                    addLog(`Relay failed: Target ${data.to} offline`, 'warn');
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
            addLog('Error parsing incoming message', 'error');
        }
    });

    ws.on('close', () => {
        if (ws.id) {
            addLog(`User disconnected: ${ws.username} (${ws.id})`, 'info');
            onlineUsers.delete(ws.id);
            broadcastUserList();
        }
    });
});

server.listen(PORT, () => {
    addLog(`Server is running on port ${PORT}`, 'info');
});
