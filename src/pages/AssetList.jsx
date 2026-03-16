import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ASSET_CATEGORIES, ASSET_BRANDS, ASSET_COMPANIES } from '../db/database';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Upload, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import ImportModal from '../components/ImportModal';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 15;

/**
 * A filter "chip": a left-side text label + right-side native select.
 * Active state (non-empty value) gets accent highlight.
 */
function FilterChip({ label, value, onChange, options, placeholder = '全部' }) {
    const isActive = value !== '';
    return (
        <div className={`filter-chip${isActive ? ' is-active' : ''}`}>
            <span className="filter-chip__label">{label}</span>
            <select
                className="filter-chip__select"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {options.map(opt =>
                    typeof opt === 'object'
                        ? <option key={opt.value} value={opt.value}>{opt.label}</option>
                        : <option key={opt} value={opt}>{opt}</option>
                )}
            </select>
        </div>
    );
}

/**
 * Combined year+month date filter chip.
 * Shows as a single chip with two cascading selects.
 */
function DateFilterChip({ year, month, onYearChange, onMonthChange, years, months }) {
    const isActive = year !== '' || month !== '';
    return (
        <div className={`filter-chip${isActive ? ' is-active' : ''}`}>
            <span className="filter-chip__label">采购日期</span>
            <select
                className="filter-chip__select"
                value={year}
                onChange={e => { onYearChange(e.target.value); if (!e.target.value) onMonthChange(''); }}
            >
                <option value="">年份</option>
                {years.map(y => <option key={y} value={String(y)}>{y}年</option>)}
            </select>
            {year && (
                <>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, padding: '0 2px' }}>/</span>
                    <select
                        className="filter-chip__select"
                        value={month}
                        onChange={e => onMonthChange(e.target.value)}
                    >
                        <option value="">月份</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </>
            )}
        </div>
    );
}

export default function AssetList() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const [search, setSearch] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        category: '',
        brand: '',
        location: '',
        company: '',
        purchaseYear: '',
        purchaseMonth: ''
    });
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState('id');
    const [sortDir, setSortDir] = useState('desc');

    const allAssets = useLiveQuery(() => db.assets.toArray()) || [];

    const locations = useMemo(() =>
        [...new Set(allAssets.map(a => a.location).filter(Boolean))].sort(),
        [allAssets]
    );

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2015 + 2 }, (_, i) => 2015 + i).reverse();
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: `${i + 1}月`
    }));

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

    const resetAll = () => {
        setFilters({ status: '', category: '', brand: '', location: '', company: '', purchaseYear: '', purchaseMonth: '' });
        setSearch('');
        setPage(1);
    };

    // Filter logic
    let filtered = allAssets.filter(a => {
        if (filters.status && a.status !== filters.status) return false;
        if (filters.category && a.category !== filters.category) return false;
        if (filters.brand && a.brand !== filters.brand) return false;
        if (filters.location && a.location !== filters.location) return false;
        if (filters.company && a.company !== filters.company) return false;
        if (filters.purchaseYear || filters.purchaseMonth) {
            if (!a.purchaseDate) return false;
            if (filters.purchaseYear && !a.purchaseDate.startsWith(filters.purchaseYear)) return false;
            if (filters.purchaseMonth && a.purchaseDate.substring(5, 7) !== filters.purchaseMonth) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            return (
                a.name.toLowerCase().includes(q) ||
                a.assetCode.toLowerCase().includes(q) ||
                (a.assignee || '').toLowerCase().includes(q) ||
                (a.serialNumber || '').toLowerCase().includes(q) ||
                (a.brand || '').toLowerCase().includes(q) ||
                (a.location || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
        let va = a[sortField], vb = b[sortField];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span className="sort-icon sort-icon--inactive">↕</span>;
        return <span className="sort-icon sort-icon--active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleExport = () => {
        const data = filtered.map(a => ({
            '资产编码': a.assetCode, '名称': a.name, '分类': a.category,
            '品牌': a.brand, '型号': a.model, '存货号': a.serialNumber,
            '状态': a.status, '位置': a.location, '使用人': a.assignee,
            '所属公司': a.company, '采购日期': a.purchaseDate, '采购价格': a.purchasePrice,
            '供应商': a.supplier, '保修截止': a.warrantyExpiry, '配置': a.specs,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '资产列表');
        XLSX.writeFile(wb, `IT资产列表_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <>
            <div className="fade-in">

                {/* ── Page Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>资产管理</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>共 {filtered.length} 项资产</p>
                    </div>
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                                <Upload size={14} /> 导入
                            </button>
                            <button className="btn btn-secondary" onClick={handleExport}>
                                <Download size={14} /> 导出 Excel
                            </button>
                            <button className="btn btn-primary" onClick={() => navigate('/assets/new')}>
                                <Plus size={14} /> 新增资产
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Filter Toolbar ── */}
                <div className="filter-toolbar">

                    {/* Row 1: Search + Reset */}
                    <div className="filter-toolbar__top">
                        <div className="filter-search">
                            <Search size={14} className="filter-search__icon" />
                            <input
                                className="filter-search__input"
                                placeholder="搜索名称、编码、使用人..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                            {search && (
                                <button
                                    className="filter-search__clear"
                                    onClick={() => { setSearch(''); setPage(1); }}
                                >✕</button>
                            )}
                        </div>
                        {activeFilterCount > 0 && (
                            <button className="filter-reset" onClick={resetAll}>
                                <RotateCcw size={12} />
                                重置
                                <span className="filter-badge">{activeFilterCount}</span>
                            </button>
                        )}
                    </div>

                    {/* Row 2: Filter chips */}
                    <div className="filter-chips">
                        <FilterChip
                            label="分类"
                            value={filters.category}
                            onChange={v => handleFilterChange('category', v)}
                            options={ASSET_CATEGORIES}
                        />
                        <FilterChip
                            label="品牌"
                            value={filters.brand}
                            onChange={v => handleFilterChange('brand', v)}
                            options={ASSET_BRANDS}
                        />
                        <FilterChip
                            label="状态"
                            value={filters.status}
                            onChange={v => handleFilterChange('status', v)}
                            options={[
                                { value: '在用', label: '在用' },
                                { value: '库存', label: '库存' },
                                { value: '维修中', label: '维修中' },
                                { value: '已报废', label: '已报废' },
                            ]}
                        />
                        <FilterChip
                            label="位置"
                            value={filters.location}
                            onChange={v => handleFilterChange('location', v)}
                            options={locations}
                        />
                        <FilterChip
                            label="所属公司"
                            value={filters.company}
                            onChange={v => handleFilterChange('company', v)}
                            options={ASSET_COMPANIES}
                        />
                        <DateFilterChip
                            year={filters.purchaseYear}
                            month={filters.purchaseMonth}
                            onYearChange={v => handleFilterChange('purchaseYear', v)}
                            onMonthChange={v => handleFilterChange('purchaseMonth', v)}
                            years={years}
                            months={months}
                        />
                    </div>

                </div>

                {/* ── Table ── */}
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('assetCode')}>编码 <SortIcon field="assetCode" /></th>
                                <th onClick={() => handleSort('name')}>名称 <SortIcon field="name" /></th>
                                <th onClick={() => handleSort('category')}>分类 <SortIcon field="category" /></th>
                                <th onClick={() => handleSort('brand')}>品牌 <SortIcon field="brand" /></th>
                                <th onClick={() => handleSort('status')}>状态 <SortIcon field="status" /></th>
                                <th onClick={() => handleSort('location')}>位置 <SortIcon field="location" /></th>
                                <th onClick={() => handleSort('assignee')}>使用人 <SortIcon field="assignee" /></th>
                                <th onClick={() => handleSort('company')}>所属公司 <SortIcon field="company" /></th>
                                <th onClick={() => handleSort('purchaseDate')}>采购日期 <SortIcon field="purchaseDate" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map(asset => (
                                <tr key={asset.id} onClick={() => navigate(`/assets/${asset.id}`)}>
                                    <td><span className="asset-code">{asset.assetCode}</span></td>
                                    <td style={{ fontWeight: 500 }}>{asset.name}</td>
                                    <td>{asset.category}</td>
                                    <td>{asset.brand}</td>
                                    <td><span className={`status-badge status-${asset.status}`}>{asset.status}</span></td>
                                    <td>{asset.location}</td>
                                    <td>{asset.assignee || '-'}</td>
                                    <td>{asset.company || '-'}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{asset.purchaseDate}</td>
                                </tr>
                            ))}
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                        没有匹配的资产
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <span>第 {page}/{totalPages} 页，共 {filtered.length} 条</span>
                            <div className="pagination-buttons">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let p = i + 1;
                                    if (totalPages > 5) {
                                        if (page <= 3) p = i + 1;
                                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                        else p = page - 2 + i;
                                    }
                                    return (
                                        <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {showImport && (
                <ImportModal
                    onClose={() => setShowImport(false)}
                    onSuccess={() => setShowImport(false)}
                />
            )}
        </>
    );
}
