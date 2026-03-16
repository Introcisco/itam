import { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export default function MaintenanceList() {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [assets, setAssets] = useState([]);

    useEffect(() => {
        api.getMaintenances().then(setRecords).catch(console.error);
        api.getAssets().then(setAssets).catch(console.error);
    }, []);

    const assetMap = {};
    assets.forEach(a => { assetMap[a.id] = a; });

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Wrench size={22} /> 维修维护
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>共 {records.length} 条维修/维护记录</p>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>资产名称</th>
                            <th>资产编码</th>
                            <th>类型</th>
                            <th>描述</th>
                            <th>费用</th>
                            <th>开始日期</th>
                            <th>结束日期</th>
                            <th>服务商</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((m, i) => {
                            const asset = assetMap[m.assetId];
                            return (
                                <tr key={i} onClick={() => asset && navigate(`/assets/${asset.id}`)}>
                                    <td style={{ fontWeight: 500 }}>{asset?.name || '-'}</td>
                                    <td><span className="asset-code">{asset?.assetCode || '-'}</span></td>
                                    <td>{m.type}</td>
                                    <td>{m.description}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>¥{(m.cost || 0).toLocaleString()}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.startDate}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.endDate || '-'}</td>
                                    <td>{m.vendor}</td>
                                    <td><span className={`status-badge status-${m.status === '进行中' ? '维修中' : m.status === '已完成' ? '在用' : '库存'}`}>{m.status}</span></td>
                                </tr>
                            );
                        })}
                        {records.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>暂无维修记录</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
