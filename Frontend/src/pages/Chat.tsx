import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, User as UserIcon, MessageSquare } from 'lucide-react';

const socket: Socket = io('http://localhost:3000');

interface Message {
    sender: string;
    message: string;
}

const Chat: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Get username from JWT token
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || 'Anonymous');
            } catch (e) {
                console.error('Error decoding token', e);
                setUsername('User');
            }
        }

        socket.on('receiveMessage', (data: Message) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.off('receiveMessage');
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (input.trim()) {
            const data = { sender: username, message: input };
            socket.emit('sendMessage', data);
            setInput('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        onLogout();
    };

    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'left' }}>
                    <h1 style={{ textAlign: 'left', margin: 0, fontSize: '1.75rem' }}>Chat Room</h1>
                    <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>
                        Real-time collaboration
                    </p>
                </div>
                <button className="btn-secondary" onClick={handleLogout} style={{ width: 'auto', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LogOut size={18} /> Logout
                </button>
            </div>

            <div className="user-badge">
                <div className="status-dot"></div>
                <UserIcon size={16} />
                <span>Logged in as <strong>{username}</strong></span>
            </div>

            <div className="chat-window">
                <div className="messages-list">
                    {messages.length === 0 ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                            <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>No messages yet. Why not say hello?</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message-bubble ${msg.sender === username ? 'message-sent' : 'message-received'}`}
                            >
                                <span className={`message-info ${msg.sender === username ? 'sent-info' : 'received-info'}`}>
                                    {msg.sender === username ? 'You' : msg.sender}
                                </span>
                                {msg.message}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Write a message..."
                        className="chat-input"
                    />
                    <button className="btn-primary send-btn" onClick={sendMessage}>
                        <Send size={18} /> Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;


