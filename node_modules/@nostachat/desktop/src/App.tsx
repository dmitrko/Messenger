import { useState, useEffect, useRef } from 'react';
import { CryptoService } from '@nostachat/shared';
import { WebRTCService } from './services/webrtc';
import sodium_ from 'libsodium-wrappers';
const sodium = (sodium_ as any).default || sodium_;
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (window as any).global = window;
}

interface OnlineUser {
    uin: string;
    username: string;
    publicKey?: string;
    kyberPublicKey?: string;
}

interface Message {
    type: 'public' | 'private';
    from: string;
    fromUin: string;
    text: string;
    to?: string;
    isSecure?: boolean;
}

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [uin, setUin] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<{ [uin: string]: number }>({});
    const [initError, setInitError] = useState<string | null>(null);

    // UI state
    const [contactsOpen, setContactsOpen] = useState(true);
    const [groupsOpen, setGroupsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [buzzCooldown, setBuzzCooldown] = useState(false);

    // Global error handler
    useEffect(() => {
        const handleError = (e: any) => {
            console.error('JS Error:', e);
            setInitError(e.message || String(e));
        };
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    // Crypto & services state
    const [myKeys, setMyKeys] = useState<any>(null);
    const ws = useRef<WebSocket | null>(null);
    const selectedUserRef = useRef<OnlineUser | null>(null);
    const rtc = useRef<WebRTCService | null>(null);

    // Sync ref
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    const triggerBuzz = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 800);
    };

    // Stable message handler using ref to avoid reconnecting on state changes
    const onMessageRef = useRef<((msg: any) => void) | null>(null);
    onMessageRef.current = async (data: any) => {
        console.log('--- Incoming WS Message ---', data);

        if (data.type === 'registered') {
            setUin(data.uin);
            setUsername(data.username);
        } else if (data.type === 'user_list') {
            setOnlineUsers(data.users);
        } else if (data.type === 'signal') {
            rtc.current?.handleSignal(data.from, data.signal);
        } else if (data.type === 'message') {
            setMessages((prev) => [...prev, {
                type: 'public',
                from: data.fromUsername,
                fromUin: data.from,
                text: data.text
            }]);
        } else if (data.type === 'direct_message') {
            let messageText = data.text;
            let isSecure = false;

            if (data.isBuzz) {
                triggerBuzz();
                messageText = '🔔 BUZZ! (Гудок)';
            } else {
                const sender = onlineUsers.find(u => u.uin === data.from);
                if (data.isEncrypted && sender && myKeys) {
                    try {
                        messageText = await CryptoService.hybridDecrypt(
                            data.text,
                            data.kyberCT,
                            sodium.from_base64(sender.publicKey!),
                            myKeys.kyber.secretKey,
                            myKeys.classic.privateKey
                        );
                        isSecure = true;
                    } catch (e) {
                        messageText = '[Ошибка декодирования]';
                    }
                }
            }

            setMessages((prev) => [...prev, {
                type: 'private',
                from: data.fromUsername || 'User',
                fromUin: data.from,
                text: messageText,
                isSecure
            }]);

            if (!selectedUserRef.current || selectedUserRef.current.uin !== data.from) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [data.from]: (prev[data.from] || 0) + 1
                }));
            }
        }
    };

    useEffect(() => {
        // Init WebRTC once
        rtc.current = new WebRTCService(
            (peerId, signal) => {
                ws.current?.send(JSON.stringify({ type: 'signal', to: peerId, signal }));
            },
            async (peerId, encryptedData) => {
                try {
                    const parsed = JSON.parse(encryptedData);

                    if (parsed.type === 'buzz') {
                        triggerBuzz();
                        return;
                    }

                    const sender = onlineUsers.find(u => u.uin === peerId);
                    if (sender && myKeys) {
                        const decrypted = await CryptoService.hybridDecrypt(
                            parsed.ciphertext,
                            parsed.kyberCT,
                            sodium.from_base64(sender.publicKey!),
                            myKeys.kyber.secretKey,
                            myKeys.classic.privateKey
                        );

                        setMessages(prev => [...prev, {
                            type: 'private',
                            from: sender.username,
                            fromUin: peerId,
                            text: decrypted,
                            isSecure: true
                        }]);
                    }
                } catch (e) {
                    console.error('Failed to handle P2P data', e);
                }
            }
        );

        // Init WebSocket once
        console.log('Connecting to WebSocket server...');
        const socket = new WebSocket('ws://localhost:3002');
        ws.current = socket;

        socket.onopen = () => console.log('WebSocket Connected');
        socket.onclose = () => console.warn('WebSocket Disconnected');
        socket.onerror = (e) => console.error('WebSocket Error:', e);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessageRef.current?.(data);
        };

        return () => {
            console.log('Cleaning up WebSocket...');
            socket.close();
        };
    }, []); // Only on mount

    const sendBuzz = () => {
        if (!selectedUser || buzzCooldown) return;

        const buzzMsg = JSON.stringify({ type: 'buzz' });
        if (rtc.current?.isConnected(selectedUser.uin)) {
            rtc.current.sendMessage(selectedUser.uin, buzzMsg);
        } else {
            ws.current?.send(JSON.stringify({
                type: 'direct_message',
                to: selectedUser.uin,
                text: 'buzz',
                isBuzz: true
            }));
        }

        setBuzzCooldown(true);
        setTimeout(() => setBuzzCooldown(false), 5000);
    };

    const register = async () => {
        console.log('Register process started...');
        const name = prompt('Введите ваш никнейм:');
        if (!name) return;

        try {
            console.log('Initializing sodium...');
            await sodium.ready;

            console.log('Generating key pairs...');
            const keys = await CryptoService.generateKeyPairs();
            console.log('Keys generated successfully');
            setMyKeys(keys);

            if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
                alert('Ошибка: Соединение с сервером не установлено. Пожалуйста, подождите или обновите страницу.');
                console.error('WS State:', ws.current?.readyState);
                return;
            }

            const regData = {
                type: 'register',
                username: name,
                publicKey: sodium.to_base64(keys.classic.publicKey),
                kyberPublicKey: sodium.to_base64(keys.kyber.publicKey)
            };

            console.log('Sending registration data:', regData);
            ws.current.send(JSON.stringify(regData));
        } catch (err: any) {
            console.error('Registration error:', err);
            alert('Критическая ошибка при регистрации: ' + err.message);
            setInitError('Registration failed: ' + err.message);
        }
    };

    const handleSelectUser = (user: OnlineUser | null) => {
        setSelectedUser(user);
        if (user) {
            setUnreadCounts(prev => {
                const updated = { ...prev };
                delete updated[user.uin];
                return updated;
            });
            if (user.publicKey) rtc.current?.getOrCreatePeer(user.uin, true);
        }
    };

    const sendMessage = async () => {
        if (!input || !ws.current) return;

        if (selectedUser) {
            const useP2P = rtc.current?.isConnected(selectedUser.uin);
            if (selectedUser.publicKey && selectedUser.kyberPublicKey && myKeys) {
                const encrypted = await CryptoService.hybridEncrypt(
                    input,
                    sodium.from_base64(selectedUser.publicKey),
                    sodium.from_base64(selectedUser.kyberPublicKey),
                    myKeys.classic.privateKey
                );

                if (useP2P) {
                    rtc.current?.sendMessage(selectedUser.uin, JSON.stringify({ ...encrypted, type: 'message' }));
                } else {
                    ws.current.send(JSON.stringify({
                        type: 'direct_message',
                        to: selectedUser.uin,
                        text: encrypted.ciphertext,
                        kyberCT: encrypted.kyberCT,
                        isEncrypted: true
                    }));
                }
                setMessages((prev) => [...prev, {
                    type: 'private', from: 'Я', fromUin: uin, text: input, to: selectedUser.username, isSecure: true
                }]);
            }
        } else {
            ws.current.send(JSON.stringify({ type: 'message', text: input }));
        }
        setInput('');
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '2px', boxSizing: 'border-box' }} className={isShaking ? 'shake-animation' : ''}>
            {initError && (
                <div style={{ backgroundColor: '#fee', color: 'red', padding: '20px', border: '5px solid red', margin: '20px', fontSize: '14px', zIndex: 9999 }}>
                    <h2>Критическая ошибка запуска</h2>
                    <pre>{initError}</pre>
                    <p>Попробуйте нажать Ctrl+F5 или проверьте консоль.</p>
                </div>
            )}
            {/* Title Bar (Classic style) */}
            <div className="section-header" style={{ marginBottom: '2px' }}>
                <div>NostaChat v0.4 - [{uin || 'Offline'}]</div>
                <div style={{ fontSize: '10px' }}>X</div>
            </div>

            {!uin ? (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #808080' }}>
                    <button onClick={register} style={{ padding: '20px 40px', fontSize: '12px' }}>
                        ВКЛЮЧИТЬ NOSTACHAT (SECURE)
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flex: 1, gap: '2px', overflow: 'hidden' }}>

                    {/* Sidebar */}
                    <div style={{ width: '200px', display: 'flex', flexDirection: 'column' }}>
                        <div className="section-content" style={{ marginBottom: '2px', padding: '5px' }}>
                            <div className="icon-uin">UIN: {uin}</div>
                            <div style={{ fontSize: '11px', color: '#555' }}>🔒 E2EE Active</div>
                        </div>

                        <div className="section-header" onClick={() => setContactsOpen(!contactsOpen)}>
                            {contactsOpen ? '▼' : '▶'} КОНТАКТЫ ({onlineUsers.length > 0 ? onlineUsers.length - 1 : 0})
                        </div>
                        {contactsOpen && (
                            <div className="section-content" style={{ flex: 1, overflowY: 'auto' }}>
                                <div onClick={() => handleSelectUser(null)} style={{ padding: '3px 5px', cursor: 'pointer', backgroundColor: !selectedUser ? '#e0f0ff' : 'transparent', borderBottom: '1px solid #eee' }}>
                                    📢 Общий канал
                                </div>
                                {onlineUsers.filter(u => u.uin !== uin).map(user => (
                                    <div key={user.uin} onClick={() => handleSelectUser(user)} style={{ padding: '3px 5px', cursor: 'pointer', backgroundColor: selectedUser?.uin === user.uin ? '#e0f0ff' : 'transparent', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>👤 {user.username} {rtc.current?.isConnected(user.uin) && '⚡'}</span>
                                            {unreadCounts[user.uin] > 0 && <span style={{ color: 'red', fontWeight: 'bold' }}>[{unreadCounts[user.uin]}]</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="section-header" onClick={() => setGroupsOpen(!groupsOpen)} style={{ marginTop: '2px' }}>
                            {groupsOpen ? '▼' : '▶'} ГРУППЫ И КАНАЛЫ (0)
                        </div>
                        {groupsOpen && (
                            <div className="section-content" style={{ padding: '10px', color: '#999' }}>
                                Пусто
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)' }}>
                        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{selectedUser ? `${selectedUser.username} (${selectedUser.uin})` : 'Общий чат'}</span>
                            {selectedUser && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={sendBuzz} disabled={buzzCooldown} style={{ padding: '0 5px' }}>🔔 Buzz!</button>
                                    <span style={{ fontSize: '10px' }}>{rtc.current?.isConnected(selectedUser.uin) ? 'P2P' : 'Relay'}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#fff' }}>
                            {messages
                                .filter(m => {
                                    if (!selectedUser) return m.type === 'public';
                                    if (m.type === 'public') return false;
                                    return (m.fromUin === selectedUser.uin) || (m.to === selectedUser.username);
                                })
                                .map((msg, idx) => (
                                    <div key={idx} style={{ marginBottom: '5px' }}>
                                        <span style={{ color: msg.from === 'Я' ? 'blue' : 'green', fontWeight: 'bold' }}>
                                            {msg.isSecure && '🔐 '}{msg.from}:
                                        </span>{' '}
                                        {msg.text}
                                    </div>
                                ))}
                        </div>

                        <div style={{ padding: '10px', backgroundColor: '#d4d0c8', borderTop: '1px solid #808080', display: 'flex', gap: '5px' }}>
                            <input
                                style={{ flex: 1 }}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Введите сообщение..."
                            />
                            <button onClick={sendMessage} style={{ width: '80px' }}>Send</button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default App;

