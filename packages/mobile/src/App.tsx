import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList } from 'react-native';

const App = () => {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [uin, setUin] = useState('');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Note: use machine's local IP if testing on real device
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
        ws.current?.send(JSON.stringify({ type: 'register', username: 'MobileUser' }));
    };

    const sendMessage = () => {
        if (input && ws.current) {
            ws.current.send(JSON.stringify({ type: 'message', text: input }));
            setMessages((prev) => [...prev, `Я: ${input}`]);
            setInput('');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>NostaChat Mobile</Text>
            {!uin ? (
                <Button title="Зарегистрироваться" onPress={register} />
            ) : (
                <>
                    <Text>UIN: {uin} | Ник: {username}</Text>
                    <FlatList
                        data={messages}
                        renderItem={({ item }) => <Text>{item}</Text>}
                        keyExtractor={(_, index) => index.toString()}
                        style={styles.list}
                    />
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Пишите сообщение..."
                    />
                    <Button title="Отправить" onPress={sendMessage} />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 50 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    list: { flex: 1, marginVertical: 20, borderTopWidth: 1, borderColor: '#ccc' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 },
});

export default App;
