import { db } from './database';

const sampleAssets = [
    { assetCode: 'LT-2024-001', name: 'ThinkPad X1 Carbon Gen 11', category: '笔记本电脑', brand: 'Lenovo', model: 'X1 Carbon Gen 11', serialNumber: 'PF4KXYZ1', status: '在用', location: '总部-3F-研发部', assignee: '张伟', purchaseDate: '2024-03-15', purchasePrice: 12999, warrantyExpiry: '2027-03-15', supplier: '联想官方商城', specs: 'i7-1365U / 16GB / 512GB SSD / 14" 2.8K OLED', notes: '', createdAt: '2024-03-16T08:00:00Z' },
    { assetCode: 'LT-2024-002', name: 'MacBook Pro 14"', category: '笔记本电脑', brand: 'Apple', model: 'MacBook Pro 14 M3 Pro', serialNumber: 'C02ZN1ABCD', status: '在用', location: '总部-4F-设计部', assignee: '李娜', purchaseDate: '2024-05-20', purchasePrice: 18999, warrantyExpiry: '2026-05-20', supplier: 'Apple Store', specs: 'M3 Pro / 18GB / 512GB SSD / 14.2" XDR', notes: '设计部专用', createdAt: '2024-05-21T08:00:00Z' },
    { assetCode: 'DT-2024-003', name: 'OptiPlex 7010', category: '台式电脑', brand: 'Dell', model: 'OptiPlex 7010 Tower', serialNumber: 'DELLOPT7010A', status: '在用', location: '总部-2F-财务部', assignee: '王芳', purchaseDate: '2024-01-10', purchasePrice: 6599, warrantyExpiry: '2027-01-10', supplier: '戴尔直销', specs: 'i5-13500 / 16GB / 256GB SSD + 1TB HDD', notes: '', createdAt: '2024-01-11T08:00:00Z' },
    { assetCode: 'SV-2023-001', name: 'PowerEdge R750xs', category: '服务器', brand: 'Dell', model: 'PowerEdge R750xs', serialNumber: 'SVDELL750A', status: '在用', location: '机房-A区-机柜03', assignee: '运维组', purchaseDate: '2023-08-01', purchasePrice: 45000, warrantyExpiry: '2026-08-01', supplier: '戴尔企业采购', specs: 'Xeon Silver 4314 x2 / 64GB ECC / 2TB SAS x4', notes: '主要业务服务器', createdAt: '2023-08-02T08:00:00Z' },
    { assetCode: 'SV-2023-002', name: 'ProLiant DL380 Gen10', category: '服务器', brand: 'HPE', model: 'DL380 Gen10 Plus', serialNumber: 'HPEDL380B', status: '在用', location: '机房-A区-机柜05', assignee: '运维组', purchaseDate: '2023-06-15', purchasePrice: 52000, warrantyExpiry: '2026-06-15', supplier: 'HPE合作伙伴', specs: 'Xeon Gold 5318Y x2 / 128GB ECC / 1.2TB SAS x6', notes: '数据库服务器', createdAt: '2023-06-16T08:00:00Z' },
    { assetCode: 'MN-2024-001', name: 'U2723QE 4K显示器', category: '显示器', brand: 'Dell', model: 'U2723QE', serialNumber: 'DELLMN2723A', status: '在用', location: '总部-3F-研发部', assignee: '张伟', purchaseDate: '2024-03-15', purchasePrice: 3999, warrantyExpiry: '2027-03-15', supplier: '京东自营', specs: '27" 4K IPS / USB-C 90W', notes: '', createdAt: '2024-03-16T08:00:00Z' },
    { assetCode: 'MN-2024-002', name: 'ProDisplay XDR', category: '显示器', brand: 'Apple', model: 'Pro Display XDR', serialNumber: 'APPXDR001', status: '在用', location: '总部-4F-设计部', assignee: '李娜', purchaseDate: '2024-05-20', purchasePrice: 39999, warrantyExpiry: '2027-05-20', supplier: 'Apple Store', specs: '32" 6K Retina / P3色域', notes: '', createdAt: '2024-05-21T08:00:00Z' },
    { assetCode: 'NW-2023-001', name: 'Catalyst 9300', category: '网络设备', brand: 'Cisco', model: 'C9300-48T-A', serialNumber: 'CSCO9300A', status: '在用', location: '机房-B区-机柜01', assignee: '运维组', purchaseDate: '2023-04-10', purchasePrice: 28000, warrantyExpiry: '2026-04-10', supplier: 'Cisco金牌代理', specs: '48口千兆 / 4x10G上行', notes: '核心交换机', createdAt: '2023-04-11T08:00:00Z' },
    { assetCode: 'NW-2024-001', name: 'FortiGate 100F', category: '网络设备', brand: 'Fortinet', model: 'FG-100F', serialNumber: 'FGT100FA', status: '在用', location: '机房-B区-机柜02', assignee: '运维组', purchaseDate: '2024-02-01', purchasePrice: 35000, warrantyExpiry: '2027-02-01', supplier: 'Fortinet代理商', specs: '20Gbps防火墙 / IPS / SSL-VPN', notes: '出口防火墙', createdAt: '2024-02-02T08:00:00Z' },
    { assetCode: 'PT-2024-001', name: 'Color LaserJet M479fdw', category: '打印机', brand: 'HP', model: 'M479fdw', serialNumber: 'HPM479A', status: '在用', location: '总部-2F-公共打印区', assignee: '行政部', purchaseDate: '2024-04-01', purchasePrice: 4599, warrantyExpiry: '2025-04-01', supplier: '京东自营', specs: '彩色激光 / 双面 / WiFi', notes: '', createdAt: '2024-04-02T08:00:00Z' },
    { assetCode: 'MB-2024-001', name: 'iPad Pro 12.9"', category: '移动设备', brand: 'Apple', model: 'iPad Pro 12.9 M2', serialNumber: 'IPDAM2001', status: '在用', location: '总部-5F-会议室', assignee: '市场部', purchaseDate: '2024-06-10', purchasePrice: 10999, warrantyExpiry: '2026-06-10', supplier: 'Apple Store', specs: 'M2 / 256GB / WiFi+Cellular', notes: '会议演示用', createdAt: '2024-06-11T08:00:00Z' },
    { assetCode: 'LT-2023-001', name: 'ThinkPad T14s', category: '笔记本电脑', brand: 'Lenovo', model: 'T14s Gen 4', serialNumber: 'PF4TOLD1', status: '库存', location: '总部-1F-IT仓库', assignee: '', purchaseDate: '2023-11-20', purchasePrice: 8999, warrantyExpiry: '2026-11-20', supplier: '联想企业采购', specs: 'i5-1340P / 16GB / 512GB SSD', notes: '备用机', createdAt: '2023-11-21T08:00:00Z' },
    { assetCode: 'DT-2022-001', name: 'OptiPlex 5000', category: '台式电脑', brand: 'Dell', model: 'OptiPlex 5000 SFF', serialNumber: 'DELLOPT5000A', status: '维修中', location: '总部-1F-IT维修区', assignee: '', purchaseDate: '2022-06-15', purchasePrice: 5299, warrantyExpiry: '2025-06-15', supplier: '戴尔直销', specs: 'i5-12500 / 8GB / 256GB SSD', notes: '主板故障送修', createdAt: '2022-06-16T08:00:00Z' },
    { assetCode: 'LT-2021-001', name: 'ThinkPad X1 Carbon Gen 9', category: '笔记本电脑', brand: 'Lenovo', model: 'X1 Carbon Gen 9', serialNumber: 'PF3XOLD1', status: '已报废', location: '报废仓库', assignee: '', purchaseDate: '2021-03-10', purchasePrice: 11999, warrantyExpiry: '2024-03-10', supplier: '联想官方商城', specs: 'i7-1165G7 / 16GB / 512GB SSD', notes: '屏幕损坏', disposalDate: '2025-01-15', disposalReason: '屏幕损坏无维修价值', disposalApprover: '系统管理员', createdAt: '2021-03-11T08:00:00Z' },
    { assetCode: 'PT-2020-001', name: 'LaserJet Pro M404dn', category: '打印机', brand: 'HP', model: 'M404dn', serialNumber: 'HPM404A', status: '已报废', location: '报废仓库', assignee: '', purchaseDate: '2020-08-20', purchasePrice: 2499, warrantyExpiry: '2023-08-20', supplier: '京东自营', specs: '黑白激光 / 双面 / 网络', notes: '定影器故障', disposalDate: '2025-02-10', disposalReason: '定影器故障超年限', disposalApprover: '系统管理员', createdAt: '2020-08-21T08:00:00Z' },
    { assetCode: 'SW-2024-001', name: 'Microsoft 365 E3', category: '软件许可', brand: 'Microsoft', model: 'M365 E3', serialNumber: 'MS365E3-50U', status: '在用', location: '线上', assignee: '全公司', purchaseDate: '2024-01-01', purchasePrice: 150000, warrantyExpiry: '2025-01-01', supplier: 'Microsoft LSP', specs: '50用户 / Office全家桶', notes: '年度续费', createdAt: '2024-01-02T08:00:00Z' },
    { assetCode: 'AC-2024-001', name: 'MX Master 3S', category: '外设配件', brand: 'Logitech', model: 'MX Master 3S', serialNumber: 'LOGIMX3S001', status: '库存', location: '总部-1F-IT仓库', assignee: '', purchaseDate: '2024-07-15', purchasePrice: 699, warrantyExpiry: '2026-07-15', supplier: '京东自营', specs: '无线蓝牙 / USB-C', notes: '备用 x5', createdAt: '2024-07-16T08:00:00Z' },
    { assetCode: 'MN-2023-001', name: 'P2422H 24寸显示器', category: '显示器', brand: 'Dell', model: 'P2422H', serialNumber: 'DELLP2422A', status: '库存', location: '总部-1F-IT仓库', assignee: '', purchaseDate: '2023-09-01', purchasePrice: 1599, warrantyExpiry: '2026-09-01', supplier: '京东自营', specs: '24" FHD IPS', notes: '备用 x3', createdAt: '2023-09-02T08:00:00Z' },
    { assetCode: 'NW-2024-002', name: 'UniFi U6 Pro AP', category: '网络设备', brand: 'Ubiquiti', model: 'U6-Pro', serialNumber: 'UBQTU6P001', status: '在用', location: '总部-3F-天花板', assignee: '运维组', purchaseDate: '2024-03-01', purchasePrice: 1299, warrantyExpiry: '2026-03-01', supplier: 'UI官网', specs: 'WiFi 6 / 5.3Gbps / PoE', notes: '3F无线AP x6', createdAt: '2024-03-02T08:00:00Z' },
    { assetCode: 'LT-2024-003', name: 'EliteBook 840 G10', category: '笔记本电脑', brand: 'HP', model: 'EliteBook 840 G10', serialNumber: 'HPEB840G10A', status: '在用', location: '总部-2F-人事部', assignee: '赵丽', purchaseDate: '2024-08-01', purchasePrice: 9499, warrantyExpiry: '2027-08-01', supplier: 'HP企业采购', specs: 'i7-1355U / 16GB / 512GB SSD', notes: '', createdAt: '2024-08-02T08:00:00Z' },
];

const sampleTransfers = [
    { assetId: 1, type: '领用', fromUser: '', toUser: '张伟', fromLocation: '总部-1F-IT仓库', toLocation: '总部-3F-研发部', date: '2024-03-16', operator: '系统管理员', notes: '新员工配发' },
    { assetId: 2, type: '领用', fromUser: '', toUser: '李娜', fromLocation: '总部-1F-IT仓库', toLocation: '总部-4F-设计部', date: '2024-05-21', operator: '系统管理员', notes: '设计部配发' },
    { assetId: 3, type: '领用', fromUser: '', toUser: '王芳', fromLocation: '总部-1F-IT仓库', toLocation: '总部-2F-财务部', date: '2024-01-11', operator: '系统管理员', notes: '' },
    { assetId: 14, type: '报废', fromUser: '刘强', toUser: '', fromLocation: '总部-3F-研发部', toLocation: '报废仓库', date: '2025-01-15', operator: '系统管理员', notes: '屏幕损坏' },
    { assetId: 13, type: '送修', fromUser: '陈明', toUser: '', fromLocation: '总部-2F-财务部', toLocation: '总部-1F-IT维修区', date: '2025-02-20', operator: '系统管理员', notes: '主板故障' },
];

const sampleMaintenance = [
    { assetId: 13, type: '维修', description: '主板故障检测与更换', cost: 1200, startDate: '2025-02-20', endDate: '', vendor: '戴尔售后', status: '进行中' },
    { assetId: 4, type: '保养', description: '服务器年度巡检与清灰', cost: 500, startDate: '2025-01-10', endDate: '2025-01-10', vendor: '内部运维', status: '已完成' },
    { assetId: 1, type: '升级', description: '内存升级至32GB', cost: 800, startDate: '2024-09-15', endDate: '2024-09-15', vendor: '内部IT', status: '已完成' },
];

const sampleAuditLogs = [
    { assetId: 1, action: '入库', details: '新资产入库: ThinkPad X1 Carbon Gen 11', operator: '系统管理员', timestamp: '2024-03-16T08:00:00Z' },
    { assetId: 1, action: '领用', details: '领用给张伟，位置：总部-3F-研发部', operator: '系统管理员', timestamp: '2024-03-16T09:00:00Z' },
    { assetId: 2, action: '入库', details: '新资产入库: MacBook Pro 14"', operator: '系统管理员', timestamp: '2024-05-21T08:00:00Z' },
    { assetId: 2, action: '领用', details: '领用给李娜，位置：总部-4F-设计部', operator: '系统管理员', timestamp: '2024-05-21T09:00:00Z' },
    { assetId: 14, action: '报废', details: '报废处理: 屏幕损坏无维修价值', operator: '系统管理员', timestamp: '2025-01-15T10:00:00Z' },
    { assetId: 13, action: '送修', details: '主板故障，送至IT维修区', operator: '系统管理员', timestamp: '2025-02-20T08:00:00Z' },
    { assetId: 1, action: '升级', details: '内存升级至32GB', operator: '系统管理员', timestamp: '2024-09-15T10:00:00Z' },
    { assetId: 4, action: '保养', details: '服务器年度巡检与清灰', operator: '系统管理员', timestamp: '2025-01-10T08:00:00Z' },
];

export async function seedDatabase() {
    const count = await db.assets.count();
    if (count > 0) return;
    await db.transaction('rw', [db.assets, db.transfers, db.maintenance, db.auditLogs], async () => {
        await db.assets.bulkAdd(sampleAssets);
        await db.transfers.bulkAdd(sampleTransfers);
        await db.maintenance.bulkAdd(sampleMaintenance);
        await db.auditLogs.bulkAdd(sampleAuditLogs);
    });
    console.log('Database seeded with sample data');
}
