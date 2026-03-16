import { api } from '../api';

// Asset statuses
export const ASSET_STATUS = {
    IN_STOCK: '库存',
    IN_USE: '在用',
    REPAIRING: '维修中',
    DISPOSED: '已报废',
    TRANSFERRED: '调拨中',
};

// Asset categories
export const ASSET_CATEGORIES = [
    '笔记本电脑',
    '台式电脑',
    '服务器',
    '显示器',
    '打印机',
    '网络设备',
    '移动设备',
    '外设配件',
    '软件许可',
    '其他',
];

// Asset brands
export const ASSET_BRANDS = [
    '联想',
    '华为',
    'ThinkPad',
    '苹果',
    '戴尔',
    '惠普',
    'AOC',
    '其它',
];

// Asset companies
export const ASSET_COMPANIES = [
    '飞亚达精密科技股份有限公司',
    '飞亚达销售有限公司',
    '深圳市飞亚达精密科技有限公司',
    '深圳市亨吉利世界名表中心有限公司',
    '深圳市飞亚达科技发展有限公司',
    '艾米龙时计（深圳）有限公司',
];

// Transfer types
export const TRANSFER_TYPES = {
    ASSIGN: '领用',
    RETURN: '归还',
    TRANSFER: '调拨',
    DISPOSE: '报废',
    REPAIR: '送修',
    REPAIR_DONE: '修复',
};

// Generate asset code
export function generateAssetCode(category) {
    const prefixMap = {
        '笔记本电脑': 'LT',
        '台式电脑': 'DT',
        '服务器': 'SV',
        '显示器': 'MN',
        '打印机': 'PT',
        '网络设备': 'NW',
        '移动设备': 'MB',
        '外设配件': 'AC',
        '软件许可': 'SW',
        '其他': 'OT',
    };
    const prefix = prefixMap[category] || 'IT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Add audit log helper
export async function addAuditLog(assetId, action, details, operator = '系统管理员') {
    await api.createAuditLog({
        assetId,
        action,
        details,
        operator,
        timestamp: new Date().toISOString()
    });
}
