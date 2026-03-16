import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Monitor,
    PackagePlus,
    Trash2,
    ClipboardList,
    BarChart3,
    Wrench,
    Server,
    Sun,
    Moon,
    ChevronLeft,
    ChevronRight,
    LogOut,
    ShieldCheck,
    User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_NAV_ITEMS = [
    { label: '概览', to: '/', icon: LayoutDashboard, end: true, adminOnly: false },
    { label: '资产管理', to: '/assets', icon: Monitor, end: true, adminOnly: false },
    { label: '资产入库', to: '/assets/new', icon: PackagePlus, adminOnly: true },
    { label: '维修维护', to: '/maintenance', icon: Wrench, adminOnly: false },
    { label: '报废管理', to: '/disposal', icon: Trash2, adminOnly: false },
    { label: '审计日志', to: '/audit', icon: ClipboardList, adminOnly: false },
    { label: '报表统计', to: '/reports', icon: BarChart3, adminOnly: false },
];

export default function Layout({ children }) {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('itam-theme') || 'dark';
    });
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('itam-sidebar-collapsed') === 'true';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('itam-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('itam-sidebar-collapsed', String(collapsed));
    }, [collapsed]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const isAdmin = currentUser?.role === 'admin';

    // Filter nav items based on role
    const navItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

    return (
        <div className="app-layout">
            <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon" style={{ flexShrink: 0 }}>
                        <Server size={18} />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1>ITAM</h1>
                            <div className="logo-sub">Asset Manager</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {collapsed ? (
                        <button
                            className="sidebar-collapse-btn sidebar-collapse-btn--inline"
                            onClick={() => setCollapsed(false)}
                            title="展开侧栏"
                        >
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <div className="nav-group-label">
                            主菜单
                            <button
                                className="sidebar-collapse-btn sidebar-collapse-btn--inline"
                                onClick={() => setCollapsed(true)}
                                title="收起侧栏"
                            >
                                <ChevronLeft size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={!!item.end}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className="nav-icon" size={18} />
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User info + logout */}
                <div className={`sidebar-user${collapsed ? ' sidebar-user--collapsed' : ''}`}>
                    {!collapsed && (
                        <div className="sidebar-user__info">
                            <div className="sidebar-user__name">{currentUser?.displayName}</div>
                            <div className={`sidebar-user__role ${isAdmin ? 'sidebar-user__role--admin' : 'sidebar-user__role--user'}`}>
                                {isAdmin ? <ShieldCheck size={11} /> : <User size={11} />}
                                {isAdmin ? '管理员' : '普通用户'}
                            </div>
                        </div>
                    )}
                    <div className="sidebar-user__actions">
                        {/* Theme toggle */}
                        <button
                            className="theme-toggle"
                            onClick={toggleTheme}
                            title={theme === 'dark' ? '切换至日间模式' : '切换至夜间模式'}
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        {/* Logout */}
                        <button
                            className="theme-toggle"
                            onClick={handleLogout}
                            title="退出登录"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
