import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ChatMessage } from './db';

interface ChatWindowProps {
    user: { uin: string; username: string; publicKey?: string; kyberPublicKey?: string };
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onBuzz?: () => void;
    buzzCooldown?: boolean;
    onClose: () => void;
    onFocus: () => void;
    isShaking?: boolean;
    zIndex: number;
    initialPosition?: { x: number; y: number };
}

const ChatWindow: React.FC<ChatWindowProps> = ({
    user,
    messages,
    onSendMessage,
    onBuzz,
    buzzCooldown,
    onClose,
    onFocus,
    isShaking,
    zIndex,
    initialPosition = { x: 100, y: 100 }
}) => {
    const [input, setInput] = useState('');
    const displayRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (displayRef.current) {
            displayRef.current.scrollTop = displayRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <Draggable
            handle=".chat-titlebar"
            defaultPosition={initialPosition}
            onStart={onFocus}
        >
            <div
                className={`chat-window ${isShaking ? 'shake-animation' : ''}`}
                style={{ zIndex }}
                onClick={onFocus}
            >
                {/* Title Bar */}
                <div className="chat-titlebar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <img src="/assets/icq-classic/flower.BMP" style={{ width: '13px', height: '13px' }} alt="" />
                        <span>{user.username} (Online) - Message Session</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                        <div className="chat-titlebar-btn" style={{ fontWeight: 'bold' }}>_</div>
                        <div className="chat-titlebar-btn" style={{ fontSize: '10px' }}>□</div>
                        <div className="chat-titlebar-btn" onClick={onClose} style={{ fontWeight: 'bold' }}>X</div>
                    </div>
                </div>

                {/* Info Bar */}
                <div className="chat-info-bar">
                    <div className="chat-info-field">
                        <span>To: ICQ#</span>
                        <div className="chat-info-value">{user.uin}</div>
                    </div>
                    <div className="chat-info-field">
                        <img src="/assets/icq-classic/flower.BMP" style={{ width: '16px', height: '16px' }} alt="" />
                        <span>Nick:</span>
                        <div className="chat-info-value" style={{ minWidth: '100px' }}>{user.username}</div>
                    </div>
                    <div className="chat-info-field">
                        <span>EMail:</span>
                        <div className="chat-info-value">N\A</div>
                    </div>
                </div>

                {/* Messages Display */}
                <div className="chat-display" ref={displayRef}>
                    {messages.map((m, idx) => (
                        <div key={idx} style={{ marginBottom: '8px' }}>
                            <div style={{ color: m.fromUin === user.uin ? 'red' : 'blue', fontWeight: 'bold', fontSize: '11px' }}>
                                {m.fromUsername} ({new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}):
                            </div>
                            <div style={{ paddingLeft: '5px' }}>{m.text}</div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="chat-toolbar">
                    <div style={{ fontSize: '10px', marginRight: '10px' }}>Chars: {input.length}</div>
                    <button title="Sound">🔊</button>
                    {onBuzz && (
                        <button
                            onClick={onBuzz}
                            disabled={buzzCooldown}
                            title={buzzCooldown ? "Wait..." : "Send Buzz (Гудок)"}
                            style={{ color: buzzCooldown ? '#888' : 'red', fontWeight: 'bold' }}
                        >
                            🔔 Buzz!
                        </button>
                    )}
                    <button title="Spell Check">ABC</button>
                    <button title="Smilies">😊</button>
                    <button title="Format">T</button>
                    <button title="Color">🎨</button>
                    <button title="History" style={{ marginLeft: 'auto' }}>History</button>
                </div>

                {/* Input Area */}
                <div className="chat-input-area">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                </div>

                {/* Footer Controls */}
                <div className="chat-footer">
                    <div className="chat-footer-left">
                        <button style={{ width: '60px' }}>Cancel</button>
                        <button style={{ width: '60px' }}>Talk</button>
                    </div>

                    <div className="chat-footer-right">
                        <div style={{ fontSize: '10px', color: '#666', marginRight: '5px' }}>Send by:</div>
                        <div className="send-by-labels">
                            <label><input type="checkbox" defaultChecked /> ICQ</label>
                            <label><input type="checkbox" disabled /> SMS</label>
                            <label><input type="checkbox" disabled /> E-mail</label>
                        </div>
                        <button className="btn-talk" onClick={handleSend} disabled={!input.trim()}>Send</button>
                    </div>
                </div>
            </div>
        </Draggable>
    );
};

export default ChatWindow;
