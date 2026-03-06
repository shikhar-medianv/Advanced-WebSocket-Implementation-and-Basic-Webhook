import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, User as UserIcon, MessageSquare, Shield, Users } from 'lucide-react';

interface Message {
    id?: number;
    sender: string;
    message: string;
    isPrivate?: boolean;
    to?: string;
    createdAt?: string;
}

const Chat: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null); // null means Global Chat
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        let currentUsername = 'User';

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUsername = payload.username || 'Anonymous';
                setUsername(currentUsername);
            } catch (e) {
                console.error('Error decoding token', e);
                setUsername('User');
            }
        }

        // Initialize socket with token
        socketRef.current = io('http://localhost:3000', {
            auth: { token }
        });

        const socket = socketRef.current;

        socket.on('receiveMessage', (data: any) => {
            setMessages((prev) => {
                const newMsg = { ...data, isPrivate: false };
                if (data.id && prev.some(m => m.id === data.id)) return prev;
                return [...prev, newMsg];
            });
        });

        socket.on('receivePrivateMessage', (data: any) => {
            setMessages((prev) => {
                const newMsg = { ...data, isPrivate: true };
                if (data.id && prev.some(m => m.id === data.id)) return prev;
                return [...prev, newMsg];
            });
        });

        socket.on('userList', (users: string[]) => {
            setOnlineUsers(users.filter(u => u !== currentUsername));
        });

        socket.on('chatHistory', (data: { type: 'global' | 'private', target?: string, messages: any[] }) => {
            const formattedHistory: Message[] = data.messages.map(msg => ({
                id: msg.id,
                sender: msg.sender,
                message: msg.message,
                isPrivate: msg.receiver !== null,
                to: msg.receiver || undefined,
                createdAt: msg.createdAt
            }));

            setMessages((prev) => {
                const map = new Map();
                // We use Map to deduplicate messages by their database ID
                prev.forEach(m => { if (m.id) map.set(m.id, m); else map.set(Math.random(), m); });
                formattedHistory.forEach(m => { if (m.id) map.set(m.id, m); });
                // Convert back to array and sort by ID to maintain chronological order
                return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
            });
        });

        return () => {
            socket.off('receiveMessage');
            socket.off('receivePrivateMessage');
            socket.off('userList');
            socket.off('chatHistory');
            socket.disconnect();
        };
    }, []);

    // Request history when the selected user changes (or on initial load for global chat)
    useEffect(() => {
        if (socketRef.current && username) {
            socketRef.current.emit('requestHistory', {
                requester: username,
                targetUser: selectedUser
            });
        }
    }, [selectedUser, username]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (input.trim() && socketRef.current) {
            if (selectedUser) {
                const data = { to: selectedUser, sender: username, message: input };
                socketRef.current.emit('sendPrivateMessage', data);
            } else {
                const data = { sender: username, message: input };
                socketRef.current.emit('sendMessage', data);
            }
            setInput('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        onLogout();
    };

    return (
        <div className="glass-card chat-container-layout">
            {/* Sidebar for Online Users */}
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <Users size={20} />
                    <span>Online Users</span>
                </div>
                <div className="user-list">
                    <div
                        className={`user-item ${selectedUser === null ? 'active' : ''}`}
                        onClick={() => setSelectedUser(null)}
                    >
                        <MessageSquare size={16} />
                        <span>Global Chat</span>
                    </div>
                    {onlineUsers.map((user) => (
                        <div
                            key={user}
                            className={`user-item ${selectedUser === user ? 'active' : ''}`}
                            onClick={() => setSelectedUser(user)}
                        >
                            <UserIcon size={16} />
                            <span>{user}</span>
                            <div className="online-indicator"></div>
                        </div>
                    ))}
                    {onlineUsers.length === 0 && (
                        <p className="no-users">No other users online</p>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                <div className="chat-header">
                    <div className="header-info">
                        <h2>{selectedUser ? `Chat with ${selectedUser}` : 'Global Chat'}</h2>
                        <p className="subtitle">
                            {selectedUser ? 'Private Conversation' : 'Message everyone in the room'}
                        </p>
                    </div>
                    <button className="btn-secondary logout-mini" onClick={handleLogout}>
                        <LogOut size={18} />
                    </button>
                </div>

                <div className="user-badge-compact">
                    <Shield size={14} />
                    <span>Logged in as <strong>{username}</strong></span>
                </div>

                <div className="messages-list">
                    {messages.length === 0 ? (
                        <div className="empty-chat">
                            <MessageSquare size={48} />
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages
                            .filter(msg => {
                                if (!selectedUser) return !msg.isPrivate; // Global chat shows global messages
                                // Private chat shows messages between you and selected user
                                return msg.isPrivate && (msg.sender === selectedUser || msg.to === selectedUser || (msg.sender === username && msg.to === selectedUser));
                            })
                            .map((msg, index) => (
                                <div
                                    key={index}
                                    className={`message-bubble ${msg.sender === username ? 'message-sent' : 'message-received'} ${msg.isPrivate ? 'private-bubble' : ''}`}
                                >
                                    <span className="message-info">
                                        {msg.sender === username ? 'You' : msg.sender}
                                        {msg.isPrivate && <span className="private-tag">Private</span>}
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
                        placeholder={selectedUser ? `Message ${selectedUser}...` : "Message everyone..."}
                        className="chat-input"
                    />
                    <button className="btn-primary send-btn" onClick={sendMessage}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;


