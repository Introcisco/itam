import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

export default function AuditLog() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [page, setPage] = useState(1);

    const allLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().toArray()) || [];
    const assets = useLiveQuery(() => db.assets.toArray()) || [];

    const assetMap = {};
    assets.forEach(a => { assetMap[a.id] = a; });

    const actions = [...new Set(allLogs.map(l => l.action))];

    let filtered = allLogs.filter(l => {
        if (actionFilter && l.action !== actionFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            const asset = assetMap[l.assetId];
            return (
                l.details.toLowerCase().includes(q) ||
                l.operator.toLowerCase().includes(q) ||
                l.action.toLowerCase().includes(q) ||
                (asset?.name || '').toLowerCase().includes(q) ||
                (asset?.assetCode || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ClipboardList size={22} /> 审计日志
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>所有操作记录，共 {filtered.length} 条</p>
            </div>

            <div className="filters-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="filter-input"
                        style={{ paddingLeft: 32, width: '100%' }}
                        placeholder="搜索日志内容、操作人、资产..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <select className="filter-select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
                    <option value="">全部操作</option>
                    {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>操作</th>
                            <th>资产编码</th>
                            <th>资产名称</th>
                            <th>详细信息</th>
                            <th>操作人</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((log, i) => {
                            const asset = assetMap[log.assetId];
                            return (
                                <tr key={i} onClick={() => asset && navigate(`/assets/${asset.id}`)}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${log.action === '入库' || log.action === '归还' ? '库存' : log.action === '领用' || log.action === '调拨' ? '在用' : log.action === '报废' ? '已报废' : '维修中'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td><span className="asset-code">{asset?.assetCode || '-'}</span></td>
                                    <td>{asset?.name || '-'}</td>
                                    <td style={{ maxWidth: 300 }}>{log.details}</td>
                                    <td>{log.operator}</td>
                                </tr>
                            );
                        })}
                        {paged.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>无匹配记录</td></tr>
                        )}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="pagination">
                        <span>第 {page}/{totalPages} 页，共 {filtered.length} 条</span>
                        <div className="pagination-buttons">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let p = i + 1;
                                if (totalPages > 5) {
                                    if (page <= 3) p = i + 1;
                                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                    else p = page - 2 + i;
                                }
                                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
