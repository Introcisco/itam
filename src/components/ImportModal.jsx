import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db, ASSET_CATEGORIES, ASSET_BRANDS, ASSET_COMPANIES, addAuditLog } from '../db/database';
import { Upload, Download, X, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ── Field definitions ──────────────────────────────────────────────────────────
const IMPORT_FIELDS = [
    { key: 'assetCode', label: '资产编码', required: true, hint: '8位纯数字，全局唯一', example: '00010001' },
    { key: 'name', label: '资产名称', required: true, hint: '资产的具体名称', example: 'ThinkPad X1 Carbon' },
    { key: 'category', label: '资产分类', required: true, hint: ASSET_CATEGORIES.join(' / '), example: '笔记本电脑' },
    { key: 'brand', label: '品牌', required: true, hint: ASSET_BRANDS.join(' / '), example: '联想' },
    { key: 'company', label: '所属公司', required: true, hint: ASSET_COMPANIES.join(' / '), example: '飞亚达精密科技股份有限公司' },
    { key: 'model', label: '型号', required: false, hint: '具体型号', example: 'X1 Carbon Gen 11' },
    { key: 'serialNumber', label: '存货号', required: false, hint: '存货/序列号', example: 'SN2024001' },
    { key: 'status', label: '状态', required: false, hint: '库存 / 在用 / 维修中 / 已报废（默认：库存）', example: '库存' },
    { key: 'location', label: '存放位置', required: false, hint: '资产存放的位置', example: '总部-1F-IT仓库' },
    { key: 'assignee', label: '使用人', required: false, hint: '领用该资产的员工姓名', example: '张三' },
    { key: 'purchaseDate', label: '采购日期', required: false, hint: '格式：YYYY-MM-DD', example: '2024-01-15' },
    { key: 'purchasePrice', label: '采购价格', required: false, hint: '数字，单位元', example: '8999' },
    { key: 'warrantyExpiry', label: '保修截止', required: false, hint: '格式：YYYY-MM-DD', example: '2027-01-15' },
    { key: 'supplier', label: '供应商', required: false, hint: '采购来源供应商', example: '联想官方商城' },
    { key: 'specs', label: '配置明细', required: false, hint: '硬件规格等详细描述', example: 'i7 / 16GB / 512GB SSD' },
    { key: 'notes', label: '备注', required: false, hint: '其他补充信息', example: '' },
];

// ── Helper: normalise any date value to YYYY-MM-DD string ────────────────────
function normalizeDate(val) {
    if (!val && val !== 0) return '';
    const str = String(val).trim();
    if (!str) return '';

    // Already in YYYY-MM-DD or YYYY/MM/DD form
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
        return str.replace(/\//g, '-').replace(
            /(\d{4})-(\d{1,2})-(\d{1,2})/,
            (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        );
    }

    // Excel serial number (pure integer like 45641)
    if (/^\d+(\.\d+)?$/.test(str)) {
        const serial = parseFloat(str);
        // xlsx epoch: Dec 30, 1899; use JS Date math
        const utcDays = serial - 25569; // 25569 = days from 1899-12-30 to 1970-01-01
        const ms = utcDays * 86400 * 1000;
        const d = new Date(ms);
        if (isNaN(d.getTime())) return str;
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${mo}-${day}`;
    }

    // Try generic Date parse as last resort
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    return str; // return as-is if we cannot parse
}

// ── Helper: export template ────────────────────────────────────────────────────
function downloadTemplate() {
    // Header row 1: field labels
    const header = IMPORT_FIELDS.map(f => f.label + (f.required ? '（必填）' : '（选填）'));
    // Header row 2: hints
    const hintRow = IMPORT_FIELDS.map(f => f.hint);
    // Example row — date fields are prefixed with a leading apostrophe to force text in Excel
    const exampleRow = IMPORT_FIELDS.map(f => f.example);

    const ws = XLSX.utils.aoa_to_sheet([header, hintRow, exampleRow]);

    // Force date columns to text format so Excel won't auto-convert
    const dateKeys = ['purchaseDate', 'warrantyExpiry'];
    const dateColIndexes = IMPORT_FIELDS
        .map((f, i) => dateKeys.includes(f.key) ? i : -1)
        .filter(i => i >= 0);

    // Mark example row cells (row index 2) for date columns as text
    dateColIndexes.forEach(colIdx => {
        const cellAddr = XLSX.utils.encode_cell({ r: 2, c: colIdx });
        if (ws[cellAddr]) {
            ws[cellAddr].t = 's'; // force string type
            ws[cellAddr].z = '@'; // text format code
        }
    });

    // Column widths
    ws['!cols'] = IMPORT_FIELDS.map(() => ({ wch: 24 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');
    XLSX.writeFile(wb, 'IT资产导入模板.xlsx');
}

// ── Helper: validate a row ─────────────────────────────────────────────────────
function validateRow(row, rowIndex) {
    const errors = [];
    const data = {};

    for (const field of IMPORT_FIELDS) {
        let val = (row[field.label] ?? row[field.label + '（必填）'] ?? row[field.label + '（选填）'] ?? '');

        // Normalise date fields regardless of whether Excel stored them as serial numbers or strings
        if (field.key === 'purchaseDate' || field.key === 'warrantyExpiry') {
            val = normalizeDate(val);
        } else {
            val = String(val ?? '').trim();
        }

        const strVal = val;

        if (field.required && !strVal) {
            errors.push(`第${rowIndex}行：【${field.label}】为必填项，不能为空`);
        }
        data[field.key] = strVal;
    }

    // Validate assetCode: must be 8 digits
    if (data.assetCode && !/^\d{8}$/.test(data.assetCode)) {
        errors.push(`第${rowIndex}行：资产编码必须为8位纯数字，当前值："${data.assetCode}"`);
    }

    // Validate category
    if (data.category && !ASSET_CATEGORIES.includes(data.category)) {
        errors.push(`第${rowIndex}行：资产分类"${data.category}"不在允许范围内`);
    }

    // Validate brand
    if (data.brand && !ASSET_BRANDS.includes(data.brand)) {
        errors.push(`第${rowIndex}行：品牌"${data.brand}"不在允许范围内`);
    }

    // Validate status
    const validStatuses = ['库存', '在用', '维修中', '已报废'];
    if (data.status && !validStatuses.includes(data.status)) {
        errors.push(`第${rowIndex}行：状态"${data.status}"无效，应为：${validStatuses.join(' / ')}`);
    }

    return { errors, data };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ImportModal({ onClose, onSuccess }) {
    const [step, setStep] = useState('idle'); // idle | parsing | preview | importing | done
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const [parsedRows, setParsedRows] = useState([]); // { data, errors }[]
    const [importResult, setImportResult] = useState(null);
    const [showErrors, setShowErrors] = useState(true);
    const fileInputRef = useRef(null);

    const validRows = parsedRows.filter(r => r.errors.length === 0);
    const errorRows = parsedRows.filter(r => r.errors.length > 0);
    const allErrors = parsedRows.flatMap(r => r.errors);

    // ── Parse uploaded file ────────────────────────────────────────────────────
    const handleFile = (file) => {
        if (!file) return;
        setFileName(file.name);
        setStep('parsing');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Do NOT use cellDates:true — that turns date serials into JS Date objects
                // which stringify with timezone noise. Instead read raw values and
                // convert serials to YYYY-MM-DD ourselves via normalizeDate().
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                // Use header from row 0, skip row 1 (hints), data starts from row 2
                // raw: false makes xlsx format numbers/dates based on cell format string,
                // but we handle dates ourselves so we use raw: true for control.
                const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

                if (rawRows.length < 3) {
                    setParsedRows([]);
                    setStep('preview');
                    return;
                }

                const headers = rawRows[0]; // row 0: column labels
                // rows 1 is hint, rows 2+ are data
                const dataRows = rawRows.slice(2).filter(r => r.some(c => c !== undefined && c !== ''));

                const results = dataRows.map((row, idx) => {
                    const obj = {};
                    headers.forEach((h, i) => {
                        if (h) obj[h] = row[i] ?? '';
                    });
                    return validateRow(obj, idx + 3); // +3: 1-indexed, skip 2 header rows
                });

                setParsedRows(results);
                setStep('preview');
            } catch (err) {
                console.error(err);
                setStep('idle');
                alert('文件解析失败，请确认上传的是有效的 Excel 文件（.xlsx 或 .xls）');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    // ── Execute import ─────────────────────────────────────────────────────────
    const handleImport = async () => {
        if (validRows.length === 0) return;
        setStep('importing');

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // Pre-fetch existing asset codes to detect duplicates
        const existingCodes = new Set(
            (await db.assets.toArray()).map(a => a.assetCode)
        );

        for (const { data } of validRows) {
            try {
                if (existingCodes.has(data.assetCode)) {
                    errors.push(`资产编码 ${data.assetCode} 已存在，跳过`);
                    failCount++;
                    continue;
                }
                const record = {
                    assetCode: data.assetCode,
                    name: data.name,
                    category: data.category || '其他',
                    brand: data.brand || '其它',
                    model: data.model || '',
                    serialNumber: data.serialNumber || '',
                    status: data.status || '库存',
                    location: data.location || '',
                    assignee: data.assignee || '',
                    company: data.company || '',
                    purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
                    purchasePrice: Number(data.purchasePrice) || 0,
                    warrantyExpiry: data.warrantyExpiry || '',
                    supplier: data.supplier || '',
                    specs: data.specs || '',
                    notes: data.notes || '',
                    createdAt: new Date().toISOString(),
                };
                const newId = await db.assets.add(record);
                await addAuditLog(newId, '批量导入', `批量导入资产: ${record.name}，编码: ${record.assetCode}`);
                existingCodes.add(data.assetCode);
                successCount++;
            } catch (err) {
                errors.push(`资产 ${data.assetCode} 导入失败: ${err.message}`);
                failCount++;
            }
        }

        setImportResult({ successCount, failCount, errors });
        setStep('done');
        if (successCount > 0) onSuccess?.();
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box import-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileSpreadsheet size={20} color="var(--accent)" />
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>批量导入资产</h2>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>通过 Excel 表格批量导入资产信息</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={16} /></button>
                </div>

                {/* ── IDLE / UPLOAD STEP ── */}
                {(step === 'idle' || step === 'parsing') && (
                    <div style={{ padding: '20px 24px 24px' }}>
                        {/* Download template */}
                        <div style={{ marginBottom: 20, padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>① 下载导入模板</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>模板包含所有字段及必填/选填说明，按模板填写后上传</div>
                            </div>
                            <button className="btn btn-secondary" style={{ flexShrink: 0, marginLeft: 16 }} onClick={downloadTemplate}>
                                <Download size={14} /> 下载模板
                            </button>
                        </div>

                        {/* Upload area */}
                        <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600 }}>② 上传填好的 Excel 文件</div>
                        <div
                            className={`import-drop-zone${dragOver ? ' is-drag-over' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={e => handleFile(e.target.files[0])}
                            />
                            {step === 'parsing' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div className="import-spinner" />
                                    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>正在解析文件…</div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <Upload size={32} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>点击或拖拽文件到此处上传</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>支持 .xlsx、.xls 格式</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PREVIEW STEP ── */}
                {step === 'preview' && (
                    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Summary bar */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div className="import-stat-card import-stat-total">
                                <span style={{ fontSize: 22, fontWeight: 700 }}>{parsedRows.length}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>总行数</span>
                            </div>
                            <div className="import-stat-card import-stat-ok">
                                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{validRows.length}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>可导入</span>
                            </div>
                            <div className="import-stat-card import-stat-err">
                                <span style={{ fontSize: 22, fontWeight: 700, color: errorRows.length ? 'var(--danger)' : 'var(--text-muted)' }}>{errorRows.length}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>有错误</span>
                            </div>
                        </div>

                        {/* File name */}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileSpreadsheet size={13} /> {fileName}
                        </div>

                        {/* Errors */}
                        {allErrors.length > 0 && (
                            <div style={{ background: 'var(--danger-bg, rgba(239,68,68,0.08))', border: '1px solid var(--danger-border, rgba(239,68,68,0.25))', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <button
                                    style={{ width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}
                                    onClick={() => setShowErrors(v => !v)}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> {allErrors.length} 个数据错误（含错误的行不会被导入）</span>
                                    {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {showErrors && (
                                    <ul style={{ margin: 0, padding: '0 14px 12px 34px', fontSize: 12, color: 'var(--danger)', lineHeight: 1.8 }}>
                                        {allErrors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}

                        {parsedRows.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
                                未在文件中找到有效数据行（请确保从第3行开始填写数据）
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button className="btn btn-secondary" onClick={() => { setStep('idle'); setParsedRows([]); setFileName(''); }}>
                                重新上传
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleImport}
                                disabled={validRows.length === 0}
                            >
                                <Upload size={14} />
                                确认导入 {validRows.length > 0 ? `（${validRows.length} 条）` : ''}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── IMPORTING ── */}
                {step === 'importing' && (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <div className="import-spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>正在导入，请稍候…</div>
                    </div>
                )}

                {/* ── DONE ── */}
                {step === 'done' && importResult && (
                    <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CheckCircle size={24} color="var(--success)" />
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700 }}>导入完成</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    成功导入 <strong style={{ color: 'var(--success)' }}>{importResult.successCount}</strong> 条，
                                    失败 <strong style={{ color: importResult.failCount ? 'var(--danger)' : 'var(--text-muted)' }}>{importResult.failCount}</strong> 条
                                </div>
                            </div>
                        </div>

                        {importResult.errors.length > 0 && (
                            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 12, color: 'var(--danger)', lineHeight: 1.9, background: 'rgba(239,68,68,0.07)', borderRadius: 'var(--radius-sm)', padding: '10px 10px 10px 28px' }}>
                                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={onClose}>完成</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
