import { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export default function DisposalList() {
    const navigate = useNavigate();
    const [disposedAssets, setDisposedAssets] = useState([]);

    useEffect(() => {
        api.getAssets()
           .then(all => setDisposedAssets(all.filter(a => a.status === '已报废')))
           .catch(console.error);
    }, []);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Trash2 size={22} /> 报废管理
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>共 {disposedAssets.length} 项已报废资产</p>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>资产编码</th>
                            <th>名称</th>
                            <th>分类</th>
                            <th>品牌/型号</th>
                            <th>采购价格</th>
                            <th>采购日期</th>
                            <th>报废日期</th>
                            <th>报废原因</th>
                            <th>审批人</th>
                        </tr>
                    </thead>
                    <tbody>
                        {disposedAssets.map((a, i) => (
                            <tr key={i} onClick={() => navigate(`/assets/${a.id}`)}>
                                <td><span className="asset-code">{a.assetCode}</span></td>
                                <td style={{ fontWeight: 500 }}>{a.name}</td>
                                <td>{a.category}</td>
                                <td>{a.brand} {a.model}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>¥{(Number(a.purchasePrice) || 0).toLocaleString()}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.purchaseDate ? String(a.purchaseDate).slice(0, 10) : '—'}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.disposalDate || '-'}</td>
                                <td>{a.disposalReason || '-'}</td>
                                <td>{a.disposalApprover || '-'}</td>
                            </tr>
                        ))}
                        {disposedAssets.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>暂无报废资产</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
