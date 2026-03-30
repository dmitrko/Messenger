import { useState, useEffect, useRef } from 'react';

interface OnlineUser {
    uin: string;
    username: string;
}

interface Message {
    type: 'public' | 'private';
    from: string;
    fromUin: string;
    text: string;
    to?: string;
}

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [uin, setUin] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<{ [uin: string]: number }>({});

    const ws = useRef<WebSocket | null>(null);
    const selectedUserRef = useRef<OnlineUser | null>(null);

    // Update ref when state changes
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        ws.current = new WebSocket('ws://localhost:3002');

        ws.current.onopen = () => {
            console.log('Connected to server');
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'registered') {
                setUin(data.uin);
                setUsername(data.username);
            } else if (data.type === 'user_list') {
                setOnlineUsers(data.users);
            } else if (data.type === 'message') {
                setMessages((prev) => [...prev, {
                    type: 'public',
                    from: data.fromUsername,
                    fromUin: data.from,
                    text: data.text
                }]);
            } else if (data.type === 'direct_message') {
                setMessages((prev) => [...prev, {
                    type: 'private',
                    from: data.fromUsername,
                    fromUin: data.from,
                    text: data.text
                }]);

                // If this is NOT current chat, increment unread counter
                if (!selectedUserRef.current || selectedUserRef.current.uin !== data.from) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [data.from]: (prev[data.from] || 0) + 1
                    }));
                }
            }
        };

        return () => {
            ws.current?.close();
        };
    }, []); // Run ONLY once

    const register = () => {
        const name = prompt('Введите ваш никнейм:');
        if (name) {
            ws.current?.send(JSON.stringify({ type: 'register', username: name }));
        }
    };

    const handleSelectUser = (user: OnlineUser | null) => {
        setSelectedUser(user);
        if (user) {
            // Clear unread count for this user
            setUnreadCounts(prev => {
                const updated = { ...prev };
                delete updated[user.uin];
                return updated;
            });
        }
    };

    const sendMessage = () => {
        if (!input || !ws.current) return;

        if (selectedUser) {
            // Send private message
            ws.current.send(JSON.stringify({
                type: 'direct_message',
                to: selectedUser.uin,
                text: input
            }));
            setMessages((prev) => [...prev, {
                type: 'private',
                from: 'Я',
                fromUin: uin,
                text: input,
                to: selectedUser.username
            }]);
        } else {
            // Send public message
            ws.current.send(JSON.stringify({ type: 'message', text: input }));
        }

        setInput('');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Tahoma, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <h1 style={{ margin: '0 0 10px 0' }}>NostaChat <span style={{ fontSize: '0.5em', color: '#888' }}>v0.2</span></h1>

            {!uin ? (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <button onClick={register} style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}>
                        Войти в сеть
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden', border: '1px solid #ccc' }}>

                    {/* Sidebar: Online Users */}
                    <div style={{ width: '220px', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f0f0' }}>
                        <div style={{ padding: '10px', backgroundColor: '#e0e0e0', borderBottom: '1px solid #ccc' }}>
                            <div>Ваш UIN: <strong style={{ color: '#006600' }}>{uin}</strong></div>
                            <div style={{ fontSize: '0.9em', color: '#555' }}>{username}</div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '10px', fontWeight: 'bold', fontSize: '0.9em', color: '#666' }}>КОНТАКТЫ ({onlineUsers.length})</div>
                            <div
                                onClick={() => handleSelectUser(null)}
                                style={{
                                    padding: '8px 15px',
                                    cursor: 'pointer',
                                    backgroundColor: !selectedUser ? '#fff' : 'transparent',
                                    borderBottom: '1px solid #ddd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                📢 <span>Общий чат</span>
                            </div>
                            {onlineUsers.filter(u => u.uin !== uin).map(user => (
                                <div
                                    key={user.uin}
                                    onClick={() => handleSelectUser(user)}
                                    style={{
                                        padding: '8px 15px',
                                        cursor: 'pointer',
                                        backgroundColor: selectedUser?.uin === user.uin ? '#fff' : 'transparent',
                                        borderBottom: '1px solid #ddd',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: selectedUser?.uin === user.uin ? 'bold' : 'normal' }}>👤 {user.username}</div>
                                        <div style={{ fontSize: '0.75em', color: '#888' }}>UIN: {user.uin}</div>
                                    </div>
                                    {unreadCounts[user.uin] > 0 && (
                                        <div style={{
                                            backgroundColor: '#ff3b30',
                                            color: '#fff',
                                            borderRadius: '10px',
                                            padding: '2px 8px',
                                            fontSize: '0.8em',
                                            fontWeight: 'bold'
                                        }}>
                                            {unreadCounts[user.uin]}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
                        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                            {selectedUser ? `Приватный чат с ${selectedUser.username} (${selectedUser.uin})` : '📢 Общий канал'}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                            {messages
                                .filter(m => {
                                    if (!selectedUser) return m.type === 'public';
                                    if (m.type === 'public') return false;
                                    return (m.fromUin === selectedUser.uin) || (m.to === selectedUser.username);
                                })
                                .map((msg, idx) => (
                                    <div key={idx} style={{ marginBottom: '10px', lineHeight: '1.4' }}>
                                        <span style={{ color: msg.from === 'Я' ? '#0000ff' : '#008000', fontWeight: 'bold' }}>
                                            {msg.from}:
                                        </span>{' '}
                                        <span>{msg.text}</span>
                                        {msg.type === 'private' && msg.from !== 'Я' && (
                                            <span style={{ color: '#999', fontSize: '0.75em', marginLeft: '5px' }}>[приватно]</span>
                                        )}
                                    </div>
                                ))}
                        </div>

                        <div style={{ padding: '15px', borderTop: '1px solid #ccc', display: 'flex', gap: '10px', backgroundColor: '#f0f0f0' }}>
                            <input
                                style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder={selectedUser ? `Написать ${selectedUser.username}...` : "Написать в общий чат..."}
                            />
                            <button
                                onClick={sendMessage}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#e1e1e1',
                                    border: '1px solid #999',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Отправить
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default App;
