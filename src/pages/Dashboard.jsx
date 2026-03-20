import { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Monitor, Package, Wrench, Trash2, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';

const STATUS_COLORS = {
    '在用': '#3b82f6',
    '库存': '#00d4aa',
    '维修中': '#f59e0b',
    '已报废': '#ef4444',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);

    useEffect(() => {
        api.getAssets().then(setAssets).catch(console.error);
        api.getAuditLogs().then(logs => setRecentLogs(logs.slice(0, 8))).catch(console.error);
    }, []);

    const inUse = assets.filter(a => a.status === '在用').length;
    const inStock = assets.filter(a => a.status === '库存').length;
    const repairing = assets.filter(a => a.status === '维修中').length;
    const disposed = assets.filter(a => a.status === '已报废').length;
    const totalValue = assets.reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0);

    // Warranty expiring soon (within 90 days)
    const now = new Date();
    const soon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringAssets = assets.filter(a => {
        if (!a.warrantyExpiry || a.status === '已报废') return false;
        const exp = new Date(a.warrantyExpiry);
        return exp >= now && exp <= soon;
    });

    // Category distribution for pie chart
    const categoryMap = {};
    assets.filter(a => a.status !== '已报废').forEach(a => {
        categoryMap[a.category] = (categoryMap[a.category] || 0) + 1;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    const PIE_COLORS = ['#00d4aa', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

    // Status distribution for pie chart
    const statusData = [
        { name: '在用', value: inUse },
        { name: '库存', value: inStock },
        { name: '维修中', value: repairing },
        { name: '已报废', value: disposed },
    ].filter(d => d.value > 0);

    const formatCurrency = (v) => `¥${v.toLocaleString()}`;

    const stats = [
        { label: '资产总数', value: assets.length, icon: Monitor, color: '#00d4aa', desc: '全部登记资产' },
        { label: '在用', value: inUse, icon: TrendingUp, color: '#3b82f6', desc: '使用中资产' },
        { label: '库存', value: inStock, icon: Package, color: '#00d4aa', desc: '可分配资产' },
        { label: '维修中', value: repairing, icon: Wrench, color: '#f59e0b', desc: '送修/维护中' },
        { label: '已报废', value: disposed, icon: Trash2, color: '#ef4444', desc: '已退役资产' },
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>仪表板</h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>IT 资产概览与关键指标</p>
            </div>

            {/* Stat Cards */}
            <div className="dashboard-stats stagger">
                {stats.map((s, i) => (
                    <div className="stat-card" key={i} style={{ '--card-accent': s.color }}>
                        <div className="stat-header">
                            <span className="stat-label">{s.label}</span>
                            <div className="stat-icon" style={{ background: `${s.color}15`, color: s.color }}>
                                <s.icon size={18} />
                            </div>
                        </div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-desc">{s.desc}</div>
                    </div>
                ))}
            </div>

            {/* Asset Value Card */}
            <div className="stat-card" style={{ marginBottom: 24, '--card-accent': '#a855f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div className="stat-label" style={{ marginBottom: 8 }}>资产总价值</div>
                        <div className="stat-value" style={{ fontSize: 32, color: '#a855f7' }}>{formatCurrency(totalValue)}</div>
                        <div className="stat-desc">所有登记资产采购总额</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        在用资产: {formatCurrency(assets.filter(a => a.status === '在用').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0))}
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Left column */}
                <div>
                    {/* Charts row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                        <div className="card-section">
                            <div className="section-title">状态分布</div>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, i) => (
                                            <Cell key={i} fill={STATUS_COLORS[entry.name]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#141923', border: '1px solid #1e2738', borderRadius: 8, fontSize: 12 }}
                                        itemStyle={{ color: '#e8ecf4' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
                                {statusData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[d.name] }}></span>
                                        {d.name} ({d.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card-section">
                            <div className="section-title">分类分布</div>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categoryData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#141923', border: '1px solid #1e2738', borderRadius: 8, fontSize: 12 }}
                                        itemStyle={{ color: '#e8ecf4' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'center' }}>
                                {categoryData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                                        {d.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card-section">
                        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>近期操作</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>
                                查看全部 <ArrowRight size={14} />
                            </button>
                        </div>
                        <div className="timeline">
                            {recentLogs.map((log, i) => (
                                <div className="timeline-item" key={i}>
                                    <div className="timeline-dot" />
                                    <div className="timeline-content" onClick={() => log.assetId && navigate(`/assets/${log.assetId}`)}>
                                        <div className="timeline-header">
                                            <span className="timeline-action">{log.action}</span>
                                            <span className="timeline-time">{new Date(log.timestamp).toLocaleDateString('zh-CN')}</span>
                                        </div>
                                        <div className="timeline-detail">{log.details}</div>
                                        <div className="timeline-operator">操作人: {log.operator}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column - Alerts */}
                <div>
                    <div className="card-section">
                        <div className="section-title">
                            <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                            即将过保 ({expiringAssets.length})
                        </div>
                        {expiringAssets.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <div style={{ fontSize: 13 }}>暂无即将过保资产</div>
                            </div>
                        ) : (
                            <div className="alert-list">
                                {expiringAssets.map((a, i) => (
                                    <div className="alert-item" key={i} onClick={() => navigate(`/assets/${a.id}`)} style={{ cursor: 'pointer' }}>
                                        <div>
                                            <div className="alert-name">{a.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.assetCode}</div>
                                        </div>
                                        <span className="alert-date">{a.warrantyExpiry}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
