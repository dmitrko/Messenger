import { useState, useEffect, useRef } from 'react';

function App() {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [uin, setUin] = useState('');
    const ws = useRef<WebSocket | null>(null);

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
            } else if (data.type === 'message') {
                setMessages((prev) => [...prev, `${data.from}: ${data.text}`]);
            }
        };

        return () => {
            ws.current?.close();
        };
    }, []);

    const register = () => {
        const name = prompt('Введите ваш никнейм:');
        if (name) {
            ws.current?.send(JSON.stringify({ type: 'register', username: name }));
        }
    };

    const sendMessage = () => {
        if (input && ws.current) {
            ws.current.send(JSON.stringify({ type: 'message', text: input }));
            setMessages((prev) => [...prev, `Я: ${input}`]);
            setInput('');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>NostaChat - Hello World</h1>
            {!uin ? (
                <button onClick={register}>Зарегистрироваться</button>
            ) : (
                <div>
                    <p>UIN: {uin} | Niсk: {username}</p>
                    <div style={{
                        border: '1px solid #ccc',
                        height: '300px',
                        overflowY: 'scroll',
                        marginBottom: '10px',
                        padding: '10px'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx}>{msg}</div>
                        ))}
                    </div>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Пишите сообщение..."
                    />
                    <button onClick={sendMessage}>Отправить</button>
                </div>
            )}
        </div>
    );
}

export default App;
