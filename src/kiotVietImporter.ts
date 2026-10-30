import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';
import {
  computeProductStatus,
  Customer,
  CustomerType,
  ORG_ID,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductUnit,
  SalesChannel,
  SalesOrder,
  sanitizeString,
  VALIDATION_RULES,
  WarehouseZone,
} from './types';
import { isWindowTintFilmProduct } from './seedData';

export interface KiotVietProductParseResult {
  products: Product[];
  skippedRows: number;
  detectedColumns: string[];
}

export interface KiotVietOrderParseResult {
  orders: SalesOrder[];
  skippedRows: number;
  detectedColumns: string[];
}

export interface KiotVietCustomerParseResult {
  customers: Customer[];
  skippedRows: number;
  detectedColumns: string[];
}

function normalizeHeader(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function parseVndNumber(raw: unknown): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    return Math.max(0, Math.round(raw));
  }
  const str = String(raw ?? '').trim();
  if (!str) return 0;
  // Remove currency symbols and thousand separators (. or ,) appropriately
  const cleaned = str.replace(/[^\d\-]/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : Math.max(0, Math.round(num));
}

function mapKiotCategory(rawCat: string): ProductCategory {
  const norm = normalizeHeader(rawCat);
  if (norm.includes('den') || norm.includes('bi') || norm.includes('led') || norm.includes('laser')) {
    return 'Độ đèn & Tăng sáng Ô tô';
  }
  if (norm.includes('phim') || norm.includes('ppf') || norm.includes('3m') || norm.includes('cachnhiet')) {
    return 'Phim Cách nhiệt & PPF';
  }
  if (norm.includes('manhinh') || norm.includes('cam') || norm.includes('android') || norm.includes('dientu')) {
    return 'Màn hình & Điện tử Ô tô';
  }
  if (norm.includes('vattu') || norm.includes('linhkien') || norm.includes('day') || norm.includes('keo')) {
    return 'Vật tư & Linh kiện Kho';
  }
  return 'Phụ kiện & Đồ chơi Xe';
}

function mapKiotUnit(rawUnit: string): ProductUnit {
  const norm = normalizeHeader(rawUnit);
  if (norm.includes('tam')) return 'Tấm';
  if (norm.includes('met') || norm === 'm') return 'Mét';
  if (norm.includes('chiec')) return 'Chiếc';
  if (norm.includes('bo')) return 'Bộ';
  if (norm.includes('cap') || norm.includes('doi')) return 'Cặp';
  if (norm.includes('cuon')) return 'Cuộn';
  if (norm.includes('hop')) return 'Hộp';
  if (norm.includes('thung')) return 'Thùng';
  return 'Cái';
}

function mapKiotZone(rawZone: string, category: ProductCategory): WarehouseZone {
  const norm = normalizeHeader(rawZone);
  if (norm.includes('phim') || norm.includes('sach')) return 'Kho Phim & Vật tư Phòng sạch';
  if (norm.includes('den') || norm.includes('dientu')) return 'Kho Thiết bị Điện tử & Đèn';
  if (norm.includes('pos') || norm.includes('quay') || norm.includes('showroom')) {
    return 'Quầy Xuất Nhanh & Dịch vụ';
  }
  if (category === 'Phim Cách nhiệt & PPF') return 'Kho Phim & Vật tư Phòng sạch';
  if (category === 'Độ đèn & Tăng sáng Ô tô' || category === 'Màn hình & Điện tử Ô tô') {
    return 'Kho Thiết bị Điện tử & Đèn';
  }
  return 'Kho Chính - Tầng 1';
}

function mapKiotChannel(rawChannel: string): SalesChannel {
  const norm = normalizeHeader(rawChannel);
  if (norm.includes('daily') || norm.includes('b2b') || norm.includes('gara') || norm.includes('banbuon')) {
    return 'Phân phối Đại lý & Gara Đối tác (B2B)';
  }
  if (norm.includes('online') || norm.includes('facebook') || norm.includes('zalo') || norm.includes('web')) {
    return 'Đơn đặt hàng Online / Hotline';
  }
  if (norm.includes('pos') || norm.includes('quay') || norm.includes('banle')) {
    return 'Bán lẻ Quầy Showroom';
  }
  return 'Dịch vụ Lắp đặt Trực tiếp tại Xưởng';
}

function mapKiotPayment(rawPayment: string): PaymentMethod {
  const norm = normalizeHeader(rawPayment);
  if (norm.includes('tienmat') || norm.includes('cash')) return 'Tiền mặt';
  if (norm.includes('mpost') || norm.includes('mpos')) return 'MPost';
  if (norm.includes('ckct') || norm.includes('congty')) return 'CK CT';
  if (norm === 'dt' || norm.includes('dienthoai') || norm.includes('doitac')) return 'ĐT';
  if (norm.includes('congno') || norm === 'no') return 'Công nợ';
  if (norm.includes('the') || norm.includes('card') || norm.includes('pos')) return 'Quẹt thẻ';
  return 'Chuyển khoản QR';
}

function findValueByCandidateKeys(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const cand of candidates) {
    const normCand = normalizeHeader(cand);
    for (const [k, v] of entries) {
      const normKey = normalizeHeader(k);
      if (normKey === normCand || normKey.includes(normCand)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          return v;
        }
      }
    }
  }
  return '';
}

/**
 * Đọc dữ liệu Hàng hóa từ file Excel (.xlsx, .xls, .csv)
 */
export function parseKiotVietProductsFromRows(
  rows: Array<Record<string, unknown>>,
  creatorUid: string
): KiotVietProductParseResult {
  const products: Product[] = [];
  let skippedRows = 0;
  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const nowTs = Timestamp.now();

  rows.forEach((row, index) => {
    const rawSku = String(
      findValueByCandidateKeys(row, [
        'Mã hàng',
        'Ma hang',
        'Mã hàng hóa',
        'Mã SKU',
        'SKU',
        'Mã sản phẩm',
        'Code',
      ]) || ''
    ).trim();

    const rawName = String(
      findValueByCandidateKeys(row, [
        'Tên hàng',
        'Ten hang',
        'Tên hàng hóa',
        'Tên sản phẩm',
        'Tên vật tư',
        'Name',
      ]) || ''
    ).trim();

    if (!rawSku && !rawName) {
      skippedRows++;
      return;
    }

    const rawCategory = String(
      findValueByCandidateKeys(row, [
        'Nhóm hàng',
        'Nhóm hàng(3 Cấp)',
        'Nhom hang',
        'Danh mục',
        'Loại hàng',
        'Category',
      ]) || ''
    );

    const rawUnit = String(
      findValueByCandidateKeys(row, ['Đơn vị tính', 'ĐVT', 'DVT', 'Đơn vị', 'Unit']) || 'Bộ'
    );

    const rawZone = String(
      findValueByCandidateKeys(row, ['Vị trí', 'Vi tri', 'Phân khu', 'Kho']) || ''
    );

    const rawBatch = String(
      findValueByCandidateKeys(row, ['Số lô', 'Mã lô', 'Lô', 'Nhóm hàng(3 Cấp)', 'Nhóm hàng', 'Batch']) ||
        `KV-${new Date().toISOString().slice(0, 7).replace('-', '')}`
    );

    const rawSupplier = String(
      findValueByCandidateKeys(row, [
        'Nhà cung cấp',
        'Nha cung cap',
        'NCC',
        'Thương hiệu',
        'Thuong hieu',
        'Hãng sản xuất',
        'Supplier',
        'Vendor',
      ]) || 'Nhà phân phối Auto365 Việt Nam'
    );

    const costPrice = parseVndNumber(
      findValueByCandidateKeys(row, ['Giá vốn', 'Gia von', 'Đơn giá vốn', 'CostPrice', 'Cost'])
    );

    const sellPrice = parseVndNumber(
      findValueByCandidateKeys(row, [
        'Giá bán',
        'Gia ban',
        'Giá niêm yết',
        'Đơn giá bán',
        'BasePrice',
        'Price',
      ])
    );

    const stockQty = Math.min(
      1000000,
      parseVndNumber(
        findValueByCandidateKeys(row, ['Tồn kho', 'Ton kho', 'Số lượng', 'Tồn thực tế', 'OnHand', 'Stock'])
      )
    );

    const minStock = 0;

    const category = mapKiotCategory(rawCategory);
    const unit: ProductUnit = isWindowTintFilmProduct({
      group: rawCategory,
      batchNumber: rawBatch,
      name: rawName,
      sku: rawSku,
      supplier: rawSupplier,
      category,
    })
      ? 'Tấm'
      : mapKiotUnit(rawUnit);
    const warehouseZone = mapKiotZone(rawZone, category);

    const skuClean = sanitizeString(
      (rawSku || `KV-${String(index + 1).padStart(4, '0')}`).toUpperCase(),
      VALIDATION_RULES.SKU_MAX_LEN,
      `KV-${index + 1}`
    );

    const nameClean = sanitizeString(
      rawName || `Sản phẩm 365MD ${skuClean}`,
      VALIDATION_RULES.PRODUCT_NAME_MAX_LEN,
      `Sản phẩm ${skuClean}`
    );

    const supplierClean = sanitizeString(
      rawSupplier,
      VALIDATION_RULES.SUPPLIER_MAX_LEN,
      'Nhà phân phối Auto365 Việt Nam'
    );

    const batchClean = sanitizeString(
      rawBatch,
      VALIDATION_RULES.BATCH_MAX_LEN,
      'LOT-365MD'
    );

    const safeSell = sellPrice > 0 && sellPrice !== costPrice ? sellPrice : 0;
    const safeCost = costPrice > 0 ? costPrice : 0;

    products.push({
      productId: `kv_prod_${Date.now()}_${index}`,
      orgId: ORG_ID,
      sku: skuClean,
      name: nameClean,
      supplier: supplierClean,
      category,
      unit,
      warehouseZone,
      batchNumber: batchClean,
      costPriceVnd: Math.min(10000000000, safeCost),
      sellPriceVnd: Math.min(10000000000, safeSell),
      stockQty,
      minStockThreshold: minStock,
      status: computeProductStatus(stockQty, minStock),
      createdBy: creatorUid,
      createdAt: nowTs,
      updatedAt: nowTs,
    });
  });

  return { products, skippedRows, detectedColumns };
}

/**
 * Đọc dữ liệu Hóa đơn Bán hàng từ file Excel (.xlsx, .xls, .csv)
 */
export function parseKiotVietOrdersFromRows(
  rows: Array<Record<string, unknown>>,
  cashierUid: string,
  defaultCashierName: string,
  existingProducts: Product[]
): KiotVietOrderParseResult {
  const orders: SalesOrder[] = [];
  let skippedRows = 0;
  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const nowTs = Timestamp.now();

  rows.forEach((row, index) => {
    const rawInvoice = String(
      findValueByCandidateKeys(row, [
        'Mã hóa đơn',
        'Ma hoa don',
        'Số hóa đơn',
        'Mã chứng từ',
        'InvoiceCode',
      ]) || ''
    ).trim();

    const rawCustomer = String(
      findValueByCandidateKeys(row, [
        'Khách hàng',
        'Tên khách hàng',
        'Khach hang',
        'CustomerName',
      ]) || ''
    ).trim();

    const rawTotal = findValueByCandidateKeys(row, [
      'Khách cần trả',
      'Khách đã trả',
      'Tổng cộng',
      'Thực thu',
      'Tổng tiền hàng',
      'Thành tiền',
      'Total',
    ]);

    if (!rawInvoice && !rawCustomer && !rawTotal) {
      skippedRows++;
      return;
    }

    const invoiceClean = sanitizeString(
      (rawInvoice || `HD-KV-${String(index + 1).padStart(4, '0')}`).toUpperCase(),
      VALIDATION_RULES.INVOICE_MAX_LEN,
      `HD-KV-${index + 1}`
    );

    const customerClean = sanitizeString(
      rawCustomer || 'Khách lẻ 365MD',
      VALIDATION_RULES.CUSTOMER_NAME_MAX_LEN,
      'Khách lẻ 365MD'
    );

    const rawRef = String(
      findValueByCandidateKeys(row, [
        'Điện thoại',
        'Số điện thoại',
        'Mã khách hàng',
        'Biển số',
        'Ghi chú',
        'Phone',
      ]) || 'KH-365MD'
    );

    const rawItems = String(
      findValueByCandidateKeys(row, [
        'Chi tiết hàng hóa',
        'Tên hàng',
        'Hàng hóa',
        'Ghi chú hàng hóa',
        'Items',
      ]) || 'Đơn hàng đồng bộ 365MD'
    );

    const rawChannel = String(
      findValueByCandidateKeys(row, ['Kênh bán', 'Chi nhánh', 'Bảng giá', 'Channel']) || ''
    );

    const rawPayment = String(
      findValueByCandidateKeys(row, [
        'Phương thức thanh toán',
        'Hình thức thanh toán',
        'Phương thức',
        'Tài khoản nhận',
      ]) || ''
    );

    const rawStatus = normalizeHeader(
      String(findValueByCandidateKeys(row, ['Trạng thái', 'Status']) || 'Hoàn thành')
    );

    const subtotal = parseVndNumber(
      findValueByCandidateKeys(row, ['Tổng tiền hàng', 'Thành tiền', 'Khách cần trả', 'Total'])
    );
    const discount = parseVndNumber(
      findValueByCandidateKeys(row, ['Giảm giá', 'Chiết khấu', 'Giảm giá phiếu', 'Discount'])
    );
    const totalRevenue =
      parseVndNumber(
        findValueByCandidateKeys(row, ['Khách cần trả', 'Khách đã trả', 'Thực thu', 'Tổng cộng'])
      ) || Math.max(0, subtotal - discount);

    const explicitCost = parseVndNumber(
      findValueByCandidateKeys(row, ['Tổng giá vốn', 'Giá vốn', 'Cost'])
    );
    const totalCost = explicitCost > 0 ? explicitCost : Math.round(totalRevenue * 0.68);
    const grossProfit = totalRevenue - totalCost;

    const totalUnits = Math.max(
      1,
      Math.min(
        100000,
        parseVndNumber(findValueByCandidateKeys(row, ['Tổng số lượng', 'Số lượng', 'Quantity'])) || 1
      )
    );

    const status =
      rawStatus.includes('huy') || rawStatus.includes('tra')
        ? 'refunded'
        : rawStatus.includes('cho') || rawStatus.includes('congno') || rawStatus.includes('xuly')
        ? 'pending'
        : 'completed';

    orders.push({
      orderId: `kv_ord_${Date.now()}_${index}`,
      orgId: ORG_ID,
      invoiceNumber: invoiceClean,
      customerName: customerClean,
      customerTaxOrRefCode: sanitizeString(rawRef, VALIDATION_RULES.CUSTOMER_REF_MAX_LEN, 'KV-KH'),
      channel: mapKiotChannel(rawChannel),
      paymentMethod: mapKiotPayment(rawPayment),
      primaryProductId: existingProducts[0]?.productId || 'kv_imported_item',
      itemsSummary: sanitizeString(rawItems, VALIDATION_RULES.ITEMS_SUMMARY_MAX_LEN, 'Đơn hàng 365MD'),
      totalUnits,
      subtotalVnd: subtotal > 0 ? subtotal : totalRevenue,
      discountVnd: discount,
      vatVnd: 0,
      totalRevenueVnd: totalRevenue,
      totalCostVnd: totalCost,
      grossProfitVnd: grossProfit,
      status,
      cashierId: cashierUid,
      cashierName: sanitizeString(defaultCashierName, VALIDATION_RULES.FULL_NAME_MAX_LEN, 'Admin 365MD'),
      createdAt: nowTs,
      updatedAt: nowTs,
    });
  });

  return { orders, skippedRows, detectedColumns };
}

/**
 * Đọc dữ liệu Danh sách Khách hàng từ file Excel (.xlsx, .xls, .csv)
 */
export function parseKiotVietCustomersFromRows(
  rows: Array<Record<string, unknown>>,
  creatorUid: string
): KiotVietCustomerParseResult {
  const customers: Customer[] = [];
  let skippedRows = 0;
  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const nowTs = Timestamp.now();

  rows.forEach((row, index) => {
    const rawCode = String(
      findValueByCandidateKeys(row, [
        'Mã khách hàng',
        'Ma khach hang',
        'Mã KH',
        'Biển số',
        'Customer Code',
      ]) || ''
    ).trim();

    const rawName = String(
      findValueByCandidateKeys(row, [
        'Tên khách hàng',
        'Ten khach hang',
        'Khách hàng',
        'Họ tên',
        'Customer Name',
      ]) || ''
    ).trim();

    if (!rawCode && !rawName) {
      skippedRows += 1;
      return;
    }

    const rawPhone = String(
      findValueByCandidateKeys(row, ['Điện thoại', 'Dien thoai', 'Số điện thoại', 'SĐT', 'Phone']) ||
        'Chưa cập nhật'
    ).trim();

    const rawGroup = String(
      findValueByCandidateKeys(row, [
        'Nhóm khách hàng',
        'Nhom khach hang',
        'Dòng xe',
        'Loại xe',
        'Group',
      ]) || ''
    ).trim();

    const rawType = String(
      findValueByCandidateKeys(row, ['Loại khách', 'Loai khach', 'Phân loại']) || 'Cá nhân'
    ).trim();

    const rawAddress = String(
      findValueByCandidateKeys(row, ['Địa chỉ', 'Dia chi', 'Address']) || ''
    ).trim();

    const rawWard = String(
      findValueByCandidateKeys(row, ['Phường/Xã', 'Phuong/Xa', 'Khu vực']) || ''
    ).trim();

    const rawNote = String(
      findValueByCandidateKeys(row, ['Ghi chú', 'Ghi chu', 'Note']) || ''
    ).trim();

    const rawBranch = String(
      findValueByCandidateKeys(row, ['Chi nhánh tạo', 'Chi nhánh', 'Branch']) ||
        'Chi nhánh trung tâm'
    ).trim();

    const rawCreated = String(
      findValueByCandidateKeys(row, ['Ngày tạo', 'Ngay tao', 'Created Date']) || '2026'
    ).trim();

    const rawLastTx = String(
      findValueByCandidateKeys(row, [
        'Ngày giao dịch cuối',
        'Ngay giao dich cuoi',
        'Giao dịch cuối',
      ]) || rawCreated
    ).trim();

    const isDealer =
      rawGroup.toLowerCase().includes('khách đl') ||
      rawType.toLowerCase().includes('công ty') ||
      rawType.toLowerCase().includes('đại lý') ||
      rawName.toLowerCase().includes('gara') ||
      rawName.toLowerCase().includes('auto');

    const customerType: CustomerType = isDealer ? 'Khách ĐL / Gara' : 'Cá nhân';
    const fullAddr = [rawAddress, rawWard].filter(Boolean).join(', ') || 'Chưa cập nhật';

    customers.push({
      customerId: `kv_cust_${Date.now()}_${index}`,
      orgId: ORG_ID,
      customerCode: sanitizeString(
        rawCode || `KH-${String(index + 1).padStart(4, '0')}`,
        VALIDATION_RULES.CUSTOMER_CODE_MAX_LEN,
        `KH-${String(index + 1).padStart(4, '0')}`
      ),
      name: sanitizeString(
        rawName || rawCode,
        VALIDATION_RULES.CUSTOMER_NAME_MAX_LEN,
        'Khách hàng 365MD'
      ),
      phone: sanitizeString(rawPhone, VALIDATION_RULES.CUSTOMER_PHONE_MAX_LEN, 'Chưa cập nhật'),
      customerType,
      vehicleOrGroup: sanitizeString(
        rawGroup || rawNote || (isDealer ? 'Khách ĐL' : 'Chưa cập nhật dòng xe'),
        VALIDATION_RULES.CUSTOMER_VEHICLE_MAX_LEN,
        'Chưa cập nhật dòng xe'
      ),
      address: sanitizeString(fullAddr, VALIDATION_RULES.CUSTOMER_ADDR_MAX_LEN, 'Chưa cập nhật'),
      note: sanitizeString(
        rawNote || (rawGroup ? `Nhóm/Xe: ${rawGroup}` : 'Nhập từ Excel 365MD'),
        VALIDATION_RULES.CUSTOMER_NOTE_MAX_LEN,
        'Nhập từ Excel 365MD'
      ),
      branch: sanitizeString(rawBranch, VALIDATION_RULES.BRANCH_MAX_LEN, 'Chi nhánh trung tâm'),
      createdDateStr: sanitizeString(
        rawCreated,
        VALIDATION_RULES.CUSTOMER_DATE_STR_MAX_LEN,
        '2026'
      ),
      lastTransactionDateStr: sanitizeString(
        rawLastTx,
        VALIDATION_RULES.CUSTOMER_DATE_STR_MAX_LEN,
        '2026'
      ),
      createdBy: creatorUid,
      createdAt: nowTs,
      updatedAt: nowTs,
    });
  });

  return { customers, skippedRows, detectedColumns };
}

/**
 * Đọc file Excel (.xlsx, .xls) hoặc .csv do người dùng chọn từ máy tính
 */
export async function readExcelOrCsvFileToRows(file: File): Promise<Array<Record<string, unknown>>> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}

/**
 * Đọc dữ liệu khi người dùng Copy & Paste trực tiếp các dòng từ Excel
 */
export function parsePastedSpreadsheetTextToRows(text: string): Array<Record<string, unknown>> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const workbook = XLSX.read(trimmed, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}

/**
 * Tải xuống file Excel mẫu chuẩn cấu trúc cột để người dùng dễ đối chiếu
 */
export function downloadKiotVietTemplateExcel(mode: 'products' | 'orders' | 'customers') {
  const wb = XLSX.utils.book_new();
  if (mode === 'products') {
    const sampleRows = [
      {
        'Mã hàng': 'SP000001',
        'Tên hàng': 'Bi LED Titan Platinum Plus 9+3 Nhân (Chính hãng)',
        'Nhóm hàng': 'Độ đèn & Tăng sáng Ô tô',
        'Đơn vị tính': 'Bộ',
        'Giá vốn': 6200000,
        'Giá bán': 9500000,
        'Tồn kho': 12,
        'Vị trí': 'Kho Thiết bị Điện tử & Đèn',
        'Số lô': 'LOT-TITAN-2026',
      },
      {
        'Mã hàng': 'SP000002',
        'Tên hàng': 'Gói Phim Cách Nhiệt 3M Crystalline Toàn Xe 7 Chỗ',
        'Nhóm hàng': 'Phim Cách nhiệt & PPF',
        'Đơn vị tính': 'Bộ',
        'Giá vốn': 8500000,
        'Giá bán': 14800000,
        'Tồn kho': 8,
        'Vị trí': 'Kho Phim & Vật tư Phòng sạch',
        'Số lô': 'LOT-3M-CR26',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'HangHoa_365MD');
    XLSX.writeFile(wb, 'Mau_Nhap_HangHoa_365MD.xlsx');
  } else if (mode === 'customers') {
    const sampleRows = [
      {
        'Loại khách': 'Cá nhân',
        'Chi nhánh tạo': 'Chi nhánh trung tâm',
        'Mã khách hàng': '30F76393',
        'Tên khách hàng': 'Nguyễn Bá Long',
        'Điện thoại': '0962257111',
        'Địa chỉ': 'Mỹ Đình, Nam Từ Liêm, Hà Nội',
        'Phường/Xã': '',
        'Nhóm khách hàng': 'Ford Everest',
        'Ghi chú': 'Khách độ đèn & phụ kiện',
        'Ngày tạo': '20/10/2026 09:25',
        'Ngày giao dịch cuối': '19/10/2026',
      },
      {
        'Loại khách': 'Cá nhân',
        'Chi nhánh tạo': 'Chi nhánh trung tâm',
        'Mã khách hàng': 'KH000641',
        'Tên khách hàng': 'Nghĩa Vintech Auto',
        'Điện thoại': '0946030503',
        'Địa chỉ': 'Hà Nội',
        'Phường/Xã': '',
        'Nhóm khách hàng': 'Khách ĐL',
        'Ghi chú': 'Đại lý B2B',
        'Ngày tạo': '19/10/2026 17:22',
        'Ngày giao dịch cuối': '19/10/2026',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'KhachHang_365MD');
    XLSX.writeFile(wb, 'Mau_Nhap_KhachHang_365MD.xlsx');
  } else {
    const sampleRows = [
      {
        'Mã hóa đơn': 'HD000105',
        'Khách hàng': 'Anh Minh - Ford Everest',
        'Điện thoại': '0988123456 - 30K-999.88',
        'Chi tiết hàng hóa': '1x Bi LED Titan Platinum Plus + Lắp đặt hoàn thiện',
        'Kênh bán': 'Dịch vụ Lắp đặt Trực tiếp tại Xưởng',
        'Phương thức thanh toán': 'Chuyển khoản QR',
        'Tổng số lượng': 1,
        'Tổng tiền hàng': 9500000,
        'Giảm giá': 0,
        'Khách cần trả': 9500000,
        'Tổng giá vốn': 6200000,
        'Trạng thái': 'Hoàn thành',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'HoaDon_365MD');
    XLSX.writeFile(wb, 'Mau_Nhap_HoaDon_365MD.xlsx');
  }
}
