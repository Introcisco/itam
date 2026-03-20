import { useState, useEffect } from 'react';
import { ASSET_CATEGORIES } from '../db/database';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['#00d4aa', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

const tooltipStyle = {
    contentStyle: { background: '#141923', border: '1px solid #1e2738', borderRadius: 8, fontSize: 12 },
    itemStyle: { color: '#e8ecf4' },
};

export default function Reports() {
    const [assets, setAssets] = useState([]);
    const [transfers, setTransfers] = useState([]);

    useEffect(() => {
        api.getAssets().then(setAssets).catch(console.error);
        api.getTransfers().then(setTransfers).catch(console.error);
    }, []);

    // Category distribution
    const catData = ASSET_CATEGORIES.map(c => ({
        name: c.length > 4 ? c.slice(0, 4) : c,
        fullName: c,
        count: assets.filter(a => a.category === c && a.status !== '已报废').length,
        value: assets.filter(a => a.category === c && a.status !== '已报废').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0),
    })).filter(d => d.count > 0);

    // Monthly trends
    const monthMap = {};
    assets.forEach(a => {
        const m = (a.purchaseDate || '').slice(0, 7);
        if (!m) return;
        if (!monthMap[m]) monthMap[m] = { month: m, inbound: 0, disposed: 0 };
        monthMap[m].inbound++;
    });
    assets.filter(a => a.disposalDate).forEach(a => {
        const m = a.disposalDate.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { month: m, inbound: 0, disposed: 0 };
        monthMap[m].disposed++;
    });
    const trendData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

    // Status value
    const statusValue = [
        { name: '在用', value: assets.filter(a => a.status === '在用').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0) },
        { name: '库存', value: assets.filter(a => a.status === '库存').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0) },
        { name: '维修中', value: assets.filter(a => a.status === '维修中').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0) },
        { name: '已报废', value: assets.filter(a => a.status === '已报废').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0) },
    ].filter(d => d.value > 0);
    const STATUS_COLORS = { '在用': '#3b82f6', '库存': '#00d4aa', '维修中': '#f59e0b', '已报废': '#ef4444' };

    const formatCurrency = (v) => `¥${(v / 1000).toFixed(0)}K`;

    const handleExportReport = () => {
        const summaryData = [{
            '资产总数': assets.length,
            '在用数量': assets.filter(a => a.status === '在用').length,
            '库存数量': assets.filter(a => a.status === '库存').length,
            '维修数量': assets.filter(a => a.status === '维修中').length,
            '报废数量': assets.filter(a => a.status === '已报废').length,
            '总价值': assets.reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0),
        }];
        const detailData = assets.map(a => ({
            '编码': a.assetCode, '名称': a.name, '分类': a.category, '品牌': a.brand,
            '型号': a.model, '状态': a.status,
            '价格': Number(a.purchasePrice) || 0, '位置': a.location,
            '使用人': a.assignee,
            '采购日期': a.purchaseDate ? String(a.purchaseDate).slice(0, 10) : '',
            '保修截止': a.warrantyExpiry ? String(a.warrantyExpiry).slice(0, 10) : '',
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), '资产概要');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailData), '资产明细');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catData.map(d => ({ '分类': d.fullName, '数量': d.count, '价值': d.value }))), '分类统计');
        XLSX.writeFile(wb, `IT资产报表_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BarChart3 size={22} /> 报表统计
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>资产数据分析与可视化</p>
                </div>
                <button className="btn btn-primary" onClick={handleExportReport}>
                    <Download size={14} /> 导出报表
                </button>
            </div>

            {/* Summary Cards */}
            <div className="dashboard-stats stagger" style={{ marginBottom: 24 }}>
                <div className="stat-card" style={{ '--card-accent': '#a855f7' }}>
                    <div className="stat-label">资产总价值</div>
                    <div className="stat-value" style={{ fontSize: 24, color: '#a855f7' }}>¥{assets.reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0).toLocaleString()}</div>
                </div>
                <div className="stat-card" style={{ '--card-accent': '#3b82f6' }}>
                    <div className="stat-label">在用资产价值</div>
                    <div className="stat-value" style={{ fontSize: 24, color: '#3b82f6' }}>¥{assets.filter(a => a.status === '在用').reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0).toLocaleString()}</div>
                </div>
                <div className="stat-card" style={{ '--card-accent': '#00d4aa' }}>
                    <div className="stat-label">平均资产价值</div>
                    <div className="stat-value" style={{ fontSize: 24, color: '#00d4aa' }}>¥{assets.length ? Math.round(assets.reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0) / assets.length).toLocaleString() : 0}</div>
                </div>
                <div className="stat-card" style={{ '--card-accent': '#f59e0b' }}>
                    <div className="stat-label">流转次数</div>
                    <div className="stat-value" style={{ fontSize: 24, color: '#f59e0b' }}>{transfers.length}</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div className="card-section">
                    <div className="section-title">分类数量分布</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={catData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" />
                            <XAxis dataKey="name" tick={{ fill: '#8892a8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#8892a8', fontSize: 11 }} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" fill="#00d4aa" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card-section">
                    <div className="section-title">状态价值分布</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={statusValue} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {statusValue.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                            </Pie>
                            <Tooltip {...tooltipStyle} formatter={(v) => `¥${v.toLocaleString()}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card-section">
                    <div className="section-title">分类价值分布</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={catData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" />
                            <XAxis type="number" tick={{ fill: '#8892a8', fontSize: 11 }} tickFormatter={formatCurrency} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#8892a8', fontSize: 11 }} width={60} />
                            <Tooltip {...tooltipStyle} formatter={(v) => `¥${v.toLocaleString()}`} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card-section">
                    <div className="section-title">月度入库/报废趋势</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" />
                            <XAxis dataKey="month" tick={{ fill: '#8892a8', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#8892a8', fontSize: 11 }} />
                            <Tooltip {...tooltipStyle} />
                            <Line type="monotone" dataKey="inbound" name="入库" stroke="#00d4aa" strokeWidth={2} dot={{ fill: '#00d4aa', r: 3 }} />
                            <Line type="monotone" dataKey="disposed" name="报废" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
