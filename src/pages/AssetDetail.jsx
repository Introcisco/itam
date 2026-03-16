import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { addAuditLog } from '../db/database';
import { useToast } from '../App';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Edit, UserPlus, RotateCcw, Wrench as WrenchIcon, Trash2, ArrowRightLeft, CheckCircle } from 'lucide-react';

export default function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const operatorName = currentUser?.displayName || '系统管理员';
    const [tab, setTab] = useState('info');
    const [modal, setModal] = useState(null);
    const [formData, setFormData] = useState({});

    const [asset, setAsset] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [logs, setLogs] = useState([]);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        api.getAsset(id).then(setAsset).catch(() => setAsset(null));
        api.getTransfers().then(all => setTransfers(all.filter(t => t.assetId === Number(id)))).catch(console.error);
        api.getMaintenances().then(all => setMaintenance(all.filter(m => m.assetId === Number(id)))).catch(console.error);
        api.getAuditLogsByAsset(id).then(setLogs).catch(console.error);
    }, [id, refresh]);

    const triggerRefresh = () => setRefresh(r => r + 1);

    if (!asset) return <div className="empty-state"><p>加载中...</p></div>;

    const handleAssign = async () => {
        if (!formData.toUser || !formData.toLocation) return;
        await api.updateAsset(asset.id, { status: '在用', assignee: formData.toUser, location: formData.toLocation });
        await api.createTransfer({ assetId: asset.id, type: '领用', fromUser: '', toUser: formData.toUser, fromLocation: asset.location, toLocation: formData.toLocation, date: new Date().toISOString().slice(0, 10), operator: operatorName, notes: formData.notes || '' });
        await addAuditLog(asset.id, '领用', `领用给${formData.toUser}，位置：${formData.toLocation}`, operatorName);
        toast('领用成功');
        setModal(null);
        setFormData({});
        triggerRefresh();
    };

    const handleReturn = async () => {
        await api.updateAsset(asset.id, { status: '库存', assignee: '', location: formData.toLocation || '总部-1F-IT仓库' });
        await api.createTransfer({ assetId: asset.id, type: '归还', fromUser: asset.assignee, toUser: '', fromLocation: asset.location, toLocation: formData.toLocation || '总部-1F-IT仓库', date: new Date().toISOString().slice(0, 10), operator: operatorName, notes: formData.notes || '' });
        await addAuditLog(asset.id, '归还', `${asset.assignee}归还，存放：${formData.toLocation || '总部-1F-IT仓库'}`, operatorName);
        toast('归还成功');
        setModal(null);
        setFormData({});
        triggerRefresh();
    };

    const handleRepair = async () => {
        await api.updateAsset(asset.id, { status: '维修中', location: formData.toLocation || '总部-1F-IT维修区' });
        await api.createMaintenance({ assetId: asset.id, type: '维修', description: formData.description || '', cost: 0, startDate: new Date().toISOString().slice(0, 10), endDate: '', vendor: formData.vendor || '', status: '进行中' });
        await api.createTransfer({ assetId: asset.id, type: '送修', fromUser: asset.assignee, toUser: '', fromLocation: asset.location, toLocation: formData.toLocation || '总部-1F-IT维修区', date: new Date().toISOString().slice(0, 10), operator: operatorName, notes: formData.description || '' });
        await addAuditLog(asset.id, '送修', formData.description || '送修', operatorName);
        toast('已标记为维修中');
        setModal(null);
        setFormData({});
        triggerRefresh();
    };

    const handleTransfer = async () => {
        if (!formData.toUser || !formData.toLocation) return;
        await api.updateAsset(asset.id, { assignee: formData.toUser, location: formData.toLocation });
        await api.createTransfer({ assetId: asset.id, type: '调拨', fromUser: asset.assignee, toUser: formData.toUser, fromLocation: asset.location, toLocation: formData.toLocation, date: new Date().toISOString().slice(0, 10), operator: operatorName, notes: formData.notes || '' });
        await addAuditLog(asset.id, '调拨', `从${asset.assignee}调拨至${formData.toUser}，${formData.toLocation}`, operatorName);
        toast('调拨成功');
        setModal(null);
        setFormData({});
        triggerRefresh();
    };

    const handleRepairDone = async () => {
        // Find the most recent '送修' transfer record to know the pre-repair state
        const repairTransfers = transfers
            .filter(t => t.type === '送修')
            .sort((a, b) => (b.date > a.date ? 1 : -1));
        const lastRepair = repairTransfers[0];
        const restoreStatus = lastRepair?.fromUser ? '在用' : '库存';
        const restoreLocation = lastRepair?.fromLocation || '总部-1F-IT仓库';
        const restoreAssignee = lastRepair?.fromUser || '';

        // Update asset back to pre-repair state
        await api.updateAsset(asset.id, {
            status: restoreStatus,
            location: restoreLocation,
            assignee: restoreAssignee,
        });

        // Close the active maintenance record (most recent '进行中')
        const activeMaint = [...maintenance]
            .sort((a, b) => (b.startDate > a.startDate ? 1 : -1))
            .find(m => m.status === '进行中');
        if (activeMaint) {
            await api.updateMaintenance(activeMaint.id, {
                status: '已完成',
                endDate: new Date().toISOString().slice(0, 10),
                cost: Number(formData.cost) || 0,
                notes: formData.notes || '',
            });
        }

        // Transfer record
        await api.createTransfer({
            assetId: asset.id,
            type: '修复',
            fromUser: '',
            toUser: restoreAssignee,
            fromLocation: asset.location,
            toLocation: restoreLocation,
            date: new Date().toISOString().slice(0, 10),
            operator: operatorName,
            notes: formData.notes || '维修完成',
        });

        await addAuditLog(
            asset.id,
            '维修完成',
            `维修完成，恢复${restoreStatus}${restoreAssignee ? '，归还给' + restoreAssignee : ''}，位置：${restoreLocation}${formData.cost ? '，费用：¥' + formData.cost : ''}`,
            operatorName,
        );
        toast('维修完成，资产已恢复');
        setModal(null);
        setFormData({});
        triggerRefresh();
    };

    const handleDispose = async () => {
        await api.updateAsset(asset.id, { status: '已报废', assignee: '', location: '报废仓库', disposalDate: new Date().toISOString().slice(0, 10), disposalReason: formData.reason || '', disposalApprover: operatorName });
        await api.createTransfer({ assetId: asset.id, type: '报废', fromUser: asset.assignee, toUser: '', fromLocation: asset.location, toLocation: '报废仓库', date: new Date().toISOString().slice(0, 10), operator: operatorName, notes: formData.reason || '' });
        await addAuditLog(asset.id, '报废', `报废原因：${formData.reason || '无'}`, operatorName);
        toast('已报废处理', 'warning');
        setModal(null);
        setFormData({});
        triggerRefresh();
    };

    const actionButtons = [];
    if (asset.status === '库存') {
        actionButtons.push({ label: '领用', icon: UserPlus, color: 'var(--status-inuse)', action: () => setModal('assign') });
    }
    if (asset.status === '在用') {
        actionButtons.push({ label: '归还', icon: RotateCcw, action: () => setModal('return') });
        actionButtons.push({ label: '调拨', icon: ArrowRightLeft, action: () => setModal('transfer') });
        actionButtons.push({ label: '送修', icon: WrenchIcon, color: 'var(--warning)', action: () => setModal('repair') });
    }
    if (asset.status === '维修中') {
        actionButtons.push({ label: '完成维修', icon: CheckCircle, color: 'var(--success)', action: () => setModal('repair_done') });
    }
    if (asset.status !== '已报废') {
        actionButtons.push({ label: '报废', icon: Trash2, color: 'var(--danger)', action: () => setModal('dispose') });
    }

    const tabs = [
        { key: 'info', label: '基本信息' },
        { key: 'timeline', label: `操作记录 (${logs.length})` },
        { key: 'transfers', label: `流转记录 (${transfers.length})` },
        { key: 'maintenance', label: `维修记录 (${maintenance.length})` },
    ];

    return (
        <div className="fade-in">
            <div className="detail-header">
                <div className="detail-title">
                    <button className="back-btn" onClick={() => navigate('/assets')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1>{asset.name}</h1>
                        <span className="detail-code">{asset.assetCode}</span>
                    </div>
                    <span className={`status-badge status-${asset.status}`} style={{ marginLeft: 8 }}>{asset.status}</span>
                </div>
                <div className="detail-actions">
                    {isAdmin && asset.status !== '已报废' && (
                        <button className="btn btn-secondary" onClick={() => navigate(`/assets/${asset.id}/edit`)}>
                            <Edit size={14} /> 编辑
                        </button>
                    )}
                    {isAdmin && actionButtons.map((b, i) => (
                        <button key={i} className="btn btn-secondary" style={{ color: b.color }} onClick={b.action}>
                            <b.icon size={14} /> {b.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`detail-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
                ))}
            </div>

            {/* Tab: Info */}
            {tab === 'info' && (
                <div className="detail-info-grid">
                    <div className="info-card">
                        <div className="info-title">基本信息</div>
                        <div className="info-row"><span className="info-label">分类</span><span className="info-value">{asset.category}</span></div>
                        <div className="info-row"><span className="info-label">品牌</span><span className="info-value">{asset.brand}</span></div>
                        <div className="info-row"><span className="info-label">型号</span><span className="info-value">{asset.model}</span></div>
                        <div className="info-row"><span className="info-label">存货号</span><span className="info-value mono">{asset.serialNumber}</span></div>
                        <div className="info-row"><span className="info-label">配置</span><span className="info-value">{asset.specs || '-'}</span></div>
                    </div>
                    <div className="info-card">
                        <div className="info-title">采购信息</div>
                        <div className="info-row"><span className="info-label">所属公司</span><span className="info-value">{asset.company || '-'}</span></div>
                        <div className="info-row"><span className="info-label">采购日期</span><span className="info-value mono">{asset.purchaseDate}</span></div>
                        <div className="info-row"><span className="info-label">采购价格</span><span className="info-value mono">¥{(asset.purchasePrice || 0).toLocaleString()}</span></div>
                        <div className="info-row"><span className="info-label">供应商</span><span className="info-value">{asset.supplier}</span></div>
                        <div className="info-row"><span className="info-label">保修截止</span><span className="info-value mono">{asset.warrantyExpiry}</span></div>
                    </div>
                    <div className="info-card">
                        <div className="info-title">使用信息</div>
                        <div className="info-row"><span className="info-label">当前位置</span><span className="info-value">{asset.location}</span></div>
                        <div className="info-row"><span className="info-label">使用人</span><span className="info-value">{asset.assignee || '-'}</span></div>
                        <div className="info-row"><span className="info-label">状态</span><span className="info-value"><span className={`status-badge status-${asset.status}`}>{asset.status}</span></span></div>
                        {asset.notes && <div className="info-row"><span className="info-label">备注</span><span className="info-value">{asset.notes}</span></div>}
                    </div>
                    {asset.status === '已报废' && (
                        <div className="info-card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                            <div className="info-title" style={{ color: 'var(--danger)' }}>报废信息</div>
                            <div className="info-row"><span className="info-label">报废日期</span><span className="info-value mono">{asset.disposalDate}</span></div>
                            <div className="info-row"><span className="info-label">报废原因</span><span className="info-value">{asset.disposalReason}</span></div>
                            <div className="info-row"><span className="info-label">审批人</span><span className="info-value">{asset.disposalApprover}</span></div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Timeline */}
            {tab === 'timeline' && (
                <div className="card-section">
                    <div className="timeline">
                        {logs.map((log, i) => (
                            <div className="timeline-item" key={i}>
                                <div className="timeline-dot" />
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <span className="timeline-action">{log.action}</span>
                                        <span className="timeline-time">{new Date(log.timestamp).toLocaleString('zh-CN')}</span>
                                    </div>
                                    <div className="timeline-detail">{log.details}</div>
                                    <div className="timeline-operator">操作人: {log.operator}</div>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="empty-state"><p>暂无操作记录</p></div>}
                    </div>
                </div>
            )}

            {/* Tab: Transfers */}
            {tab === 'transfers' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>类型</th><th>原使用人</th><th>新使用人</th><th>原位置</th><th>新位置</th><th>日期</th><th>操作人</th><th>备注</th></tr></thead>
                        <tbody>
                            {transfers.map((t, i) => (
                                <tr key={i}>
                                    <td><span className={`status-badge status-${t.type === '领用' ? '在用' : t.type === '报废' ? '已报废' : t.type === '送修' ? '维修中' : '库存'}`}>{t.type}</span></td>
                                    <td>{t.fromUser || '-'}</td><td>{t.toUser || '-'}</td>
                                    <td>{t.fromLocation}</td><td>{t.toLocation}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.date}</td>
                                    <td>{t.operator}</td><td>{t.notes || '-'}</td>
                                </tr>
                            ))}
                            {transfers.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>无流转记录</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Maintenance */}
            {tab === 'maintenance' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>类型</th><th>描述</th><th>费用</th><th>开始</th><th>结束</th><th>服务商</th><th>备注</th><th>状态</th></tr></thead>
                        <tbody>
                            {maintenance.map((m, i) => (
                                <tr key={i}>
                                    <td>{m.type}</td><td>{m.description}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>¥{(m.cost || 0).toLocaleString()}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.startDate}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.endDate || '-'}</td>
                                    <td>{m.vendor}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.notes || '-'}</td>
                                    <td><span className={`status-badge status-${m.status === '进行中' ? '维修中' :
                                        m.status === '已完成' ? '在用' : '库存'
                                        }`}>{m.status}</span></td>
                                </tr>
                            ))}
                            {maintenance.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>无维修记录</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {modal && (
                <div className="modal-overlay" onClick={() => { setModal(null); setFormData({}); }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modal === 'assign' ? '资产领用' : modal === 'return' ? '资产归还' : modal === 'repair' ? '资产送修' : modal === 'transfer' ? '资产调拨' : modal === 'repair_done' ? '维修完成确认' : '资产报废'}</h2>
                            <button className="btn btn-ghost" onClick={() => { setModal(null); setFormData({}); }}>✕</button>
                        </div>
                        <div className="modal-body">
                            {modal === 'assign' && <>
                                <div className="form-group"><label className="form-label">领用人 *</label><input className="form-input" value={formData.toUser || ''} onChange={e => setFormData(p => ({ ...p, toUser: e.target.value }))} placeholder="输入领用人姓名" /></div>
                                <div className="form-group"><label className="form-label">使用位置 *</label><input className="form-input" value={formData.toLocation || ''} onChange={e => setFormData(p => ({ ...p, toLocation: e.target.value }))} placeholder="如：总部-3F-研发部" /></div>
                                <div className="form-group"><label className="form-label">备注</label><textarea className="form-textarea" value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} /></div>
                            </>}
                            {modal === 'return' && <>
                                <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>归还人：{asset.assignee}</p>
                                <div className="form-group"><label className="form-label">存放位置</label><input className="form-input" value={formData.toLocation || ''} onChange={e => setFormData(p => ({ ...p, toLocation: e.target.value }))} placeholder="默认：总部-1F-IT仓库" /></div>
                                <div className="form-group"><label className="form-label">备注</label><textarea className="form-textarea" value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} /></div>
                            </>}
                            {modal === 'repair' && <>
                                <div className="form-group"><label className="form-label">故障描述</label><textarea className="form-textarea" value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="描述故障现象" /></div>
                                <div className="form-group"><label className="form-label">维修位置</label><input className="form-input" value={formData.toLocation || ''} onChange={e => setFormData(p => ({ ...p, toLocation: e.target.value }))} placeholder="默认：总部-1F-IT维修区" /></div>
                                <div className="form-group"><label className="form-label">维修服务商</label><input className="form-input" value={formData.vendor || ''} onChange={e => setFormData(p => ({ ...p, vendor: e.target.value }))} /></div>
                            </>}
                            {modal === 'transfer' && <>
                                <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>当前使用人：{asset.assignee}，位置：{asset.location}</p>
                                <div className="form-group"><label className="form-label">新使用人 *</label><input className="form-input" value={formData.toUser || ''} onChange={e => setFormData(p => ({ ...p, toUser: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">新位置 *</label><input className="form-input" value={formData.toLocation || ''} onChange={e => setFormData(p => ({ ...p, toLocation: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">备注</label><textarea className="form-textarea" value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} /></div>
                            </>}
                            {modal === 'repair_done' && <>
                                {/* Show what state will be restored */}
                                {(() => {
                                    const lastRepair = [...transfers].filter(t => t.type === '送修').sort((a, b) => b.date > a.date ? 1 : -1)[0];
                                    const restoreStatus = lastRepair?.fromUser ? '在用' : '库存';
                                    const restoreLocation = lastRepair?.fromLocation || '总部-1F-IT仓库';
                                    const restoreAssignee = lastRepair?.fromUser || '';
                                    return (
                                        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>✓ 维修完成后将恢复为：</div>
                                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                                状态：<strong>{restoreStatus}</strong>&nbsp;&nbsp;
                                                位置：<strong>{restoreLocation}</strong>
                                                {restoreAssignee && <>&nbsp;&nbsp;使用人：<strong>{restoreAssignee}</strong></>}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="form-group"><label className="form-label">维修费用（元）</label><input className="form-input" type="number" min="0" value={formData.cost || ''} onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))} placeholder="0" /></div>
                                <div className="form-group"><label className="form-label">完成备注</label><textarea className="form-textarea" value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="如：更换主板，运行正常" /></div>
                            </>
                            }
                            {modal === 'dispose' && <>
                                <p style={{ marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>⚠ 报废操作不可撤销，请确认</p>
                                <div className="form-group"><label className="form-label">报废原因 *</label><textarea className="form-textarea" value={formData.reason || ''} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} placeholder="请填写报废原因" /></div>
                            </>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setModal(null); setFormData({}); }}>取消</button>
                            <button
                                className={`btn ${modal === 'dispose' ? 'btn-danger' : modal === 'repair_done' ? 'btn-primary' : 'btn-primary'}`}
                                style={modal === 'repair_done' ? { background: 'var(--success)', borderColor: 'var(--success)' } : {}}
                                onClick={
                                    modal === 'assign' ? handleAssign :
                                        modal === 'return' ? handleReturn :
                                            modal === 'repair' ? handleRepair :
                                                modal === 'transfer' ? handleTransfer :
                                                    modal === 'repair_done' ? handleRepairDone :
                                                        handleDispose
                                }
                            >
                                {modal === 'repair_done' ? <><CheckCircle size={14} /> 确认完成维修</> :
                                    `确认${modal === 'assign' ? '领用' : modal === 'return' ? '归还' : modal === 'repair' ? '送修' : modal === 'transfer' ? '调拨' : '报废'}`
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
