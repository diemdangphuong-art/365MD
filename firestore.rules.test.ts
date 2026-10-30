/**
 * Firestore Security Rules Verification Suite — 365MD
 * Validates that all 12 adversarial payloads ("Dirty Dozen") return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  docId?: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_SUITE: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Product Create',
    collection: 'products',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'DiemDangPhuong@gmail.com', email_verified: true },
    docId: 'prod_01',
    payload: {
      productId: 'prod_01',
      orgId: '365MD',
      sku: 'MD-OXI-01',
      name: 'Máy đo SpO2 365MD',
      category: 'Thiết bị Y tế',
      unit: 'Cái',
      warehouseZone: 'Kho A - Nhiệt độ phòng',
      batchNumber: 'LOT-2026-01',
      costPriceVnd: 350000,
      sellPriceVnd: 590000,
      stockQty: 100,
      minStockThreshold: 15,
      status: 'active',
      createdBy: 'admin_1',
      isVerifiedShadow: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Admin Email Spoofing with email_verified = false',
    collection: 'admins',
    operation: 'create',
    auth: { uid: 'spoof_uid', email: 'DiemDangPhuong@gmail.com', email_verified: false },
    docId: 'spoof_uid',
    payload: {
      uid: 'spoof_uid',
      orgId: '365MD',
      grantedBy: 'spoof_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Assigned Admin Role Escalation on Staff Registration',
    collection: 'staff_public',
    operation: 'create',
    auth: { uid: 'staff_02', email: 'cashier@365md.vn', email_verified: true },
    docId: 'staff_02',
    payload: {
      staffId: 'staff_02',
      orgId: '365MD',
      fullName: 'Nguyen Van A',
      employeeCode: 'NV-102',
      role: 'admin',
      department: 'Ban Giám Đốc',
      branch: 'Trụ sở TP.HCM',
      status: 'active',
      permInventoryView: true,
      permInventoryEdit: true,
      permStockApprove: true,
      permSalesCreate: true,
      permSalesRefund: true,
      permReportExport: true,
      permStaffManage: true,
      createdBy: 'staff_02',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Cross-User Snooping on staff_private',
    collection: 'staff_private',
    operation: 'get',
    auth: { uid: 'staff_02', email: 'cashier@365md.vn', email_verified: true },
    docId: 'staff_01',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Stock Movement Referencing Non-Existent Product',
    collection: 'stock_movements',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'DiemDangPhuong@gmail.com', email_verified: true },
    docId: 'mov_orphan_01',
    payload: {
      movementId: 'mov_orphan_01',
      orgId: '365MD',
      movementCode: 'NK-2026-999',
      productId: 'non_existent_product_999',
      productSku: 'MD-NONE',
      productName: 'Ghost Item',
      type: 'inbound',
      quantityDelta: 50,
      stockBefore: 0,
      stockAfter: 50,
      unitValueVnd: 100000,
      partnerOrReason: 'Supplier X',
      status: 'completed',
      createdBy: 'admin_1',
      createdByName: 'Admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Terminal State Mutation on Completed Stock Movement by Non-Admin',
    collection: 'stock_movements',
    operation: 'update',
    auth: { uid: 'staff_wh', email: 'warehouse@365md.vn', email_verified: true },
    docId: 'mov_completed_01',
    payload: {
      status: 'cancelled',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Value Poisoning with Negative Stock Quantity on Product Update',
    collection: 'products',
    operation: 'update',
    auth: { uid: 'admin_1', email: 'DiemDangPhuong@gmail.com', email_verified: true },
    docId: 'prod_01',
    payload: {
      stockQty: -999,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning with Invalid Characters',
    collection: 'products',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'DiemDangPhuong@gmail.com', email_verified: true },
    docId: 'invalid$id#with!spaces',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal Field Tampering (createdBy Mutation on Update)',
    collection: 'products',
    operation: 'update',
    auth: { uid: 'staff_wh', email: 'warehouse@365md.vn', email_verified: true },
    docId: 'prod_01',
    payload: {
      createdBy: 'hijacked_owner_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client Timestamp Forgery on Sales Order Create',
    collection: 'sales_orders',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'DiemDangPhuong@gmail.com', email_verified: true },
    docId: 'ord_01',
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Organization List Query Scraping',
    collection: 'sales_orders',
    operation: 'list',
    auth: { uid: 'staff_02', email: 'cashier@365md.vn', email_verified: true },
    payload: { orgId: 'OTHER_ORG' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Order Refund by Cashier without permSalesRefund',
    collection: 'sales_orders',
    operation: 'update',
    auth: { uid: 'staff_cashier_no_refund', email: 'cashier@365md.vn', email_verified: true },
    docId: 'ord_completed_01',
    payload: {
      status: 'refunded',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
