import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import api from '../api/axios';

const Register = () => {

    const [formData, setFormData] = useState({ username: '', email: '', password: '' })
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            await api.post('/auth/register', formData)
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card">
            <h1>Join the Chat</h1>
            <p className="subtitle">Create your account to start chatting</p>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Username</label>
                    <div className="input-wrapper">
                        <User />
                        <input
                            type="text"
                            placeholder="John Doe"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Email Address</label>
                    <div className="input-wrapper">
                        <Mail />
                        <input
                            type="email"
                            placeholder="john@example.com"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <div className="input-wrapper">
                        <Lock />
                        <input
                            type="password"
                            placeholder="••••••••"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                </div>

                {error && <p className="error-message">{error}</p>}

                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" style={{ margin: 'auto' }} /> : 'Create Account'}
                </button>
            </form>

            <div className="footer-text">
                Already have an account? <Link to="/login">Sign In</Link>
            </div>
        </div>
    );
};

export default Register;
