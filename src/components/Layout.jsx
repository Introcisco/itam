import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';

const navItems = [
    { label: '概览', to: '/', icon: LayoutDashboard, end: true },
    { label: '资产管理', to: '/assets', icon: Monitor, end: true },
    { label: '资产入库', to: '/assets/new', icon: PackagePlus },
    { label: '维修维护', to: '/maintenance', icon: Wrench },
    { label: '报废管理', to: '/disposal', icon: Trash2 },
    { label: '审计日志', to: '/audit', icon: ClipboardList },
    { label: '报表统计', to: '/reports', icon: BarChart3 },
];

export default function Layout({ children }) {
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

                {/* Theme toggle — icon only */}
                <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? '切换至日间模式' : '切换至夜间模式'}
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </aside>

            <main className="main-content">
                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
