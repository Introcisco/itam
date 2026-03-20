import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Server, LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Force light theme on login page, restore original theme on unmount
    useEffect(() => {
        const prev = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        return () => {
            if (prev) {
                document.documentElement.setAttribute('data-theme', prev);
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        };
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username || !password) {
            setError('请输入用户名和密码');
            return;
        }
        setLoading(true);
        // Simulate a tiny delay for UX
        await new Promise(r => setTimeout(r, 400));
        const ok = await login(username, password);
        setLoading(false);
        if (ok) {
            navigate('/', { replace: true });
        } else {
            setError('用户名或密码错误，请重试');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Logo */}
                <div className="login-logo">
                    <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 22 }}>
                        <Server size={24} />
                    </div>
                    <div>
                        <h1 className="login-title">ITAM</h1>
                        <p className="login-subtitle">IT 资产管理系统</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">用户名</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="请输入用户名"
                            value={username}
                            onChange={e => { setUsername(e.target.value); setError(''); }}
                            autoFocus
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">密码</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="请输入密码"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                autoComplete="current-password"
                                style={{ paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{
                                    position: 'absolute', right: 10, top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', display: 'flex', padding: 4
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 4, height: 40, fontSize: 14 }}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="login-spinner" />
                        ) : (
                            <><LogIn size={16} /> 登 录</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
