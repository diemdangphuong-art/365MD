import { Timestamp } from 'firebase/firestore';

export const ORG_ID = '365MD' as const;
export const BOOTSTRAPPED_ADMIN_EMAIL = 'DiemDangPhuong@gmail.com' as const;
export const BRAND_LOGO_PATH = '/assets/aistudio/image_c3d3afd9.png' as const;

// Verbatim constants and regexes synced with firebase-blueprint.json & firestore.rules
export const VALIDATION_RULES = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LEN: 128,
  USERNAME_REGEX: /^[a-zA-Z0-9_.\-]+$/,
  USERNAME_MAX_LEN: 32,
  EMP_CODE_REGEX: /^NV-[0-9]{3,6}$/,
  EMP_CODE_MAX_LEN: 16,
  FULL_NAME_MAX_LEN: 100,
  BRANCH_MAX_LEN: 80,
  EMAIL_MAX_LEN: 120,
  PHONE_MAX_LEN: 24,
  SKU_MAX_LEN: 80,
  PRODUCT_NAME_MAX_LEN: 120,
  SUPPLIER_MAX_LEN: 100,
  BATCH_MAX_LEN: 40,
  MOVEMENT_CODE_MAX_LEN: 32,
  PARTNER_REASON_MAX_LEN: 160,
  INVOICE_MAX_LEN: 32,
  CUSTOMER_NAME_MAX_LEN: 120,
  CUSTOMER_REF_MAX_LEN: 32,
  ITEMS_SUMMARY_MAX_LEN: 240,
  VOUCHER_CODE_MAX_LEN: 32,
  VOUCHER_CATEGORY_MAX_LEN: 80,
  COUNTERPARTY_MAX_LEN: 120,
  VOUCHER_TARGET_MAX_LEN: 120,
  VOUCHER_NOTE_MAX_LEN: 200,
  VOUCHER_DESC_MAX_LEN: 200,
  CUSTOMER_CODE_MAX_LEN: 40,
  CUSTOMER_PHONE_MAX_LEN: 32,
  CUSTOMER_VEHICLE_MAX_LEN: 80,
  CUSTOMER_ADDR_MAX_LEN: 160,
  CUSTOMER_NOTE_MAX_LEN: 160,
  CUSTOMER_DATE_STR_MAX_LEN: 32,
} as const;

export type StaffRole =
  | 'admin'
  | 'warehouse_manager'
  | 'sales_lead'
  | 'cashier'
  | 'auditor';

export type StaffDepartment =
  | 'Ban Giám Đốc'
  | 'Kho Vận'
  | 'Kinh Doanh POS'
  | 'Kế Toán & Kiểm Toán';

export type StaffStatus = 'active' | 'suspended' | 'offboarded';

export type ContractType = 'Toàn thời gian' | 'Bán thời gian' | 'Thử việc';

export type ProductCategory =
  | 'Độ đèn & Tăng sáng Ô tô'
  | 'Phim Cách nhiệt & PPF'
  | 'Màn hình & Điện tử Ô tô'
  | 'Phụ kiện & Đồ chơi Xe'
  | 'Vật tư & Linh kiện Kho';

export type ProductUnit =
  | 'Tấm'
  | 'Mét'
  | 'Chiếc'
  | 'Bộ'
  | 'Cái'
  | 'Cặp'
  | 'Cuộn'
  | 'Hộp'
  | 'Thùng';

export type WarehouseZone =
  | 'Kho Chính - Tầng 1'
  | 'Kho Phim & Vật tư Phòng sạch'
  | 'Kho Thiết bị Điện tử & Đèn'
  | 'Quầy Xuất Nhanh & Dịch vụ'
  | 'Quầy Xuất Nhanh & Dịch vụ POS';

export type ProductStatus = 'active' | 'low_stock' | 'out_of_stock' | 'discontinued';

export type MovementType = 'inbound' | 'outbound' | 'adjustment' | 'sale_deduction';
export type MovementStatus = 'pending' | 'completed' | 'cancelled';

export type SalesChannel =
  | 'Dịch vụ Lắp đặt Trực tiếp tại Xưởng'
  | 'Bán lẻ Quầy Showroom'
  | 'Bán lẻ Quầy POS Showroom'
  | 'Phân phối Đại lý & Gara Đối tác (B2B)'
  | 'Đơn đặt hàng Online / Hotline';

export type PaymentMethod =
  | 'Chuyển khoản QR'
  | 'CK CT'
  | 'MPost'
  | 'ĐT'
  | 'Tiền mặt'
  | 'Công nợ'
  | 'Công nợ Đại lý 30 ngày'
  | 'Quẹt thẻ'
  | 'Thẻ POS'
  | 'Kết hợp';

export type OrderStatus = 'pending' | 'completed' | 'refunded';

export interface StaffPermissions {
  permDashboardView: boolean;
  permDailyReportView: boolean;
  permSalesCreate: boolean;
  permInventoryView: boolean;
  permCustomersView: boolean;
  permFinanceView: boolean;
  permCostPriceView: boolean;
  permCustomerListView: boolean;
  permSalesReportView: boolean;
  permNetRevenueView: boolean;
  permGrossProfitView: boolean;
  permNetProfitView: boolean;
  // Các quyền nội dung chuyên sâu (Deep Content Permissions)
  permSalesViewAll?: boolean;
  permDailyReportViewAll?: boolean;
  permSalesDiscountEdit?: boolean;
  permCustomerPhoneView?: boolean;
  permCustomerEdit?: boolean;
  permFinanceCashbook?: boolean;
  permFinanceFixedExpenses?: boolean;
  permInventoryImportExport?: boolean;
  // Các quyền thao tác nghiệp vụ kho & hệ thống
  permInventoryEdit: boolean;
  permStockApprove: boolean;
  permSalesRefund: boolean;
  permReportExport: boolean;
  permStaffManage: boolean;
}

export interface StaffPublicProfile extends StaffPermissions {
  staffId: string;
  orgId: '365MD';
  username: string;
  passwordPlain?: string;
  fullName: string;
  employeeCode: string;
  role: StaffRole;
  department: StaffDepartment;
  branch: string;
  status: StaffStatus;
  monthlyKpiVnd?: number;
  kpiWorkingDays?: number;
  kpiMonthStr?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StaffPrivateInfo {
  staffId: string;
  orgId: '365MD';
  email: string;
  phone: string;
  baseSalaryVnd: number;
  contractType: ContractType;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AccountCredential {
  staffId: string;
  username: string;
  passwordPlain: string;
}

export interface Product {
  productId: string;
  orgId: '365MD';
  sku: string;
  name: string;
  supplier: string;
  category: ProductCategory;
  unit: ProductUnit;
  warehouseZone: WarehouseZone;
  batchNumber: string;
  costPriceVnd: number;
  sellPriceVnd: number;
  stockQty: number;
  minStockThreshold: number;
  paymentMethod?: string;
  status: ProductStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StockMovement {
  movementId: string;
  orgId: '365MD';
  movementCode: string;
  productId: string;
  productSku: string;
  productName: string;
  type: MovementType;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  unitValueVnd: number;
  partnerOrReason: string;
  status: MovementStatus;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SalesOrder {
  orderId: string;
  orgId: '365MD';
  invoiceNumber: string;
  customerName: string;
  customerTaxOrRefCode: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  primaryProductId: string;
  itemsSummary: string;
  totalUnits: number;
  subtotalVnd: number;
  discountVnd: number;
  vatVnd: number;
  totalRevenueVnd: number;
  totalCostVnd: number;
  grossProfitVnd: number;
  status: OrderStatus;
  cashierId: string;
  cashierName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CashVoucherType = 'receipt' | 'payment';
export type VoucherType = CashVoucherType;
export type CashFundType = 'Tiền mặt' | 'Ngân hàng / Chuyển khoản' | 'Ngân hàng / QR';

export type ExpensePaymentForm =
  | 'CK'
  | 'Tiền mặt'
  | 'TK công ty'
  | 'CK cá nhân'
  | 'Đối trừ nợ'
  | 'Thẻ visa'
  | 'Hình thức khác';

export type VoucherCategory = string;
export type CashVoucherCategory = VoucherCategory;

export interface CashVoucher {
  voucherId: string;
  orgId: '365MD';
  voucherCode: string;
  type: VoucherType;
  fundType: CashFundType;
  paymentForm?: string;
  category: VoucherCategory;
  amountVnd: number;
  targetName: string;
  referenceCode: string;
  description: string;
  status: 'completed' | 'cancelled';
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CustomerType = 'Cá nhân' | 'Khách ĐL / Gara';

export interface Customer {
  customerId: string;
  orgId: '365MD';
  customerCode: string;
  name: string;
  phone: string;
  customerType: CustomerType;
  vehicleOrGroup: string;
  address: string;
  note: string;
  branch: string;
  createdDateStr: string;
  lastTransactionDateStr: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Giám đốc Điều hành (Full Admin)',
  warehouse_manager: 'Trưởng Kho Hàng',
  sales_lead: 'Trưởng Bộ phận Bán hàng',
  cashier: 'Chuyên viên Thu ngân',
  auditor: 'Kiểm soát viên & Kế toán',
};

export const PERMISSION_METADATA: Array<{
  key: keyof StaffPermissions;
  shortLabel: string;
  title: string;
  desc: string;
  group: 'tabs' | 'data_reports' | 'deep_content' | 'operations';
}> = [
  // NHÓM 1: 6 TAB CHÍNH
  {
    key: 'permDashboardView',
    shortLabel: 'Tổng quan',
    title: 'Tổng quan',
    desc: 'Cho phép truy cập và xem màn hình Tab Tổng quan.',
    group: 'tabs',
  },
  {
    key: 'permDailyReportView',
    shortLabel: 'Daily report',
    title: 'Daily report',
    desc: 'Cho phép truy cập và báo cáo kết quả công việc tại Tab Daily Report.',
    group: 'tabs',
  },
  {
    key: 'permSalesCreate',
    shortLabel: 'Bán hàng',
    title: 'Bán hàng',
    desc: 'Cho phép truy cập Tab Bán hàng, lập hóa đơn dịch vụ/bán lẻ & thu tiền.',
    group: 'tabs',
  },
  {
    key: 'permInventoryView',
    shortLabel: 'Kho hàng',
    title: 'Kho hàng',
    desc: 'Cho phép truy cập Tab Kho hàng và xem số lượng tồn kho, giá bán.',
    group: 'tabs',
  },
  {
    key: 'permCustomersView',
    shortLabel: 'Khách hàng',
    title: 'Khách hàng',
    desc: 'Cho phép truy cập Tab Khách hàng & tra cứu lịch sử lắp đặt bảo hành.',
    group: 'tabs',
  },
  {
    key: 'permFinanceView',
    shortLabel: 'Quản lý Tài chính',
    title: 'Quản lý Tài chính',
    desc: 'Cho phép hiển thị và truy cập Tab Quản lý Tài chính (Sổ quỹ, Chi phí, Báo cáo) trên Mobile & PC.',
    group: 'tabs',
  },

  // NHÓM 2: 6 CHỈ SỐ GIÁ VỐN, KHÁCH HÀNG, DOANH SỐ & LỢI NHUẬN
  {
    key: 'permCostPriceView',
    shortLabel: 'Giá vốn',
    title: 'Giá vốn',
    desc: 'Cho phép xem giá vốn từng sản phẩm và tổng giá trị tiền nhập kho.',
    group: 'data_reports',
  },
  {
    key: 'permCustomerListView',
    shortLabel: 'DS Khách hàng',
    title: 'Danh sách KH',
    desc: 'Cho phép xem đầy đủ danh sách khách hàng, biển số xe và lịch sử dịch vụ.',
    group: 'data_reports',
  },
  {
    key: 'permSalesReportView',
    shortLabel: 'BC Doanh số',
    title: 'Báo cáo doanh số',
    desc: 'Cho phép xem biểu đồ cột doanh số và bảng thống kê kết quả bán hàng.',
    group: 'data_reports',
  },
  {
    key: 'permNetRevenueView',
    shortLabel: 'Doanh thu dòng',
    title: 'Xem Doanh thu dòng',
    desc: 'Cho phép xem chỉ số Doanh thu dòng (Doanh thu ròng thực thu) trên Tổng quan.',
    group: 'data_reports',
  },
  {
    key: 'permGrossProfitView',
    shortLabel: 'LN Gộp (Sau GV)',
    title: 'Lãi sau GV (LN Gộp)',
    desc: 'Cho phép xem số tiền Lãi sau giá vốn (LN Gộp) và tỷ lệ % lãi gộp.',
    group: 'data_reports',
  },
  {
    key: 'permNetProfitView',
    shortLabel: 'LN Dòng (Sau CP)',
    title: 'Lãi sau CP (LN Dòng)',
    desc: 'Cho phép xem số tiền Lãi sau chi phí (LN Dòng/Ròng) và tỷ lệ % lãi ròng.',
    group: 'data_reports',
  },

  // NHÓM 3: 8 QUYỀN NỘI DUNG CHUYÊN SÂU (DEEP CONTENT)
  {
    key: 'permSalesViewAll',
    shortLabel: 'Đơn toàn đội',
    title: 'Xem đơn mọi Sale',
    desc: 'BẬT: Xem hóa đơn của toàn chi nhánh. TẮT: Chỉ xem đơn hàng của chính mình.',
    group: 'deep_content',
  },
  {
    key: 'permDailyReportViewAll',
    shortLabel: 'DR toàn đội',
    title: 'Xem Daily Report đội',
    desc: 'BẬT: Xem báo cáo của tất cả Sale. TẮT: Chỉ xem kết quả Daily Report cá nhân.',
    group: 'deep_content',
  },
  {
    key: 'permSalesDiscountEdit',
    shortLabel: 'Sửa Giá/CK',
    title: 'Sửa giá bán & CK',
    desc: 'Cho phép chỉnh sửa đơn giá bán và nhập chiết khấu giảm giá khi lập đơn.',
    group: 'deep_content',
  },
  {
    key: 'permCustomerPhoneView',
    shortLabel: 'Xem SĐT KH',
    title: 'Xem SĐT đầy đủ KH',
    desc: 'BẬT: Hiển thị trọn vẹn số điện thoại KH. TẮT: Ẩn bớt số giữa (090***68) bảo mật.',
    group: 'deep_content',
  },
  {
    key: 'permCustomerEdit',
    shortLabel: 'Thêm/Sửa KH',
    title: 'Thêm & Sửa hồ sơ KH',
    desc: 'Cho phép tạo mới, cập nhật thông tin khách hàng và đồng bộ Excel khách hàng.',
    group: 'deep_content',
  },
  {
    key: 'permFinanceCashbook',
    shortLabel: 'Sổ quỹ Thu/Chi',
    title: 'Sổ quỹ & Lập phiếu',
    desc: 'Cho phép xem số dư quỹ Tiền mặt/Ngân hàng và lập phiếu Thu - Chi trong Tài chính.',
    group: 'deep_content',
  },
  {
    key: 'permFinanceFixedExpenses',
    shortLabel: 'Chi phí cố định',
    title: 'Cấu hình CP cố định',
    desc: 'Cho phép xem và chỉnh sửa bảng Chi phí cố định hàng tháng (Mặt bằng, Lương, Ads...).',
    group: 'deep_content',
  },
  {
    key: 'permInventoryImportExport',
    shortLabel: 'Đồng bộ Excel',
    title: 'Nhập/Xuất Excel Kiot',
    desc: 'Cho phép sử dụng công cụ đồng bộ nhanh dữ liệu Hàng hóa / Hóa đơn từ file Excel.',
    group: 'deep_content',
  },

  // NHÓM 4: 5 QUYỀN THAO TÁC KHO & QUẢN TRỊ HỆ THỐNG
  {
    key: 'permInventoryEdit',
    shortLabel: 'Sửa Kho & Giá',
    title: 'Thêm/Sửa SP & Giá',
    desc: 'Cho phép tạo mã hàng mới, chỉnh sửa giá vốn, giá bán và thông tin sản phẩm.',
    group: 'operations',
  },
  {
    key: 'permStockApprove',
    shortLabel: 'Duyệt Phiếu Kho',
    title: 'Duyệt Nhập/Xuất/KK',
    desc: 'Cho phép duyệt hoặc hủy phiếu nhập xuất kho và chốt số liệu kiểm kê.',
    group: 'operations',
  },
  {
    key: 'permSalesRefund',
    shortLabel: 'Hoàn Tiền Đơn',
    title: 'Hoàn tiền & Nhập trả',
    desc: 'Cho phép hủy/hoàn tiền hóa đơn đã thanh toán và hoàn trả hàng về kho.',
    group: 'operations',
  },
  {
    key: 'permReportExport',
    shortLabel: 'Xuất PDF A4',
    title: 'Xuất Báo cáo PDF',
    desc: 'Cho phép tải xuống báo cáo tổng hợp định kỳ chuẩn trang in A4 PDF.',
    group: 'operations',
  },
  {
    key: 'permStaffManage',
    shortLabel: 'Quản trị Admin',
    title: 'Phân quyền & Account',
    desc: 'Toàn quyền tạo tài khoản nhân sự mới, đổi mật khẩu và bật/tắt phân quyền.',
    group: 'operations',
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  admin: {
    permDashboardView: true,
    permDailyReportView: true,
    permSalesCreate: true,
    permInventoryView: true,
    permCustomersView: true,
    permFinanceView: true,
    permCostPriceView: true,
    permCustomerListView: true,
    permSalesReportView: true,
    permNetRevenueView: true,
    permGrossProfitView: true,
    permNetProfitView: true,
    permSalesViewAll: true,
    permDailyReportViewAll: true,
    permSalesDiscountEdit: true,
    permCustomerPhoneView: true,
    permCustomerEdit: true,
    permFinanceCashbook: true,
    permFinanceFixedExpenses: true,
    permInventoryImportExport: true,
    permInventoryEdit: true,
    permStockApprove: true,
    permSalesRefund: true,
    permReportExport: true,
    permStaffManage: true,
  },
  warehouse_manager: {
    permDashboardView: true,
    permDailyReportView: false,
    permSalesCreate: false,
    permInventoryView: true,
    permCustomersView: true,
    permFinanceView: false,
    permCostPriceView: true,
    permCustomerListView: true,
    permSalesReportView: false,
    permNetRevenueView: false,
    permGrossProfitView: false,
    permNetProfitView: false,
    permSalesViewAll: false,
    permDailyReportViewAll: false,
    permSalesDiscountEdit: false,
    permCustomerPhoneView: true,
    permCustomerEdit: false,
    permFinanceCashbook: false,
    permFinanceFixedExpenses: false,
    permInventoryImportExport: true,
    permInventoryEdit: true,
    permStockApprove: true,
    permSalesRefund: false,
    permReportExport: true,
    permStaffManage: false,
  },
  sales_lead: {
    permDashboardView: true,
    permDailyReportView: true,
    permSalesCreate: true,
    permInventoryView: true,
    permCustomersView: true,
    permFinanceView: false,
    permCostPriceView: false,
    permCustomerListView: true,
    permSalesReportView: true,
    permNetRevenueView: true,
    permGrossProfitView: false,
    permNetProfitView: false,
    permSalesViewAll: false,
    permDailyReportViewAll: false,
    permSalesDiscountEdit: true,
    permCustomerPhoneView: true,
    permCustomerEdit: true,
    permFinanceCashbook: false,
    permFinanceFixedExpenses: false,
    permInventoryImportExport: false,
    permInventoryEdit: false,
    permStockApprove: false,
    permSalesRefund: false,
    permReportExport: true,
    permStaffManage: false,
  },
  cashier: {
    permDashboardView: true,
    permDailyReportView: true,
    permSalesCreate: true,
    permInventoryView: true,
    permCustomersView: true,
    permFinanceView: false,
    permCostPriceView: false,
    permCustomerListView: true,
    permSalesReportView: true,
    permNetRevenueView: true,
    permGrossProfitView: false,
    permNetProfitView: false,
    permSalesViewAll: true,
    permDailyReportViewAll: false,
    permSalesDiscountEdit: true,
    permCustomerPhoneView: true,
    permCustomerEdit: true,
    permFinanceCashbook: false,
    permFinanceFixedExpenses: false,
    permInventoryImportExport: false,
    permInventoryEdit: false,
    permStockApprove: false,
    permSalesRefund: false,
    permReportExport: false,
    permStaffManage: false,
  },
  auditor: {
    permDashboardView: true,
    permDailyReportView: true,
    permSalesCreate: true,
    permInventoryView: true,
    permCustomersView: true,
    permFinanceView: true,
    permCostPriceView: true,
    permCustomerListView: true,
    permSalesReportView: true,
    permNetRevenueView: true,
    permGrossProfitView: true,
    permNetProfitView: true,
    permSalesViewAll: true,
    permDailyReportViewAll: true,
    permSalesDiscountEdit: true,
    permCustomerPhoneView: true,
    permCustomerEdit: true,
    permFinanceCashbook: true,
    permFinanceFixedExpenses: true,
    permInventoryImportExport: true,
    permInventoryEdit: true,
    permStockApprove: true,
    permSalesRefund: true,
    permReportExport: true,
    permStaffManage: false,
  },
};

export function sanitizeString(val: string, maxLen: number, fallback = 'N/A'): string {
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

export function sanitizeUsername(val: string): string {
  const cleaned = val
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]/g, '');
  if (cleaned.length < 3) return `nv_${cleaned || '365md'}`;
  return cleaned.slice(0, VALIDATION_RULES.USERNAME_MAX_LEN);
}

export function computeProductStatus(stockQty: number, _minStockThreshold = 0): ProductStatus {
  if (stockQty <= 0) return 'out_of_stock';
  return 'active';
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0));
}

export function formatTimestamp(ts?: Timestamp | { toDate?: () => Date; seconds?: number } | null): string {
  if (!ts) return 'Vừa xong';
  let d: Date;
  if (typeof ts.toDate === 'function') {
    d = ts.toDate();
  } else if (typeof (ts as { seconds?: number }).seconds === 'number') {
    d = new Date(((ts as { seconds: number }).seconds) * 1000);
  } else {
    d = new Date();
  }
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
