import { useState, useEffect, useRef } from 'react';
import { CryptoService } from '@nostachat/shared';
import { WebRTCService } from './services/webrtc';
import { CONFIG } from './config';
import sodium_ from 'libsodium-wrappers';
const sodium = (sodium_ as any).default || sodium_;
import { Buffer } from 'buffer';
import logo from './assets/logo.png';
import { db, ChatMessage, Contact } from './db';
import ChatWindow from './ChatWindow';
import { useLiveQuery } from 'dexie-react-hooks';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer; (window as any).global = window; (window as any).process = { env: {}, browser: true };
}

interface OnlineUser { uin: string; username: string; publicKey?: string; kyberPublicKey?: string; }
interface WindowData { uin: string; zIndex: number; position: { x: number; y: number }; }
type ZoneName = 'family' | 'work' | 'friends' | 'other';

function App() {
    const [username, setUsername] = useState('');
    const [uin, setUin] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<{ [uin: string]: number }>({});
    const [roomKey, setRoomKey] = useState<Uint8Array | null>(null);
    const [loginNickname, setLoginNickname] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [buzzCooldown, setBuzzCooldown] = useState(false);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
    const [wsError, setWsError] = useState<string | null>(null);

    // Authorization Dialogs states
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addFormUin, setAddFormUin] = useState('');
    const [addFormMsg, setAddFormMsg] = useState('Hi, I\'d like to add you to my contact list!');
    const [pendingRequest, setPendingRequest] = useState<{ fromUin: string, fromUsername: string, reason: string } | null>(null);

    const [zoneModes, setZoneModes] = useState<{ [K in ZoneName]: 'active' | 'archive' }>({ family: 'active', work: 'active', friends: 'active', other: 'active' });
    const [zoneCollapsed, setZoneCollapsed] = useState<{ [K in ZoneName]: boolean }>({ family: true, work: true, friends: false, other: false });
    const [windows, setWindows] = useState<WindowData[]>([]);
    const [maxZIndex, setMaxZIndex] = useState(100);

    const allStoredMessages = useLiveQuery<ChatMessage[]>(() => uin ? db.messages.where('ownerUin').equals(uin).toArray() : Promise.resolve([]), [uin]) || [];
    const allContacts = useLiveQuery<Contact[]>(() => uin ? db.contacts.where('ownerUin').equals(uin).toArray() : Promise.resolve([]), [uin]) || [];

    const [myKeys, setMyKeys] = useState<any>(null);
    const onlineUsersRef = useRef<OnlineUser[]>([]);
    const myKeysRef = useRef<any>(null);
    const roomKeyRef = useRef<Uint8Array | null>(null);
    const uinRef = useRef<string>('');
    const ws = useRef<WebSocket | null>(null);
    const rtc = useRef<WebRTCService | null>(null);
    const prevOnlineUinsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        onlineUsersRef.current = onlineUsers; myKeysRef.current = myKeys; uinRef.current = uin; roomKeyRef.current = roomKey;
        if (uin && onlineUsers.length > 0) {
            const newlyOnline = onlineUsers.filter(u => u.uin !== uin && !prevOnlineUinsRef.current.has(u.uin));
            if (newlyOnline.length > 0 && prevOnlineUinsRef.current.size > 0) { playSound('Global'); }
            prevOnlineUinsRef.current = new Set(onlineUsers.map(u => u.uin));
        }
    }, [onlineUsers, uin]);

    const playSound = (name: string) => { const audio = new Audio(`/sounds/${name}.wav`); audio.play().catch(() => { }); };
    const triggerBuzz = () => { setIsShaking(true); playSound('ChatBeep'); setTimeout(() => setIsShaking(false), 800); };

    const onAuthRequestReceived = async (fromUin: string, fromUsername: string, reason: string) => {
        console.log('--- Incoming Auth Request ---', { fromUin, fromUsername, reason });
        if (!uinRef.current) return;

        try {
            const contact = await db.contacts.get([uinRef.current, fromUin]);
            if (contact && contact.isBlocked) {
                console.log('Blocked user request ignored:', fromUin);
                return;
            }
        } catch (e) { console.error('Dexie error during block check', e); }

        setPendingRequest({ fromUin, fromUsername, reason });
        playSound('Contact');
    };

    const handleAuthAction = async (action: 'authorize' | 'decline' | 'block') => {
        if (!pendingRequest || !uin) return;
        const { fromUin, fromUsername } = pendingRequest;

        if (action === 'authorize') {
            const online = onlineUsers.find(u => u.uin === fromUin);
            // Add them to MY contact list
            await db.contacts.put({ ownerUin: uin, uin: fromUin, username: online?.username || fromUsername, publicKey: online?.publicKey, kyberPublicKey: online?.kyberPublicKey, zone: 'friends', isArchived: false, isBlocked: false, lastSeen: Date.now() });
            // Tell THEM to add us back (bidirectional sync)
            ws.current?.send(JSON.stringify({ type: 'direct_message', to: fromUin, isAuthResponse: true, authorized: true, fromUsername: username }));
        } else if (action === 'block') {
            await db.contacts.put({ ownerUin: uin, uin: fromUin, username: fromUsername, zone: 'friends', isArchived: false, isBlocked: true, lastSeen: Date.now() });
            alert('User blocked.');
        }
        setPendingRequest(null);
    };

    const submitAddRequest = () => {
        const target = addFormUin.trim();
        if (!target || !uin || target === uin) return;
        console.log('Sending Add Request to:', target);
        ws.current?.send(JSON.stringify({ type: 'direct_message', to: target, isAuthRequest: true, fromUsername: username, reason: addFormMsg }));
        setShowAddDialog(false); setAddFormUin(''); setAddFormMsg('Hi, I\'d like to add you!');
    };

    const saveMessageToDB = async (msg: Omit<ChatMessage, 'id' | 'ownerUin'>) => {
        if (!uinRef.current) return;
        const owner = uinRef.current;
        await db.messages.add({ ...msg, ownerUin: owner } as ChatMessage);
        const contact = await db.contacts.get([owner, msg.fromUin]);
        if (contact && contact.isArchived) { await db.contacts.update([owner, msg.fromUin], { isArchived: false }); }
    };

    const onMessageRef = useRef<((msg: any) => void) | null>(null);
    onMessageRef.current = async (data: any) => {
        if (data.type === 'registered') {
            setUin(data.uin); setUsername(data.username); setIsRegistering(false); 
            playSound('Startup');
            // Update system window title with UIN
            (window as any).electron?.send('update-title', `ICQ — ${data.username} [${data.uin}]`);

            if (myKeysRef.current) {
                localStorage.setItem('nostachat_auth', JSON.stringify({
                    uin: data.uin,
                    username: data.username,
                    keys: myKeysRef.current,
                    publicKeyBase64: sodium.to_base64(myKeysRef.current.classic.publicKey),
                    kyberPublicKeyBase64: sodium.to_base64(myKeysRef.current.kyber.publicKey)
                }));
            }

            if (data.sealedRoomKey && myKeysRef.current) {
                try {
                    const decryptedKey = await CryptoService.unsealRoomKey(data.sealedRoomKey, myKeysRef.current.classic.publicKey, myKeysRef.current.classic.privateKey);
                    roomKeyRef.current = decryptedKey; setRoomKey(decryptedKey);
                } catch (e) { console.error('Key decryption failed', e); }
            }
        } else if (data.type === 'user_list') { setOnlineUsers(data.users); }
        else if (data.type === 'direct_message') {
            const blocked = await db.contacts.get([uinRef.current, data.from]);
            if (blocked && blocked.isBlocked) {
                console.log('Message from blocked user ignored:', data.from);
                return;
            }

            if (data.isAuthRequest) {
                onAuthRequestReceived(data.from, data.fromUsername, data.reason);
                return;
            }
            if (data.isAuthResponse && data.authorized) {
                const online = onlineUsersRef.current.find(u => u.uin === data.from);
                await db.contacts.put({ ownerUin: uinRef.current, uin: data.from, username: online?.username || data.fromUsername, publicKey: online?.publicKey, kyberPublicKey: online?.kyberPublicKey, zone: 'friends', isArchived: false, isBlocked: false, lastSeen: Date.now() });
                playSound('Contact');
                return;
            }

            if (data.text) {
                let messageText = data.text;
                if (data.isBuzz) { triggerBuzz(); messageText = '🔔 BUZZ!'; }
                else {
                    const sender = onlineUsersRef.current.find(u => u.uin === data.from);
                    if (data.isEncrypted && sender && myKeysRef.current) {
                        try { messageText = await CryptoService.hybridDecrypt(data.text, data.kyberCT, sodium.from_base64(sender.publicKey!), myKeysRef.current.kyber.secretKey, myKeysRef.current.classic.privateKey); }
                        catch (e) { messageText = '[Decrypted Error]'; }
                    }
                }
                saveMessageToDB({ chatId: data.from, fromUin: data.from, fromUsername: data.fromUsername || 'User', text: messageText, timestamp: Date.now(), isSecure: true, type: 'private' });
                handleIncomingChat(data.from); if (!data.isBuzz) playSound('Message');
            }
        } else if (data.type === 'message') {
            if (data.from === uinRef.current) return;
            let text = data.text; let isSecure = false;
            if (data.isEncrypted && roomKeyRef.current) { try { text = await CryptoService.decryptSymmetric(data.text, roomKeyRef.current); isSecure = true; } catch (e) { text = '[Decrypted Error]'; } }
            saveMessageToDB({ chatId: 'public', fromUin: data.from, fromUsername: data.fromUsername, text, timestamp: Date.now(), isSecure, type: 'public' });
            playSound('Message');
        } else if (data.type === 'signal') { rtc.current?.handleSignal(data.from, data.signal); }
    };

    useEffect(() => {
        rtc.current = new WebRTCService(
            (peerId, signal) => ws.current?.send(JSON.stringify({ type: 'signal', to: peerId, signal })),
            async (peerId, encryptedData) => {
                try {
                    const parsed = JSON.parse(encryptedData);
                    if (parsed.type === 'buzz') { triggerBuzz(); }
                    else if (myKeysRef.current) {
                        const sender = onlineUsersRef.current.find(u => u.uin === peerId);
                        if (sender) {
                            const decrypted = await CryptoService.hybridDecrypt(parsed.ciphertext, parsed.kyberCT, sodium.from_base64(sender.publicKey!), myKeysRef.current.kyber.secretKey, myKeysRef.current.classic.privateKey);
                            saveMessageToDB({ chatId: peerId, fromUin: peerId, fromUsername: sender.username, text: decrypted, timestamp: Date.now(), isSecure: true, type: 'private' });
                            playSound('Message');
                        }
                    }
                    handleIncomingChat(peerId);
                } catch (e) { console.error('P2P Error', e); }
            }
        );
        const socket = new WebSocket(CONFIG.WS_URL); 
        ws.current = socket; 
        
        socket.onopen = () => {
            setWsStatus('connected');
            setWsError(null);
        };

        socket.onmessage = (event) => onMessageRef.current?.(JSON.parse(event.data)); 
        
        socket.onerror = (err) => {
            setWsStatus('error');
            setWsError('Connection failed: ' + CONFIG.WS_URL);
            console.error('WebSocket Error:', err);
        };

        socket.onclose = () => {
            setWsStatus('closed');
        };

        return () => socket.close();
    }, []);

    const sendMessage = async (toUin: string, text: string) => {
        if (!ws.current || !uin) return;
        if (toUin === 'public') {
            if (roomKey) { const encrypted = await CryptoService.encryptSymmetric(text, roomKey); ws.current.send(JSON.stringify({ type: 'message', text: encrypted.ciphertext, isEncrypted: true })); } else { ws.current.send(JSON.stringify({ type: 'message', text })); }
            saveMessageToDB({ chatId: 'public', fromUin: uin, fromUsername: 'Me', text, timestamp: Date.now(), isSecure: !!roomKey, type: 'public' });
        } else {
            const target = onlineUsers.find(u => u.uin === toUin);
            if (target?.publicKey && target?.kyberPublicKey && myKeys) {
                const encrypted = await CryptoService.hybridEncrypt(text, sodium.from_base64(target.publicKey), sodium.from_base64(target.kyberPublicKey), myKeys.classic.privateKey);
                if (rtc.current?.isConnected(toUin)) { rtc.current.sendMessage(toUin, JSON.stringify({ ...encrypted, type: 'message' })); } else { ws.current.send(JSON.stringify({ type: 'direct_message', to: toUin, text: encrypted.ciphertext, kyberCT: encrypted.kyberCT, isEncrypted: true })); }
                saveMessageToDB({ chatId: toUin, fromUin: uin, fromUsername: 'Me', text, timestamp: Date.now(), isSecure: true, type: 'private' });
                const contact = await db.contacts.get([uin, toUin]);
                if (contact && contact.isArchived) { await db.contacts.update([uin, toUin], { isArchived: false }); }
            }
        }
        playSound('MsgSent');
    };

    const sendBuzz = (toUin: string) => {
        if (buzzCooldown || toUin === 'public') return;
        if (rtc.current?.isConnected(toUin)) { rtc.current.sendMessage(toUin, JSON.stringify({ type: 'buzz' })); } else { ws.current?.send(JSON.stringify({ type: 'direct_message', to: toUin, text: 'buzz', isBuzz: true })); }
        setBuzzCooldown(true); setTimeout(() => setBuzzCooldown(false), 5000);
    };

    const handleIncomingChat = (remoteUin: string) => {
        setWindows(prev => {
            if (prev.some(w => w.uin === remoteUin)) return prev;
            return [...prev, { uin: remoteUin, zIndex: maxZIndex + 1, position: { x: 250 + prev.length * 20, y: 50 + prev.length * 20 } }];
        });
        setMaxZIndex(prev => prev + 1);
        setUnreadCounts(prev => ({ ...prev, [remoteUin]: (prev[remoteUin] || 0) + 1 }));
    };

    const register = async () => {
        if (!loginNickname.trim()) { alert('Enter UIN / Account!'); return; }
        if (wsStatus !== 'connected') { alert('Not connected to server.'); return; }
        
        setIsRegistering(true);
        try {
            await sodium.ready;
            const keys = await CryptoService.generateKeyPairs();
            setMyKeys(keys);
            ws.current?.send(JSON.stringify({
                type: 'register',
                uin: loginNickname,
                username: loginNickname,
                publicKey: sodium.to_base64(keys.classic.publicKey),
                kyberPublicKey: sodium.to_base64(keys.kyber.publicKey)
            }));
        } catch (err: any) { 
            alert('Auth failed: ' + (err.message || 'Unknown error')); 
            setIsRegistering(false); 
        }
    };

    // AUTO-LOGIN DISABLED: Old sessions with long UINs conflict with the new 2-digit UIN system.
    // The localStorage is cleared on startup to force fresh registration.
    // TODO: Re-enable auto-login once the UIN system is stable.
    useEffect(() => {
        localStorage.removeItem('nostachat_auth');
    }, []);

    const [dragUin, setDragUin] = useState<string | null>(null);

    const SidebarZone = ({ name, title }: { name: ZoneName, title: string }) => {
        const mode = zoneModes[name]; 
        const collapsed = zoneCollapsed[name];
        const zoneContacts = allContacts.filter(c => c.zone === name && c.isArchived === (mode === 'archive') && !c.isBlocked);

        return (
            <div
                style={{ display: 'flex', flexDirection: 'column' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                    e.preventDefault();
                    if (dragUin) { await db.contacts.update([uin, dragUin], { zone: name }); setDragUin(null); }
                }}
            >
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', flex: 1 }} onClick={() => setZoneCollapsed(prev => ({ ...prev, [name]: !prev[name] }))}>
                        <span>{collapsed ? '▶' : '▼'}</span>
                        <span style={{ fontWeight: 'bold' }}>{title} ({zoneContacts.length})</span>
                    </div>
                    
                    <div className="zone-toggle-container" onClick={(e) => { e.stopPropagation(); setZoneModes(prev => ({ ...prev, [name]: prev[name] === 'active' ? 'archive' : 'active' })) }}>
                        <div className={`zone-toggle-btn ${mode === 'active' ? 'active' : ''}`}>Active</div>
                        <div className={`zone-toggle-btn ${mode === 'archive' ? 'active' : ''}`}>Archive</div>
                    </div>
                </div>
                
                {!collapsed && (
                    <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #808080', minHeight: '10px' }}>
                        {zoneContacts.map(contact => {
                            const isOnline = onlineUsers.some(u => u.uin === contact.uin);
                            return (
                                <div
                                    key={contact.uin}
                                    draggable
                                    onDragStart={() => setDragUin(contact.uin)}
                                    onDragEnd={() => setDragUin(null)}
                                    className="sidebar-contact-item"
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <div onClick={() => openChat(contact.uin)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <img src="/assets/icq-classic/flower.png" style={{ width: '12px', height: '12px', filter: isOnline ? 'none' : 'grayscale(100%)' }} />
                                        <span style={{ color: isOnline ? '#000' : '#808080' }}>{contact.username}</span>
                                        {unreadCounts[contact.uin] > 0 && <span style={{ color: 'red', fontWeight: 'bold', fontSize: '10px' }}>[{unreadCounts[contact.uin]}]</span>}
                                    </div>
                                    
                                    <button 
                                        className="btn-archive-mini" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            db.contacts.update([uin, contact.uin], { isArchived: !contact.isArchived }); 
                                        }}
                                        title={contact.isArchived ? "Move to Active" : "Move to Archive"}
                                    >
                                        {contact.isArchived ? '↑' : '↓'}
                                    </button>
                                </div>
                            );
                        })}
                        {zoneContacts.length === 0 && <div style={{ padding: '4px', fontSize: '10px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>No {mode} contacts</div>}
                    </div>
                )}
            </div>
        );
    };

    const openChat = (remoteUin: string) => {
        setWindows(prev => {
            const exists = prev.find(w => w.uin === remoteUin);
            if (exists) return prev.map(w => w.uin === remoteUin ? { ...w, zIndex: maxZIndex + 1 } : w);
            return [...prev, { uin: remoteUin, zIndex: maxZIndex + 1, position: { x: 300, y: 100 } }];
        });
        setMaxZIndex(prev => prev + 1);
        setUnreadCounts(prev => { const updated = { ...prev }; delete updated[remoteUin]; return updated; });
    };

    const closeWindow = (uin: string) => setWindows(prev => prev.filter(w => w.uin !== uin));
    const focusWindow = (uin: string) => { setWindows(prev => prev.map(w => w.uin === uin ? { ...w, zIndex: maxZIndex + 1 } : w)); setMaxZIndex(prev => prev + 1); };

    if (!uin) {
        return (
            <div className="login-container">
                <div className="login-menu-bar">
                    <span className="login-menu-item">Главное</span>
                    <span className="login-menu-item">Контакты</span>
                </div>

                <div className="login-body">
                    {isRegistering ? (
                        <div style={{ textAlign: 'center', margin: '40px' }}>
                            <img src="/assets/icq-classic/connecting_01.gif" style={{ width: '80px' }} />
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>Вход в систему...</div>
                        </div>
                    ) : (
                        <>
                            <img src="./assets/icq-classic/flower_v2.png" className="login-flower-large" style={{ backgroundColor: '#f0f0f0' }} />
                            
                            <div className="login-fields">
                                <div className="login-input-wrapper">
                                    <label className="login-label">Номер ICQ/E-mail:</label>
                                    <div className="uin-input-container">
                                        <input 
                                            type="text" 
                                            className="uin-input-field"
                                            value={loginNickname} 
                                            onChange={(e) => setLoginNickname(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && register()}
                                        />
                                        <div className="uin-dropdown-btn">▼</div>
                                    </div>
                                    <span className="login-link">Регистрация</span>
                                </div>

                                <div className="login-input-wrapper" style={{ marginTop: '5px' }}>
                                    <label className="login-label">Пароль:</label>
                                    <input 
                                        type="password" 
                                        className="password-input-field"
                                        defaultValue="********"
                                    />
                                    <span className="login-link">Забыли пароль?</span>
                                </div>

                                <div className="login-checkbox-group">
                                    <label className="login-checkbox-item">
                                        <input type="checkbox" defaultChecked /> Сохранить пароль
                                    </label>
                                    <label className="login-checkbox-item">
                                        <input type="checkbox" /> Автоматический вход
                                    </label>
                                    <label className="login-checkbox-item">
                                        <input type="checkbox" defaultChecked /> Запускать ICQ при старте
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="login-footer">
                    <button className="btn-signin-gold" onClick={register} disabled={isRegistering}>
                        <img src="/assets/icq-classic/flower.png" className="flower-icon-tiny" />
                        Войти
                    </button>
                </div>

                <div className="login-status-bar">
                    <div className={`status-dot ${wsStatus}`}></div>
                    <span>
                        {wsStatus === 'connected' ? 'Подключено к VPS' : 
                         wsStatus === 'connecting' ? 'Подключение к серверу...' : 
                         'Ошибка: Сервер недоступен'}
                    </span>
                    {wsError && <span style={{ color: 'red', marginLeft: 'auto' }}>🛈</span>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }} className={isShaking ? 'shake-animation' : ''}>
            {/* Main ICQ Sidebar */}
            <div style={{ width: '220px', height: '100%', display: 'flex', flexDirection: 'column', borderRight: '2px solid #808080', backgroundColor: '#d4d0c8', zIndex: 50, overflowY: 'auto' }}>
                <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #808080', backgroundColor: '#d4d0c8' }}>
                    <img src="/assets/icq-classic/flower_v2.png" style={{ width: '28px', height: '28px', backgroundColor: '#d4d0c8' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{username}</div>
                        <div style={{ color: 'green', fontSize: '10px' }}>● Online</div>
                        <div style={{ color: '#555', fontSize: '9px', userSelect: 'all', cursor: 'text' }}>UIN: <b>{uin}</b></div>
                    </div>
                    <button
                        title="Sign out"
                        onClick={() => { localStorage.removeItem('nostachat_auth'); window.location.reload(); }}
                        style={{ width: '18px', height: '18px', padding: 0, fontSize: '10px', lineHeight: '16px', border: '1px solid #808080', background: '#e0deda', cursor: 'pointer', flexShrink: 0 }}
                    >✕</button>
                </div>
                <div onClick={() => openChat('public')} className="sidebar-contact-item" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>📢 Main Channel</div>
                <SidebarZone name="family" title="FAMILY" />
                <SidebarZone name="friends" title="FRIENDS" />
                <SidebarZone name="work" title="WORK" />
                <SidebarZone name="other" title="OTHER" />
                <div style={{ marginTop: 'auto', padding: '10px', borderTop: '1px solid #808080', backgroundColor: '#d4d0c8' }}>
                    <button onClick={() => setShowAddDialog(true)} style={{ width: '100%', fontWeight: 'bold' }}>Add Contact</button>
                </div>
            </div>

            {/* Content Area / Windows */}
            <div style={{ position: 'absolute', top: 0, left: 220, right: 0, bottom: 0, overflow: 'hidden' }}>
                {windows.map(win => {
                    const targetUser = (win.uin === 'public' ? { uin: 'public', username: 'Main Channel' } : (allContacts.find(u => u.uin === win.uin) || { uin: win.uin, username: 'Unknown' })) as any;
                    const winMessages = allStoredMessages.filter(m => m.chatId === win.uin);
                    return (<ChatWindow key={win.uin} user={targetUser} messages={winMessages} onSendMessage={(txt) => sendMessage(win.uin, txt)} onBuzz={() => sendBuzz(win.uin)} buzzCooldown={win.uin === 'public' || buzzCooldown} onClose={() => closeWindow(win.uin)} onFocus={() => focusWindow(win.uin)} zIndex={win.zIndex} initialPosition={win.position} />);
                })}
            </div>

            {/* Custom Dialog: Add Contact Form */}
            {showAddDialog && (
                <div className="overlay" style={{ pointerEvents: 'auto' }} onClick={() => setShowAddDialog(false)}>
                    <div className="auth-dialog-window" onClick={e => e.stopPropagation()}>
                        <div className="chat-titlebar"><span>Add New Contact</span></div>
                        <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="login-input-group"><label>Target UIN:</label><input type="text" value={addFormUin} onChange={e => setAddFormUin(e.target.value)} placeholder="Enter #UIN" /></div>
                            <div className="login-input-group"><label>Introduction Message:</label>
                                <textarea style={{ height: '80px', fontSize: '11px', resize: 'none' }} value={addFormMsg} onChange={e => setAddFormMsg(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => setShowAddDialog(false)}>Cancel</button>
                                <button className="btn-talk" onClick={submitAddRequest}>Send Request</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Dialog: Incoming Request */}
            {pendingRequest && (
                <div className="overlay" style={{ pointerEvents: 'auto' }}>
                    <div className="auth-dialog-window" style={{ borderColor: 'red' }}>
                        <div className="chat-titlebar" style={{ background: 'darkred' }}><span>Incoming Authorization Request!</span></div>
                        <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>UIN #{pendingRequest.fromUin} ({pendingRequest.fromUsername}) wants to add you!</div>
                            <div style={{ backgroundColor: '#fff', border: '1px inset #808080', padding: '8px', minHeight: '60px', fontSize: '11px' }}>{pendingRequest.reason}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                                <button style={{ flex: 1, backgroundColor: '#90ee90' }} onClick={() => handleAuthAction('authorize')}>Authorize</button>
                                <button style={{ flex: 1 }} onClick={() => handleAuthAction('decline')}>Decline</button>
                                <button style={{ flex: 1, color: 'white', backgroundColor: '#555' }} onClick={() => handleAuthAction('block')}>Block / Ignore</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
