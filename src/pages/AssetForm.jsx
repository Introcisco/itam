import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ASSET_CATEGORIES, ASSET_BRANDS, ASSET_COMPANIES, addAuditLog } from '../db/database';
import { useToast } from '../App';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';

export default function AssetForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { currentUser } = useAuth();
    const operatorName = currentUser?.displayName || '系统管理员';
    const isEdit = !!id;

    // Redirect non-admin users
    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate('/assets', { replace: true });
        }
    }, [currentUser, navigate]);

    const [existing, setExisting] = useState(null);
    useEffect(() => {
        if (id) {
            api.getAsset(id).then(setExisting).catch(() => setExisting(null));
        }
    }, [id]);

    const [form, setForm] = useState({
        assetCode: '', name: '', category: '笔记本电脑', brand: '', model: '',
        serialNumber: '', status: '库存', location: '总部-1F-IT仓库', assignee: '',
        purchaseDate: new Date().toISOString().slice(0, 10), purchasePrice: '',
        warrantyExpiry: '', supplier: '', company: '', specs: '', notes: '',
    });

    useEffect(() => {
        if (existing) {
            setForm({ ...existing, purchasePrice: String(existing.purchasePrice || '') });
        }
    }, [existing]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAssetCodeChange = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        setForm(prev => ({ ...prev, assetCode: digits }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.assetCode || form.assetCode.length !== 8) {
            toast('资产编码必须为8位数字', 'error');
            return;
        }
        if (!form.name || !form.category || !form.brand) {
            toast('请填写所有必填字段', 'error');
            return;
        }

        const data = {
            ...form,
            purchasePrice: Number(form.purchasePrice) || 0,
            createdAt: form.createdAt || new Date().toISOString(),
        };

        if (isEdit) {
            await api.updateAsset(Number(id), data);
            await addAuditLog(Number(id), '编辑', `编辑了资产信息: ${data.name}`, operatorName);
            toast('资产信息已更新');
            navigate(`/assets/${id}`);
        } else {
            const result = await api.createAsset(data);
            const newId = result.id;
            await addAuditLog(newId, '入库', `新资产入库: ${data.name}，编码: ${data.assetCode}`, operatorName);
            toast('资产入库成功');
            navigate(`/assets/${newId}`);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button className="back-btn" onClick={() => navigate(isEdit ? `/assets/${id}` : '/assets')} style={{ width: 36, height: 36, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? '编辑资产' : '资产入库'}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isEdit ? `编辑: ${form.assetCode}` : '登记新的IT资产'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="card-section" style={{ marginBottom: 16 }}>
                    <div className="info-title" style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>基本信息</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">资产编码 * <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(8位数字)</span></label>
                            <input className="form-input" value={form.assetCode} onChange={e => handleAssetCodeChange(e.target.value)} placeholder="请输入8位数字编码" maxLength={8} required />
                            {form.assetCode && form.assetCode.length !== 8 && (
                                <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'block' }}>已输入 {form.assetCode.length}/8 位</span>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">资产名称 *</label>
                            <input className="form-input" value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="如：ThinkPad X1 Carbon" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">资产分类 *</label>
                            <select className="form-select" value={form.category} onChange={e => handleChange('category', e.target.value)}>
                                {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">品牌 *</label>
                            <select className="form-select" value={form.brand} onChange={e => handleChange('brand', e.target.value)} required>
                                <option value="">请选择品牌</option>
                                {ASSET_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">型号</label>
                            <input className="form-input" value={form.model} onChange={e => handleChange('model', e.target.value)} placeholder="如：X1 Carbon Gen 11" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">存货号</label>
                            <input className="form-input" value={form.serialNumber} onChange={e => handleChange('serialNumber', e.target.value)} placeholder="存货编号" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">配置明细</label>
                        <input className="form-input" value={form.specs} onChange={e => handleChange('specs', e.target.value)} placeholder="如：i7-1365U / 16GB / 512GB SSD / 14&quot; 2.8K OLED" />
                    </div>
                </div>

                <div className="card-section" style={{ marginBottom: 16 }}>
                    <div className="info-title" style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>采购信息</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">采购日期</label>
                            <input className="form-input" type="date" value={form.purchaseDate} onChange={e => handleChange('purchaseDate', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">采购价格 (¥)</label>
                            <input className="form-input" type="number" value={form.purchasePrice} onChange={e => handleChange('purchasePrice', e.target.value)} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">保修截止</label>
                            <input className="form-input" type="date" value={form.warrantyExpiry} onChange={e => handleChange('warrantyExpiry', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">所属公司 *</label>
                            <select className="form-select" value={form.company} onChange={e => handleChange('company', e.target.value)} required>
                                <option value="">请选择所属公司</option>
                                {ASSET_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">供应商</label>
                            <input className="form-input" value={form.supplier} onChange={e => handleChange('supplier', e.target.value)} placeholder="如：联想官方商城" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">存放位置</label>
                            <input className="form-input" value={form.location} onChange={e => handleChange('location', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="card-section" style={{ marginBottom: 24 }}>
                    <div className="info-title" style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>备注</div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <textarea className="form-textarea" value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="可选备注信息" />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(isEdit ? `/assets/${id}` : '/assets')}>取消</button>
                    <button type="submit" className="btn btn-primary btn-lg">
                        <Save size={16} /> {isEdit ? '保存修改' : '确认入库'}
                    </button>
                </div>
            </form>
        </div>
    );
}
