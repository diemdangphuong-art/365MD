import { jsPDF } from 'jspdf';
import {
  BRAND_LOGO_PATH,
  formatNumber,
  formatTimestamp,
  formatVnd,
  Product,
  ROLE_LABELS,
  SalesOrder,
  StaffPublicProfile,
  StockMovement,
} from './types';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'all';
export type ReportType = 'revenue_summary' | 'inventory_valuation' | 'stock_ledger' | 'staff_rbac';

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: 'Báo cáo Ngày (24 giờ qua)',
  weekly: 'Báo cáo Tuần (7 ngày qua)',
  monthly: 'Báo cáo Tháng (30 ngày qua)',
  quarterly: 'Báo cáo Quý (90 ngày qua)',
  all: 'Toàn bộ Kỳ Hoạt động',
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  revenue_summary: 'Báo cáo Doanh thu, Chi phí Giá vốn & Lợi nhuận Gộp',
  inventory_valuation: 'Báo cáo Kiểm kê Tồn kho, Giá trị Vật tư & Cảnh báo Đặt hàng',
  stock_ledger: 'Báo cáo Sổ cái Xuất - Nhập - Tồn Kho Hàng',
  staff_rbac: 'Báo cáo Nhân sự & Ma trận Phân quyền Kiểm soát Nội bộ',
};

function loadBrandLogoImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawSharpenedBrandHeader(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement | null,
  x: number,
  y: number
) {
  if (logoImg) {
    // Crop out bottom 14% artifact line from source image and render with high contrast
    const srcW = logoImg.naturalWidth || logoImg.width;
    const srcH = Math.floor((logoImg.naturalHeight || logoImg.height) * 0.84);
    const destW = 240;
    const destH = Math.round((srcH / srcW) * destW);
    ctx.save();
    ctx.filter = 'contrast(1.38) brightness(1.04) saturate(1.25)';
    ctx.drawImage(logoImg, 0, 0, srcW, srcH, x, y, destW, destH);
    ctx.restore();
  }
}

/**
 * Renders full Vietnamese text and structured tables onto a high-DPI offscreen HTML5 Canvas
 * and exports a multi-page A4 PDF using jsPDF.
 */
export async function exportPeriodicReportToPdf(params: {
  reportType: ReportType;
  period: ReportPeriod;
  preparedBy: string;
  branchName: string;
  orders: SalesOrder[];
  products: Product[];
  movements: StockMovement[];
  staff: StaffPublicProfile[];
}): Promise<string> {
  const { reportType, period, preparedBy, branchName, orders, products, movements, staff } = params;

  const PAGE_W = 1588;
  const PAGE_H = 2246;
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo bộ kết xuất PDF Canvas.');

  const logoImg = await loadBrandLogoImage(BRAND_LOGO_PATH);

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Top Header Strip (Dark Slate + Auto365 Red Accent)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(80, 68, PAGE_W - 160, 6);
  ctx.fillStyle = '#E11D48';
  ctx.fillRect(80, 68, 260, 6);

  // Draw Logo on top-left
  drawSharpenedBrandHeader(ctx, logoImg, 80, 90);

  const brandTextX = logoImg ? 340 : 80;
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('365MD — AUTO365 MỸ ĐÌNH HÀ NỘI', brandTextX, 126);

  ctx.fillStyle = '#475569';
  ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Chi nhánh / Phân khu: ${branchName}  ·  Mã đơn vị: 365MD-HN`, brandTextX, 160);
  ctx.fillText('Hệ thống Quản lý Kho Hàng, Bán hàng Dịch vụ & Báo cáo Doanh thu Thời gian thực', brandTextX, 190);

  // Document Code Right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px "IBM Plex Mono", monospace';
  const docCode = `BC-365MD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  ctx.fillText(`MÃ BÁO CÁO: ${docCode}`, PAGE_W - 80, 126);

  ctx.fillStyle = '#475569';
  ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Kỳ báo cáo: ${PERIOD_LABELS[period]}`, PAGE_W - 80, 160);
  ctx.fillText(
    `Thời điểm kết xuất: ${new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())}`,
    PAGE_W - 80,
    190
  );
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 224);
  ctx.lineTo(PAGE_W - 80, 224);
  ctx.stroke();

  // Report Main Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(REPORT_TYPE_LABELS[reportType].toUpperCase(), 80, 284);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Người lập biểu: ${preparedBy}   ·   Đơn vị tiền tệ: Đồng Việt Nam (VND)   ·   Hệ thống 365MD`,
    80,
    322
  );

  // KPI Summary Strip (4 boxes)
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const totalRev = completedOrders.reduce((acc, o) => acc + o.totalRevenueVnd, 0);
  const totalProfit = completedOrders.reduce((acc, o) => acc + o.grossProfitVnd, 0);
  const inventoryVal = products.reduce((acc, p) => acc + Math.max(0, p.stockQty) * p.costPriceVnd, 0);
  const inStockCount = products.filter((p) => p.stockQty > 0).length;
  const outStockCount = products.filter((p) => p.stockQty <= 0).length;

  const kpis = [
    { label: 'TỔNG DOANH THU RÒNG', value: formatVnd(totalRev), sub: `${completedOrders.length} hóa đơn hoàn tất` },
    { label: 'LỢI NHUẬN GỘP THỰC TẾ', value: formatVnd(totalProfit), sub: `Biên LN: ${totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0'}%` },
    { label: 'GIÁ TRỊ TỒN KHO GIÁ VỐN', value: formatVnd(inventoryVal), sub: `${inStockCount}/${products.length} mã còn tồn kho` },
    { label: 'MÃ HÀNG HẾT TỒN (0)', value: `${outStockCount} mã`, sub: `${staff.filter((s) => s.status === 'active').length} nhân sự đang hoạt động` },
  ];

  const boxW = (PAGE_W - 160 - 48) / 4;
  kpis.forEach((kpi, idx) => {
    const bx = 80 + idx * (boxW + 16);
    const by = 360;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(bx, by, boxW, 136);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, 136);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(kpi.label, bx + 20, by + 36);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px "IBM Plex Mono", monospace';
    ctx.fillText(kpi.value, bx + 20, by + 82);

    ctx.fillStyle = '#475569';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(kpi.sub, bx + 20, by + 114);
  });

  // Table Section
  let curY = 540;
  const drawTableHeader = (cols: Array<{ title: string; x: number; align?: 'left' | 'right' }>) => {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(80, curY, PAGE_W - 160, 54);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    cols.forEach((c) => {
      ctx.textAlign = c.align || 'left';
      ctx.fillText(c.title, c.x, curY + 34);
    });
    ctx.textAlign = 'left';
    curY += 54;
  };

  const truncateText = (str: string, maxChars: number) =>
    str.length > maxChars ? str.slice(0, maxChars - 1) + '…' : str;

  if (reportType === 'revenue_summary') {
    const cols = [
      { title: 'MÃ HÓA ĐƠN', x: 96 },
      { title: 'KHÁCH HÀNG / ĐỐI TÁC', x: 290 },
      { title: 'KÊNH BÁN HÀNG', x: 720 },
      { title: 'TRẠNG THÁI', x: 1020 },
      { title: 'DOANH THU RÒNG', x: 1300, align: 'right' as const },
      { title: 'LỢI NHUẬN GỘP', x: PAGE_W - 96, align: 'right' as const },
    ];
    drawTableHeader(cols);

    if (orders.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Chưa có phát sinh hóa đơn bán hàng trong kỳ báo cáo này.', 96, curY + 48);
      curY += 80;
    } else {
      orders.slice(0, 18).forEach((o, i) => {
        if (i % 2 === 1) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(80, curY, PAGE_W - 160, 52);
        }
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, curY + 52);
        ctx.lineTo(PAGE_W - 80, curY + 52);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = '600 18px "IBM Plex Mono", monospace';
        ctx.fillText(o.invoiceNumber, 96, curY + 33);

        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(truncateText(o.customerName, 34), 290, curY + 33);

        ctx.fillStyle = '#475569';
        ctx.fillText(truncateText(o.channel.replace(/\s*POS/gi, ''), 24), 720, curY + 33);

        const statusText =
          o.status === 'completed' ? 'Hoàn tất' : o.status === 'pending' ? 'Chờ thanh toán' : 'Đã hoàn tiền';
        ctx.fillStyle =
          o.status === 'completed' ? '#16A34A' : o.status === 'pending' ? '#D97706' : '#DC2626';
        ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(statusText, 1020, curY + 33);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#0F172A';
        ctx.font = '600 18px "IBM Plex Mono", monospace';
        ctx.fillText(formatVnd(o.totalRevenueVnd), 1300, curY + 33);
        ctx.fillText(formatVnd(o.grossProfitVnd), PAGE_W - 96, curY + 33);
        ctx.textAlign = 'left';

        curY += 52;
      });
    }
  } else if (reportType === 'inventory_valuation') {
    const cols = [
      { title: 'MÃ HÀNG', x: 96 },
      { title: 'TÊN SẢN PHẨM / VẬT TƯ', x: 290 },
      { title: 'PHÂN KHU KHO', x: 760 },
      { title: 'TỒN KHO', x: 1090, align: 'right' as const },
      { title: 'ĐƠN GIÁ VỐN', x: 1290, align: 'right' as const },
      { title: 'THÀNH TIỀN VỐN', x: PAGE_W - 96, align: 'right' as const },
    ];
    drawTableHeader(cols);

    if (products.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Danh mục kho hiện đang trống (0 mã hàng).', 96, curY + 48);
      curY += 80;
    } else {
      const sortedForAudit = [...products].sort(
        (a, b) => Math.max(0, b.stockQty) * b.costPriceVnd - Math.max(0, a.stockQty) * a.costPriceVnd
      );
      sortedForAudit.slice(0, 18).forEach((p, i) => {
        if (i % 2 === 1) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(80, curY, PAGE_W - 160, 52);
        }
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, curY + 52);
        ctx.lineTo(PAGE_W - 80, curY + 52);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = '600 17px "IBM Plex Mono", monospace';
        ctx.fillText(truncateText(p.sku, 16), 96, curY + 33);

        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(truncateText(p.name, 36), 290, curY + 33);

        ctx.fillStyle = '#475569';
        ctx.fillText(truncateText((p.batchNumber || p.warehouseZone).replace(/\s*POS/gi, ''), 24), 760, curY + 33);

        ctx.textAlign = 'right';
        ctx.fillStyle = p.stockQty <= 0 ? '#DC2626' : '#0F172A';
        ctx.font = 'bold 18px "IBM Plex Mono", monospace';
        ctx.fillText(`${formatNumber(p.stockQty)} ${p.unit}`, 1090, curY + 33);

        ctx.fillStyle = '#0F172A';
        ctx.font = '500 18px "IBM Plex Mono", monospace';
        ctx.fillText(formatVnd(p.costPriceVnd), 1290, curY + 33);
        ctx.font = 'bold 18px "IBM Plex Mono", monospace';
        ctx.fillText(formatVnd(Math.max(0, p.stockQty) * p.costPriceVnd), PAGE_W - 96, curY + 33);
        ctx.textAlign = 'left';

        curY += 52;
      });
    }
  } else if (reportType === 'stock_ledger') {
    const cols = [
      { title: 'MÃ PHIẾU', x: 96 },
      { title: 'SẢN PHẨM', x: 280 },
      { title: 'LOẠI GIAO DỊCH', x: 740 },
      { title: 'BIẾN ĐỘNG', x: 1030, align: 'right' as const },
      { title: 'TỒN SAU GD', x: 1210, align: 'right' as const },
      { title: 'TRẠNG THÁI', x: PAGE_W - 96, align: 'right' as const },
    ];
    drawTableHeader(cols);

    if (movements.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Chưa có lịch sử phiếu nhập - xuất - kiểm kê kho.', 96, curY + 48);
      curY += 80;
    } else {
      movements.slice(0, 18).forEach((m, i) => {
        if (i % 2 === 1) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(80, curY, PAGE_W - 160, 52);
        }
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, curY + 52);
        ctx.lineTo(PAGE_W - 80, curY + 52);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = '600 17px "IBM Plex Mono", monospace';
        ctx.fillText(m.movementCode, 96, curY + 33);

        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(truncateText(`${m.productSku} — ${m.productName}`, 34), 280, curY + 33);

        const typeLabel =
          m.type === 'inbound'
            ? 'Nhập kho vật tư'
            : m.type === 'outbound'
            ? 'Xuất kho nội bộ'
            : m.type === 'sale_deduction'
            ? 'Xuất bán hàng/B2B'
            : 'Kiểm kê điều chỉnh';
        ctx.fillStyle = '#475569';
        ctx.fillText(typeLabel, 740, curY + 33);

        ctx.textAlign = 'right';
        ctx.fillStyle = m.quantityDelta >= 0 ? '#16A34A' : '#DC2626';
        ctx.font = 'bold 18px "IBM Plex Mono", monospace';
        ctx.fillText(
          `${m.quantityDelta > 0 ? '+' : ''}${formatNumber(m.quantityDelta)}`,
          1030,
          curY + 33
        );

        ctx.fillStyle = '#0F172A';
        ctx.fillText(formatNumber(m.stockAfter), 1210, curY + 33);

        ctx.fillStyle =
          m.status === 'completed' ? '#16A34A' : m.status === 'pending' ? '#D97706' : '#DC2626';
        ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(
          m.status === 'completed' ? 'Đã duyệt' : m.status === 'pending' ? 'Chờ duyệt' : 'Đã hủy',
          PAGE_W - 96,
          curY + 33
        );
        ctx.textAlign = 'left';

        curY += 52;
      });
    }
  } else {
    const cols = [
      { title: 'MÃ NV', x: 96 },
      { title: 'HỌ VÀ TÊN NHÂN SỰ', x: 230 },
      { title: 'PHÒNG BAN', x: 640 },
      { title: 'VAI TRÒ PHÂN QUYỀN', x: 920 },
      { title: 'QUYỀN KHO / BÁN HÀNG / BÁO CÁO', x: PAGE_W - 96, align: 'right' as const },
    ];
    drawTableHeader(cols);

    staff.slice(0, 18).forEach((s, i) => {
      if (i % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(80, curY, PAGE_W - 160, 52);
      }
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, curY + 52);
      ctx.lineTo(PAGE_W - 80, curY + 52);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '600 17px "IBM Plex Mono", monospace';
      ctx.fillText(s.employeeCode, 96, curY + 33);

      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(truncateText(s.fullName, 30), 230, curY + 33);

      ctx.fillStyle = '#475569';
      ctx.fillText(s.department.replace(/\s*POS/gi, ''), 640, curY + 33);
      ctx.fillText(truncateText(ROLE_LABELS[s.role], 26), 920, curY + 33);

      const permFlags = [
        s.permInventoryEdit ? 'Sửa Kho' : 'Xem Kho',
        s.permStockApprove ? 'Duyệt Phiếu' : null,
        s.permSalesCreate ? 'Bán hàng' : null,
        s.permReportExport ? 'Xuất PDF' : null,
        s.permStaffManage ? 'Quản trị RBAC' : null,
      ]
        .filter(Boolean)
        .join(' · ');

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(permFlags, PAGE_W - 96, curY + 33);
      ctx.textAlign = 'left';

      curY += 52;
    });
  }

  // Signature Block at Bottom of A4 Page
  const sigY = Math.max(curY + 90, PAGE_H - 360);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, sigY - 36);
  ctx.lineTo(PAGE_W - 80, sigY - 36);
  ctx.stroke();

  const sigCols = [
    { title: 'NGƯỜI LẬP BIỂU', sub: '(Ký, ghi rõ họ tên)', name: preparedBy, x: 260 },
    { title: 'KẾ TOÁN / KIỂM SOÁT KHO', sub: '(Kiểm tra đối chiếu sổ cái)', name: 'Bộ phận Kế toán & Kiểm soát 365MD', x: PAGE_W / 2 },
    { title: 'BAN GIÁM ĐỐC 365MD', sub: '(Ký tên & Đóng dấu xác nhận)', name: 'Auto365 Mỹ Đình - Hà Nội', x: PAGE_W - 260 },
  ];

  sigCols.forEach((sc) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sc.title, sc.x, sigY + 10);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sc.sub, sc.x, sigY + 38);

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sc.name, sc.x, sigY + 165);
  });
  ctx.textAlign = 'left';

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Tài liệu lưu hành nội bộ thuộc Hệ thống Quản trị 365MD (Auto365 Mỹ Đình - Hà Nội) — Kết xuất từ Cơ sở dữ liệu Thời gian thực.',
    80,
    PAGE_H - 60
  );
  ctx.textAlign = 'right';
  ctx.fillText('Trang 01 / 01', PAGE_W - 80, PAGE_H - 60);

  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  const fileName = `365MD_${reportType}_${period}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
  return fileName;
}

export interface InvoiceWorkDetails {
  customerId?: string;
  customerSource?: string;
  customerPhone?: string;
  licensePlate?: string;
  customerAddress?: string;
  companyName?: string;
  taxCode?: string;
  carBrand?: string;
  carModel?: string;
  salesPerson?: string;
  mainTechs?: string[];
  subTechs?: string[];
  externalTechs?: string;
  hasWindowTint?: boolean;
  windowTintNote?: string;
  workStatusLabel?: string;
  paymentModeLabel?: string;
  createdDateDisplay?: string;
  warrantySummary?: string;
  serviceLines?: Array<{
    serviceName: string;
    packageDetail: string;
    qty: number;
    unitPriceVnd: number;
    warrantyPeriod?: string;
  }>;
}

/**
 * Exports a single POS/B2B Sales Invoice directly to an A4 PDF document.
 */
export async function exportSingleInvoiceToPdf(
  order: SalesOrder,
  workDetails?: InvoiceWorkDetails
): Promise<string> {
  const PAGE_W = 1588;
  const PAGE_H = 2246;
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo bộ kết xuất Hóa đơn PDF.');

  const logoImg = await loadBrandLogoImage(BRAND_LOGO_PATH);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(80, 72, PAGE_W - 160, 8);
  ctx.fillStyle = '#E11D48';
  ctx.fillRect(80, 72, 260, 8);

  drawSharpenedBrandHeader(ctx, logoImg, 80, 96);

  const headerX = logoImg ? 340 : 80;
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('365MD — HÓA ĐƠN BÁN HÀNG & PHIẾU XUẤT KHO', headerX, 136);

  const salesPersonDisplay = workDetails?.salesPerson || order.cashierName;
  const createdTimeDisplay = workDetails?.createdDateDisplay || formatTimestamp(order.createdAt);

  ctx.fillStyle = '#475569';
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Mã hóa đơn: ${order.invoiceNumber}   ·   Kênh phân phối: ${order.channel.replace(/\s*POS/gi, '')}`,
    headerX,
    176
  );
  ctx.fillText(
    `Thời gian lập: ${createdTimeDisplay}   ·   Phụ trách: ${salesPersonDisplay}`,
    headerX,
    210
  );

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 250);
  ctx.lineTo(PAGE_W - 80, 250);
  ctx.stroke();

  // Extract Plate & Phone from workDetails or fallback from order.customerTaxOrRefCode
  const rawRefParts = (order.customerTaxOrRefCode || '')
    .split(/[·\-|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const fallbackPlate =
    rawRefParts[0] && rawRefParts[0] !== 'KH-365MD' ? rawRefParts[0] : 'Chưa cập nhật';
  const fallbackPhone = rawRefParts[1] || 'Chưa cập nhật';

  const plateDisplay =
    workDetails?.licensePlate && workDetails.licensePlate !== 'Chưa cập nhật'
      ? workDetails.licensePlate
      : fallbackPlate;
  const phoneDisplay =
    workDetails?.customerPhone && workDetails.customerPhone !== 'Chưa cập nhật'
      ? workDetails.customerPhone
      : fallbackPhone;
  const addressDisplay =
    workDetails?.customerAddress && workDetails.customerAddress.trim()
      ? workDetails.customerAddress.trim()
      : 'Chưa cập nhật';
  const companyDisplay =
    workDetails?.companyName && workDetails.companyName.trim()
      ? workDetails.companyName.trim()
      : '—';
  const taxCodeDisplay =
    workDetails?.taxCode && workDetails.taxCode.trim() ? workDetails.taxCode.trim() : '—';

  const statusVi =
    order.status === 'completed'
      ? 'ĐÃ HOÀN THÀNH'
      : order.status === 'pending'
      ? workDetails?.workStatusLabel?.toUpperCase() || 'ĐANG THI CÔNG / CÔNG NỢ'
      : 'ĐÃ HOÀN TIỀN';
  const paymentDisplay =
    workDetails?.paymentModeLabel || order.paymentMethod.replace(/\s*POS/gi, '');

  // Customer Details Box (Expanded for clear separated fields)
  const custBoxY = 278;
  const custBoxH = 236;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(80, custBoxY, PAGE_W - 160, custBoxH);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(80, custBoxY, PAGE_W - 160, custBoxH);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Khách hàng: ${order.customerName}`, 112, custBoxY + 42);

  ctx.fillStyle = '#1E293B';
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Biển số xe: ${plateDisplay}     ·     Số điện thoại của khách: ${phoneDisplay}`,
    112,
    custBoxY + 84
  );

  ctx.fillStyle = '#334155';
  ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Địa chỉ khách hàng: ${addressDisplay}`, 112, custBoxY + 124);
  ctx.fillText(
    `Tên công ty: ${companyDisplay}     ·     Mã số thuế (MST): ${taxCodeDisplay}`,
    112,
    custBoxY + 164
  );
  ctx.fillText(
    `Phương thức thanh toán: ${paymentDisplay}     ·     Trạng thái: ${statusVi}`,
    112,
    custBoxY + 204
  );

  // Extract Service Lines (without KTV string mixed in) & Technician info
  const rawSummaryParts = (order.itemsSummary || '').split(' — ');
  const cleanSummaryWithoutTech = rawSummaryParts[0] || order.itemsSummary || 'Dịch vụ thi công';
  const fallbackTechString = rawSummaryParts.slice(1).join(' — ');

  const linesToRender: Array<{
    serviceName: string;
    packageDetail: string;
    qty: number;
    unitPriceVnd: number;
    lineTotalVnd: number;
    warrantyPeriod?: string;
  }> =
    workDetails?.serviceLines && workDetails.serviceLines.length > 0
      ? workDetails.serviceLines.map((l) => {
          const q = Math.max(1, Number(l.qty) || 1);
          const u = Math.max(0, Number(l.unitPriceVnd) || 0);
          return {
            serviceName: l.serviceName || 'Dịch vụ thi công',
            packageDetail: l.packageDetail || '',
            qty: q,
            unitPriceVnd: u,
            lineTotalVnd: q * u,
            warrantyPeriod: l.warrantyPeriod || '12 tháng',
          };
        })
      : [
          {
            serviceName: cleanSummaryWithoutTech,
            packageDetail: '',
            qty: Math.max(1, order.totalUnits || 1),
            unitPriceVnd:
              order.totalUnits > 0
                ? Math.round(order.subtotalVnd / order.totalUnits)
                : order.subtotalVnd,
            lineTotalVnd: order.subtotalVnd,
            warrantyPeriod: workDetails?.warrantySummary || '',
          },
        ];

  // Order Items Table Header
  let tableY = custBoxY + custBoxH + 36;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(80, tableY, PAGE_W - 160, 56);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('STT', 104, tableY + 35);
  ctx.fillText('CHI TIẾT SẢN PHẨM & DỊCH VỤ XUẤT BÁN', 175, tableY + 35);
  ctx.textAlign = 'center';
  ctx.fillText('BẢO HÀNH', 930, tableY + 35);
  ctx.fillText('SL', 1080, tableY + 35);
  ctx.textAlign = 'right';
  ctx.fillText('ĐƠN GIÁ', 1275, tableY + 35);
  ctx.fillText('THÀNH TIỀN (VND)', PAGE_W - 104, tableY + 35);
  ctx.textAlign = 'left';

  let rowY = tableY + 56;
  const rowH = 68;
  linesToRender.slice(0, 10).forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
    ctx.fillRect(80, rowY, PAGE_W - 160, rowH);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, rowY, PAGE_W - 160, rowH);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px "IBM Plex Mono", monospace';
    ctx.fillText(String(idx + 1), 112, rowY + 41);

    const pkgText = item.packageDetail ? ` [${item.packageDetail}]` : '';
    const fullItemTitle = `${item.serviceName}${pkgText}`;
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      fullItemTitle.length > 44 ? fullItemTitle.slice(0, 43) + '…' : fullItemTitle,
      175,
      rowY + 41
    );

    ctx.textAlign = 'center';
    ctx.fillStyle = '#2F5E3D';
    ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.warrantyPeriod ? `BH: ${item.warrantyPeriod}` : '—', 930, rowY + 41);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 19px "IBM Plex Mono", monospace';
    ctx.fillText(formatNumber(item.qty), 1080, rowY + 41);

    ctx.textAlign = 'right';
    ctx.font = '500 18px "IBM Plex Mono", monospace';
    ctx.fillText(formatVnd(item.unitPriceVnd), 1275, rowY + 41);

    ctx.font = 'bold 19px "IBM Plex Mono", monospace';
    ctx.fillText(formatVnd(item.lineTotalVnd), PAGE_W - 104, rowY + 41);
    ctx.textAlign = 'left';

    rowY += rowH;
  });

  // Dedicated Technician Section Below Product Table (Tách riêng mục Kỹ thuật viên xuống bên dưới)
  const techBoxY = rowY + 24;
  const techBoxH = 96;
  ctx.fillStyle = '#F0FDF4';
  ctx.fillRect(80, techBoxY, PAGE_W - 160, techBoxH);
  ctx.strokeStyle = '#86EFAC';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(80, techBoxY, PAGE_W - 160, techBoxH);

  ctx.fillStyle = '#14532D';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('THÔNG TIN KỸ THUẬT VIÊN THI CÔNG:', 112, techBoxY + 36);

  const mainTechStr =
    workDetails?.mainTechs && workDetails.mainTechs.length > 0
      ? workDetails.mainTechs.join(', ')
      : '';
  const subTechStr =
    workDetails?.subTechs && workDetails.subTechs.length > 0
      ? workDetails.subTechs.join(', ')
      : '';
  const extTechStr =
    workDetails?.externalTechs && workDetails.externalTechs.trim()
      ? workDetails.externalTechs.trim()
      : '';

  let techLineText = '';
  if (mainTechStr || subTechStr || extTechStr) {
    const parts = [
      mainTechStr ? `Kỹ thuật chính: ${mainTechStr}` : '',
      subTechStr ? `Thi công phụ: ${subTechStr}` : '',
      extTechStr ? `Kỹ thuật ngoài: ${extTechStr}` : '',
    ].filter(Boolean);
    techLineText = parts.join('     ·     ');
  } else if (fallbackTechString) {
    techLineText = fallbackTechString
      .replace('KTV Chính:', 'Kỹ thuật chính:')
      .replace('Phụ:', 'Thi công phụ:');
  } else {
    techLineText = 'Kỹ thuật viên xưởng Auto365 Mỹ Đình';
  }

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(techLineText, 112, techBoxY + 72);

  // Totals Breakdown
  const rows = [
    { label: 'Tổng tiền hàng trước thuế (Subtotal):', val: formatVnd(order.subtotalVnd) },
    { label: 'Chiết khấu thương mại (Discount):', val: `-${formatVnd(order.discountVnd)}` },
    { label: 'Thuế Giá trị Gia tăng (VAT):', val: `+${formatVnd(order.vatVnd)}` },
    { label: 'TỔNG THANH TOÁN RÒNG (TOTAL):', val: formatVnd(order.totalRevenueVnd), bold: true },
  ];

  let ry = techBoxY + techBoxH + 64;
  rows.forEach((r) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = r.bold ? '#0F172A' : '#475569';
    ctx.font = r.bold
      ? 'bold 24px "Plus Jakarta Sans", sans-serif'
      : '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(r.label, PAGE_W - 420, ry);

    ctx.fillStyle = '#0F172A';
    ctx.font = r.bold
      ? 'bold 26px "IBM Plex Mono", monospace'
      : '600 21px "IBM Plex Mono", monospace';
    ctx.fillText(r.val, PAGE_W - 110, ry);
    ry += 52;
  });
  ctx.textAlign = 'left';

  // Signatures
  const sigY = Math.max(ry + 80, 1680);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KHÁCH HÀNG XÁC NHẬN', 200, sigY);
  ctx.fillText('ĐẠI DIỆN AUTO365 MỸ ĐÌNH (365MD)', PAGE_W - 560, sigY);

  ctx.fillStyle = '#475569';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(order.customerName, 200, sigY + 140);
  ctx.fillText(salesPersonDisplay, PAGE_W - 560, sigY + 140);

  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  const fileName = `HoaDon_${order.invoiceNumber}.pdf`;
  pdf.save(fileName);
  return fileName;
}
