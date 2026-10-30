import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { KIOTVIET_365MD_CATALOG, RawKiotVietCatalogItem } from './kiotVietCatalogData';
import { KIOTVIET_365MD_CUSTOMERS, RawKiotVietCustomerItem } from './kiotVietCustomersData';
import {
  AccountCredential,
  CashVoucher,
  computeProductStatus,
  Customer,
  CustomerType,
  ORG_ID,
  Product,
  ProductCategory,
  ProductUnit,
  ROLE_DEFAULT_PERMISSIONS,
  SalesOrder,
  sanitizeString,
  StaffPermissions,
  StaffPrivateInfo,
  StaffPublicProfile,
  StockMovement,
  VALIDATION_RULES,
  WarehouseZone,
} from './types';

function makeNowTimestamp(): Timestamp {
  return Timestamp.now();
}

// Danh sách tài khoản mặc định: 1 Admin + 5 Nhân viên Bán hàng + 2 Kế toán Quản lý
export const DEFAULT_ACCOUNT_CREDENTIALS: AccountCredential[] = [
  { staffId: 'acc_admin_365md', username: 'admin', passwordPlain: 'admin123@' },
  { staffId: 'acc_sales_quochuy', username: 'quochuy', passwordPlain: 'huy123@' },
  { staffId: 'acc_sales_nganthao', username: 'nganthao', passwordPlain: 'thao123@' },
  { staffId: 'acc_sales_tranthinh', username: 'tranthinh', passwordPlain: 'thinh123@' },
  { staffId: 'acc_sales_ducminh', username: 'ducminh', passwordPlain: 'minh123@' },
  { staffId: 'acc_sales_dangngoc', username: 'dangngoc', passwordPlain: 'ngọc123@' },
  { staffId: 'acc_acc_nguyenthao', username: 'nguyenthao', passwordPlain: 'thao123@' },
  { staffId: 'acc_acc_senvu', username: 'senvu', passwordPlain: 'sen123@' },
];

// Danh sách ID dữ liệu mẫu cũ cần tự động dọn sạch khỏi Firestore (nếu có từ phiên trước)
export const LEGACY_DEMO_IDS = {
  products: [
    'prod_365md_01',
    'prod_365md_02',
    'prod_365md_03',
    'prod_365md_04',
    'prod_365md_05',
    'prod_365md_06',
  ],
  stock_movements: [
    'mov_365md_101',
    'mov_365md_102',
    'mov_365md_103',
    'mov_365md_104',
  ],
  sales_orders: [
    'ord_365md_1001',
    'ord_365md_1002',
    'ord_365md_1003',
    'ord_365md_1004',
  ],
  staff: [
    'staff_365md_wh01',
    'staff_365md_sl02',
    'staff_365md_cs03',
    'staff_365md_au04',
  ],
};

/**
 * Danh sách chuẩn Nhà cung cấp & Nhà phân phối hàng hóa 365MD (đã tối ưu ngắn gọn theo đúng thứ tự yêu cầu)
 */
export const STANDARD_SUPPLIERS_365MD: readonly string[] = [
  'Auto365 Mỹ đình',
  'Ultra Racing',
  'Da Bảo Long',
  '365 Group',
  'Icar',
  'Pat dưỡng độ bi',
  'Âm Thanh',
  'Vietmap',
  'HUVI',
  '70mai',
  'Tein',
  '3M',
  'Setcar',
  'Huper optik',
  'Kata',
  'Teckwrap',
  'Zesteck',
  'Bfactory',
  'Phương Đông auto',
  'Dũng Vương',
  'Sài Gòn caraudio',
  'Phi long auto',
  'Bcar',
  'Scar',
  'Goteck',
  'NCC khác',
] as const;

/**
 * Chuẩn hóa tên Nhà cung cấp cũ (dài) sang tên ngắn gọn chính thức
 */
export function normalizeSupplierShortName(rawSupplier: string): string {
  const s = (rawSupplier || '').trim();
  if (!s) return '';


  const mapOldToShort: Record<string, string> = {
    'Tổng kho Phụ kiện Auto365 Mỹ Đình': 'Auto365 Mỹ đình',
    'Tổng kho Phụ tùng & Đồ chơi Ô tô Auto365': 'Auto365 Mỹ đình',
    'Auto365 Mỹ Đình': 'Auto365 Mỹ đình',
    'Nhà phân phối Auto365 Việt Nam': 'Auto365 Mỹ đình',
    'Ultra Racing Việt Nam': 'Ultra Racing',
    'Xưởng Nội thất Da Nappa & Thảm 365MD': 'Da Bảo Long',
    'Auto365 Việt Nam (Tập đoàn GTR)': '365 Group',
    'Tập đoàn 365 Group (GTR / Titan / X-Light)': '365 Group',
    'ICAR Việt Nam (Elliview / Ellisafe)': 'Icar',
    'Xưởng Gia công CNC & Pat Độ 365MD': 'Pat dưỡng độ bi',
    'Nhà phân phối Âm thanh Ô tô 365MD': 'Âm Thanh',
    'Vietmap Chính Hãng': 'Vietmap',
    'Công ty Thảm sàn Huvi': 'HUVI',
    'Nhà phân phối Camera Hành trình 70mai': '70mai',
    'Tein Việt Nam Chính Hãng': 'Tein',
    '3M Việt Nam Chính Hãng': '3M',
    'Nhà phân phối Cốp điện Setcar': 'Setcar',
    'Huper Optik Việt Nam': 'Huper optik',
    'KATA Việt Nam': 'Kata',
    'Nhà phân phối PPF & Bảo vệ Sơn': 'Teckwrap',
    'Zestech / TMAS Việt Nam': 'Zesteck',
    'Zestech': 'Zesteck',
    'Bfactory Phụ kiện Xe điện VinFast': 'Bfactory',
    'Xưởng Cơ khí Giáp Gầm & Bảo vệ Pin': 'NCC khác',
  };

  if (mapOldToShort[s]) return mapOldToShort[s];
  return s;
}

/**
 * Tự động nhận diện Nhà cung cấp (Supplier) chuẩn ngắn gọn theo thương hiệu & nhóm hàng của Auto365 Mỹ Đình
 */
export function inferSupplierFromKiotItem(group: string, name: string, code: string): string {
  const g = group.trim().toLowerCase();
  const text = `${name} ${code}`.toLowerCase();

  if (text.includes('ultra racing') || code.toUpperCase().startsWith('UR') || g === 'thanh giằng') {
    return 'Ultra Racing';
  }
  if (text.includes('tein') || g === 'phuộc') {
    return 'Tein';
  }
  if (text.includes('huvi')) {
    return 'HUVI';
  }
  if (text.includes('kata')) {
    return 'Kata';
  }
  if (text.includes('lavor') || g === 'thảm sàn' || g === 'bọc ghế') {
    return 'Da Bảo Long';
  }
  if (text.includes('3m') || g === 'film 3m') {
    return '3M';
  }
  if (text.includes('huper') || g === 'film huper') {
    return 'Huper optik';
  }
  if (g === 'ppf' || text.includes('ppf') || text.includes('stek') || text.includes('ari') || text.includes('teckwrap')) {
    return 'Teckwrap';
  }
  if (text.includes('vietmap') || text.includes('kc01') || text.includes('ts-2k') || text.includes('s72') || text.includes('m1') || text.includes('m2')) {
    return 'Vietmap';
  }
  if (text.includes('70mai') || text.includes('ddpai') || text.includes('bot')) {
    return '70mai';
  }
  if (text.includes('icar') || text.includes('elliview') || text.includes('ellisafe') || g === 'tpms') {
    return 'Icar';
  }
  if (text.includes('zestech') || text.includes('zesteck') || text.includes('utour') || text.includes('tmass') || text.includes('safeview')) {
    return 'Zesteck';
  }
  if (text.includes('setcar') || text.includes('dr.door') || g === 'cốp điện') {
    return 'Setcar';
  }
  if (text.includes('bfactory')) {
    return 'Bfactory';
  }
  if (text.includes('gotech') || text.includes('goteck')) {
    return 'Goteck';
  }
  if (text.includes('bcar')) {
    return 'Bcar';
  }
  if (text.includes('scar')) {
    return 'Scar';
  }
  if (text.includes('phương đông')) {
    return 'Phương Đông auto';
  }
  if (text.includes('dũng vương')) {
    return 'Dũng Vương';
  }
  if (text.includes('sài gòn caraudio') || text.includes('saigon caraudio')) {
    return 'Sài Gòn caraudio';
  }
  if (text.includes('phi long')) {
    return 'Phi long auto';
  }
  if (
    text.includes('titan') ||
    text.includes('x-light') ||
    text.includes('xlight') ||
    text.includes('henvvei') ||
    text.includes('gtr') ||
    text.includes('f10') ||
    text.includes('v20') ||
    text.includes('v30') ||
    text.includes('m40') ||
    text.includes('m60') ||
    text.includes('red ') ||
    text.includes('matrix') ||
    g === 'đèn'
  ) {
    return '365 Group';
  }
  if (g === 'dưỡng cnc gầm' || g === 'pat') {
    return 'Pat dưỡng độ bi';
  }
  if (g === 'loa' || text.includes('helix') || text.includes('focal') || text.includes('jbl') || text.includes('atm')) {
    return 'Âm Thanh';
  }
  if (g === 'bảo vệ pin') {
    return 'NCC khác';
  }
  return 'Auto365 Mỹ đình';
}

/**
 * Kiểm tra xem sản phẩm có phải là Phim cách nhiệt (Window Tint Film) hay không
 * để tự động chuẩn hóa đơn vị tính sang "Tấm"
 */
export function isWindowTintFilmProduct(item: {
  batchNumber?: string;
  group?: string;
  name?: string;
  sku?: string;
  supplier?: string;
  category?: string;
}): boolean {
  const g = (item.batchNumber || item.group || '').trim().toLowerCase();
  const n = (item.name || '').trim().toLowerCase();
  const c = (item.sku || '').trim().toLowerCase();
  const s = (item.supplier || '').trim().toLowerCase();
  const text = `${n} ${c}`;

  // Loại trừ phím vô lăng hoặc PPF bảo vệ sơn
  if (g.includes('vô lăng') || text.includes('vô lăng')) return false;
  if (g === 'ppf' || text.startsWith('ppf ')) return false;

  if (
    g === 'film 3m' ||
    g === 'film huper' ||
    g.includes('film') ||
    g.includes('phim cách nhiệt') ||
    text.includes('phim cách nhiệt') ||
    text.includes('film cách nhiệt') ||
    text.includes('huper optik') ||
    text.includes('phim 3m') ||
    text.includes('film 3m') ||
    text.includes('kính mặt blk') ||
    text.includes('kính mặt ir') ||
    s === '3m' ||
    s === 'huper optik'
  ) {
    return true;
  }

  return false;
}

export function normalizeProductUnit(p: {
  batchNumber?: string;
  group?: string;
  name?: string;
  sku?: string;
  supplier?: string;
  category?: string;
  unit: ProductUnit;
}): ProductUnit {
  if (isWindowTintFilmProduct(p)) {
    return 'Tấm';
  }
  return p.unit;
}

function mapKiotGroupToCategoryAndZone(
  group: string,
  name: string
): {
  category: ProductCategory;
  warehouseZone: WarehouseZone;
  unit: ProductUnit;
} {
  const g = group.trim().toLowerCase();
  const n = name.trim().toLowerCase();

  let unit: ProductUnit = 'Bộ';
  if (isWindowTintFilmProduct({ group, name })) {
    unit = 'Tấm';
  } else if (n.includes('cặp') || n.includes('đôi') || g === 'đèn') {
    unit = 'Cặp';
  } else if (
    g.includes('ppf') ||
    g.includes('decal') ||
    g.includes('cách âm')
  ) {
    unit = 'Cuộn';
  } else if (
    g === 'giắc nối' ||
    g === 'mô tơ' ||
    g === 'bóng' ||
    g === 'còi' ||
    g === 'bình acquy' ||
    g === 'lốp'
  ) {
    unit = 'Cái';
  }

  // 1. Độ đèn & Tăng sáng Ô tô
  if (
    g === 'đèn' ||
    g === 'dưỡng cnc gầm' ||
    g === 'led nội thất' ||
    g === 'trần sao' ||
    (g === 'pat' && (n.includes('bi') || n.includes('đèn')))
  ) {
    return {
      category: 'Độ đèn & Tăng sáng Ô tô',
      warehouseZone: 'Kho Thiết bị Điện tử & Đèn',
      unit,
    };
  }

  // 2. Phim Cách nhiệt & PPF
  if (
    g === 'film 3m' ||
    g === 'film huper' ||
    g === 'ppf' ||
    g === 'cách âm' ||
    g === 'decal' ||
    g === 'phủ gầm' ||
    g === 'sơn'
  ) {
    return {
      category: 'Phim Cách nhiệt & PPF',
      warehouseZone: 'Kho Phim & Vật tư Phòng sạch',
      unit,
    };
  }

  // 3. Màn hình & Điện tử Ô tô
  if (
    g.startsWith('camera') ||
    g === 'loa' ||
    g === 'màn hình' ||
    g === 'tpms' ||
    g === 'gglk' ||
    g === 'sấy gương' ||
    g === 'ghế điện' ||
    g === 'dưỡng màn hình' ||
    g === 'mô tơ' ||
    g === 'làm mát ghế' ||
    g === 'gương điện' ||
    g === 'box' ||
    g === 'hud' ||
    g === 'cốp điện' ||
    g === 'cảm biến' ||
    g === 'giải mã' ||
    g === 'mhu' ||
    g === 'phím vô lăng' ||
    g === 'dưỡng cam' ||
    g === 'atl' ||
    g === 'bình acquy' ||
    g === 'khóa cửa' ||
    g === 'cảnh báo điểm mù' ||
    g === 'lxk' ||
    g === 'còi' ||
    g === 'định vị'
  ) {
    return {
      category: 'Màn hình & Điện tử Ô tô',
      warehouseZone: 'Kho Thiết bị Điện tử & Đèn',
      unit,
    };
  }

  // 4. Vật tư & Linh kiện Kho
  if (g === 'giắc nối' || g === 'meka' || g === 'pat' || g === 'khác') {
    return {
      category: 'Vật tư & Linh kiện Kho',
      warehouseZone: 'Quầy Xuất Nhanh & Dịch vụ',
      unit,
    };
  }

  // 5. Phụ kiện & Đồ chơi Xe
  return {
    category: 'Phụ kiện & Đồ chơi Xe',
    warehouseZone: 'Kho Chính - Tầng 1',
    unit,
  };
}

/**
 * Khởi tạo đầy đủ 771 mặt hàng hóa từ file PDF KiotViet của Auto365 Mỹ Đình (365MD) kèm thông tin Nhà cung cấp.
 */
export function buildDefaultProducts(creatorId = 'acc_admin_365md'): Product[] {
  const ts = makeNowTimestamp();
  return KIOTVIET_365MD_CATALOG.map((item: RawKiotVietCatalogItem) => {
    const productId = `wh_2710_${String(item.idx).padStart(4, '0')}`;
    const mapped = mapKiotGroupToCategoryAndZone(item.group, item.name);
    const minStockThreshold = 0;
    const stockQty = Number(item.stockQty || 0);
    const costPriceVnd = Math.max(0, Math.round(item.costPriceVnd || 0));
    const sellPriceVnd = Math.max(0, Math.round(item.sellPriceVnd || 0));

    return {
      productId,
      orgId: ORG_ID,
      sku: item.code ? sanitizeString(item.code, VALIDATION_RULES.SKU_MAX_LEN, '') : '',
      name: sanitizeString(item.name, VALIDATION_RULES.PRODUCT_NAME_MAX_LEN, 'Hàng hóa'),
      supplier: '',
      category: mapped.category,
      unit: mapped.unit,
      warehouseZone: mapped.warehouseZone,
      batchNumber: sanitizeString(item.group, VALIDATION_RULES.BATCH_MAX_LEN, '27/10/2026'),
      costPriceVnd,
      sellPriceVnd,
      stockQty,
      minStockThreshold,
      status: computeProductStatus(stockQty, minStockThreshold),
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    };
  });
}

export function buildDefaultMovements(
  _creatorId = 'acc_admin_365md',
  _creatorName = 'Quản trị viên (admin)'
): StockMovement[] {
  return [];
}

export function buildDefaultOrders(
  _creatorId = 'acc_admin_365md',
  _creatorName = 'Quản trị viên (admin)'
): SalesOrder[] {
  return [];
}

export function buildDefaultCashVouchers(
  _creatorId = 'acc_admin_365md',
  _creatorName = 'Quản trị viên (admin)'
): CashVoucher[] {
  return [];
}

/**
 * Khởi tạo đầy đủ 1.100 khách hàng sẵn có từ file PDF KiotViet của Auto365 Mỹ Đình (365MD).
 */
export function buildDefaultCustomers(creatorId = 'acc_admin_365md'): Customer[] {
  const ts = makeNowTimestamp();
  return KIOTVIET_365MD_CUSTOMERS.map((item: RawKiotVietCustomerItem) => {
    const customerId = `cust_365md_${String(item.idx).padStart(4, '0')}`;
    const rawGroup = (item.group || '').trim();
    const rawName = (item.name || '').trim();
    const isDealer =
      rawGroup.toLowerCase().includes('khách đl') ||
      rawName.toLowerCase().includes('gara') ||
      rawName.toLowerCase().includes('auto') ||
      rawName.toLowerCase().includes('nội thất ô tô') ||
      rawName.toLowerCase().includes('độ xe') ||
      rawName.toLowerCase().includes('vietmap');

    const customerType: CustomerType = isDealer ? 'Khách ĐL / Gara' : 'Cá nhân';
    const fullAddress = [item.address, item.ward]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(', ');

    const vehicleOrGroup = rawGroup || (item.note ? item.note.trim() : isDealer ? 'Khách ĐL' : 'Chưa cập nhật dòng xe');

    return {
      customerId,
      orgId: ORG_ID,
      customerCode: sanitizeString(
        item.code || `KH-${String(item.idx).padStart(4, '0')}`,
        VALIDATION_RULES.CUSTOMER_CODE_MAX_LEN,
        `KH-${String(item.idx).padStart(4, '0')}`
      ),
      name: sanitizeString(
        rawName || item.code || `Khách hàng #${item.idx}`,
        VALIDATION_RULES.CUSTOMER_NAME_MAX_LEN,
        `Khách hàng #${item.idx}`
      ),
      phone: sanitizeString(
        item.phone || 'Chưa cập nhật',
        VALIDATION_RULES.CUSTOMER_PHONE_MAX_LEN,
        'Chưa cập nhật'
      ),
      customerType,
      vehicleOrGroup: sanitizeString(
        vehicleOrGroup,
        VALIDATION_RULES.CUSTOMER_VEHICLE_MAX_LEN,
        'Chưa cập nhật dòng xe'
      ),
      address: sanitizeString(
        fullAddress || 'Chưa cập nhật',
        VALIDATION_RULES.CUSTOMER_ADDR_MAX_LEN,
        'Chưa cập nhật'
      ),
      note: sanitizeString(
        item.note || (rawGroup ? `Nhóm/Xe: ${rawGroup}` : 'Khách hàng hệ thống 365MD'),
        VALIDATION_RULES.CUSTOMER_NOTE_MAX_LEN,
        'Khách hàng hệ thống 365MD'
      ),
      branch: sanitizeString(
        item.branch || 'Chi nhánh trung tâm',
        VALIDATION_RULES.BRANCH_MAX_LEN,
        'Chi nhánh trung tâm'
      ),
      createdDateStr: sanitizeString(
        item.createdAtStr || '2026',
        VALIDATION_RULES.CUSTOMER_DATE_STR_MAX_LEN,
        '2026'
      ),
      lastTransactionDateStr: sanitizeString(
        item.lastTxStr || item.createdAtStr || '2026',
        VALIDATION_RULES.CUSTOMER_DATE_STR_MAX_LEN,
        '2026'
      ),
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    };
  });
}

export function buildDefaultStaff(creatorId = 'acc_admin_365md'): {
  publicList: StaffPublicProfile[];
  privateMap: Record<string, StaffPrivateInfo>;
} {
  const ts = makeNowTimestamp();
  const adminPerms = ROLE_DEFAULT_PERMISSIONS.admin;
  const salesPerms = ROLE_DEFAULT_PERMISSIONS.sales_lead;
  const accountingManagerPerms: StaffPermissions = {
    ...ROLE_DEFAULT_PERMISSIONS.auditor,
  };

  const publicList: StaffPublicProfile[] = [
    {
      staffId: 'acc_admin_365md',
      orgId: ORG_ID,
      username: 'admin',
      passwordPlain: 'admin123@',
      fullName: 'Quản trị viên Hệ thống (Admin)',
      employeeCode: 'NV-001',
      role: 'admin',
      department: 'Ban Giám Đốc',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...adminPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_sales_quochuy',
      orgId: ORG_ID,
      username: 'quochuy',
      passwordPlain: 'huy123@',
      fullName: 'Quốc Huy',
      employeeCode: 'NV-002',
      role: 'sales_lead',
      department: 'Kinh Doanh POS',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...salesPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_sales_nganthao',
      orgId: ORG_ID,
      username: 'nganthao',
      passwordPlain: 'thao123@',
      fullName: 'Ngân Thảo',
      employeeCode: 'NV-003',
      role: 'sales_lead',
      department: 'Kinh Doanh POS',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...salesPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_sales_tranthinh',
      orgId: ORG_ID,
      username: 'tranthinh',
      passwordPlain: 'thinh123@',
      fullName: 'Trần Thịnh',
      employeeCode: 'NV-004',
      role: 'sales_lead',
      department: 'Kinh Doanh POS',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...salesPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_sales_ducminh',
      orgId: ORG_ID,
      username: 'ducminh',
      passwordPlain: 'minh123@',
      fullName: 'Đức Minh',
      employeeCode: 'NV-005',
      role: 'sales_lead',
      department: 'Kinh Doanh POS',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...salesPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_sales_dangngoc',
      orgId: ORG_ID,
      username: 'dangngoc',
      passwordPlain: 'ngọc123@',
      fullName: 'Đăng Ngọc',
      employeeCode: 'NV-006',
      role: 'sales_lead',
      department: 'Kinh Doanh POS',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...salesPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_acc_nguyenthao',
      orgId: ORG_ID,
      username: 'nguyenthao',
      passwordPlain: 'thao123@',
      fullName: 'Nguyên Thảo',
      employeeCode: 'NV-007',
      role: 'auditor',
      department: 'Kế Toán & Kiểm Toán',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...accountingManagerPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      staffId: 'acc_acc_senvu',
      orgId: ORG_ID,
      username: 'senvu',
      passwordPlain: 'sen123@',
      fullName: 'Sen Vũ',
      employeeCode: 'NV-008',
      role: 'auditor',
      department: 'Kế Toán & Kiểm Toán',
      branch: 'Auto365 Mỹ Đình - Hà Nội',
      status: 'active',
      ...accountingManagerPerms,
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const privateMap: Record<string, StaffPrivateInfo> = {};
  for (const s of publicList) {
    privateMap[s.staffId] = {
      staffId: s.staffId,
      orgId: ORG_ID,
      email: `${s.username}@auto365mydinh.vn`,
      phone: '0909365365',
      baseSalaryVnd: 0,
      contractType: 'Toàn thời gian',
      createdBy: creatorId,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  return {
    publicList,
    privateMap,
  };
}

/**
 * Xóa toàn bộ dữ liệu ví dụ cũ trên Firestore nếu đã từng được tạo trước đó.
 */
export async function purgeLegacyDemoDataFromFirestore(): Promise<void> {
  try {
    for (const pid of LEGACY_DEMO_IDS.products) {
      await deleteDoc(doc(db, 'products', pid)).catch(() => {});
    }
    for (const mid of LEGACY_DEMO_IDS.stock_movements) {
      await deleteDoc(doc(db, 'stock_movements', mid)).catch(() => {});
    }
    for (const oid of LEGACY_DEMO_IDS.sales_orders) {
      await deleteDoc(doc(db, 'sales_orders', oid)).catch(() => {});
    }
    for (const sid of LEGACY_DEMO_IDS.staff) {
      await deleteDoc(doc(db, 'staff_public', sid)).catch(() => {});
      await deleteDoc(doc(db, 'staff_private', sid)).catch(() => {});
    }
  } catch {
    // Bỏ qua nếu phiên hiện tại chưa xác thực Google Cloud hoặc không có quyền xóa
  }
}

/**
 * Làm sạch toàn bộ dữ liệu kho, phiếu kho, đơn hàng, sổ quỹ và các tài khoản phụ để đưa hệ thống về trạng thái trắng 100% (chỉ giữ lại tài khoản admin).
 */
export async function clearAllWorkspaceDataInFirestore(): Promise<void> {
  try {
    const colls = ['products', 'stock_movements', 'sales_orders', 'cash_vouchers'] as const;
    for (const cName of colls) {
      const snap = await getDocs(collection(db, cName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, cName, d.id)).catch(() => {});
      }
    }
    const staffSnap = await getDocs(collection(db, 'staff_public'));
    for (const d of staffSnap.docs) {
      const data = d.data();
      if (data.username !== 'admin' && d.id !== 'acc_admin_365md') {
        await deleteDoc(doc(db, 'staff_public', d.id)).catch(() => {});
        await deleteDoc(doc(db, 'staff_private', d.id)).catch(() => {});
      }
    }
  } catch {
    // Fallback local state handled in App.tsx
  }
}
