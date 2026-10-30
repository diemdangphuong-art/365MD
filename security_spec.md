# 365MD Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Relational Source of Truth

1. **Global Default-Deny Gate**: Every path not explicitly matched is rejected (`allow read, write: if false;`).
2. **Verified Identity Mandate**: Every read and write operation requires `request.auth != null && request.auth.token.email_verified == true`. Unverified emails (even if matching the bootstrapped admin email `DiemDangPhuong@gmail.com`) are strictly rejected.
3. **Path Variable Hardening (ID Poisoning Guard)**: Every single-document operation (`get`, `create`, `update`, `delete`) validates the document ID against `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Denial-of-Wallet Evaluation Order**: All write rules evaluate in strict sequence:
   - (1) Authentication & Email Verification (`isVerifiedUser()`)
   - (2) Static Path & Schema Blueprint Validation (`isValidId()` + `isValid[Entity](incoming())`)
   - (3) Temporal & Immutability Guards (`incoming().createdAt == request.time` on create; `incoming().updatedAt == request.time` and immutable keys on update)
   - (4) Relational & RBAC Database Lookups (`exists()`, `get()`, `isAdmin()`)
5. **PII Split-Collection Isolation**:
   - `/staff_public/{staffId}` stores only non-PII organizational profile and boolean RBAC flags.
   - `/staff_private/{staffId}` stores sensitive PII (`email`, `phone`, `baseSalaryVnd`, `contractType`) and is strictly restricted to `isAdmin()` or the exact document owner (`request.auth.uid == staffId`).
6. **Privilege Escalation Prevention**:
   - Self-registration in `/staff_public/{staffId}` by a non-admin user is only allowed if `staffId == request.auth.uid`, `role == 'cashier'`, and privileged flags (`permInventoryEdit`, `permStockApprove`, `permSalesRefund`, `permStaffManage`) are all `false`. Only `isAdmin()` or `canManageStaff()` can grant elevated roles (`warehouse_manager`, `sales_lead`, `auditor`, `admin`).
7. **Relational Integrity (Orphan Guard)**:
   - Creating a `/stock_movements/{movementId}` document requires `exists(/databases/$(database)/documents/products/$(incoming().productId))`.
   - Creating a `/sales_orders/{orderId}` document requires `exists(/databases/$(database)/documents/products/$(incoming().primaryProductId))`.
8. **Terminal State Locking**:
   - In `/stock_movements/{movementId}`, once `existing().status in ['completed', 'cancelled']`, further status transitions are blocked unless `isAdmin()`.
   - In `/sales_orders/{orderId}`, once `existing().status == 'refunded'`, further updates are blocked unless `isAdmin()`.
9. **Query Enforcer & Cost Optimization**:
   - Every `allow list` rule enforces `resource.data.orgId == '365MD'` (or owner UID) and contains zero `get()` or `exists()` lookups.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Shadow Field Injection (`products` create)**:
   ```json
   {
     "productId": "prod_01",
     "orgId": "365MD",
     "sku": "MD-OXI-01",
     "name": "Máy đo SpO2 365MD",
     "category": "Thiết bị Y tế",
     "unit": "Cái",
     "warehouseZone": "Kho A - Nhiệt độ phòng",
     "batchNumber": "LOT-2026-01",
     "costPriceVnd": 350000,
     "sellPriceVnd": 590000,
     "stockQty": 100,
     "minStockThreshold": 15,
     "status": "active",
     "createdBy": "user_1",
     "createdAt": "SERVER_TIMESTAMP",
     "updatedAt": "SERVER_TIMESTAMP",
     "isVerifiedShadow": true
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `data.keys().hasOnly(...)`).

2. **Payload 2 — Admin Email Spoofing with Unverified Email (`admins` create)**:
   Auth token: `{ uid: "attacker_1", email: "DiemDangPhuong@gmail.com", email_verified: false }`
   *Expected*: `PERMISSION_DENIED` (blocked by `isVerifiedUser()`).

3. **Payload 3 — Self-Assigned Admin Role Escalation (`staff_public` create)**:
   Auth token: `{ uid: "user_regular", email: "staff@365md.vn", email_verified: true }`
   Payload sets `"role": "admin", "permStaffManage": true`.
   *Expected*: `PERMISSION_DENIED` (non-admin self-registration cannot assign `admin` or `permStaffManage: true`).

4. **Payload 4 — PII Cross-User Snooping (`staff_private` get)**:
   Auth token: `{ uid: "user_regular", email: "staff@365md.vn", email_verified: true }`
   Target path: `/staff_private/other_staff_uid`
   *Expected*: `PERMISSION_DENIED` (blocked by PII owner/admin isolation).

5. **Payload 5 — Orphaned Stock Movement (`stock_movements` create)**:
   Payload references `"productId": "non_existent_product_999"`.
   *Expected*: `PERMISSION_DENIED` (blocked by `exists(/databases/$(database)/documents/products/$(incoming().productId))`).

6. **Payload 6 — Terminal State Mutation (`stock_movements` update)**:
   Existing document has `"status": "completed"`. Non-admin attempts to update `"status": "cancelled"`.
   *Expected*: `PERMISSION_DENIED` (blocked by terminal state lock `existing().status == 'pending'`).

7. **Payload 7 — Value Poisoning on Update (`products` update)**:
   Whitelisted key `stockQty` updated with a negative number `-50` or string `"1000"`.
   *Expected*: `PERMISSION_DENIED` (blocked by `isValidProduct(incoming())` wrapping the entire `allow update` block).

8. **Payload 8 — ID Poisoning Attack (`products` create)**:
   Path variable `productId` contains invalid characters `prod/../../hack` or length > 128 chars.
   *Expected*: `PERMISSION_DENIED` (blocked by `isValidId(productId)`).

9. **Payload 9 — Immortal Field Tampering (`products` update)**:
   Update payload attempts to mutate `createdBy` or `createdAt` while modifying `stockQty`.
   *Expected*: `PERMISSION_DENIED` (blocked by `affectedKeys().hasOnly(...)` and immutable field equality checks).

10. **Payload 10 — Timestamp Forgery (`sales_orders` create)**:
    Client sends past or future timestamp instead of `request.time` for `createdAt`.
    *Expected*: `PERMISSION_DENIED` (blocked by `incoming().createdAt == request.time`).

11. **Payload 11 — Unfiltered List Scraping (`sales_orders` list)**:
    Client executes `getDocs(collection(db, 'sales_orders'))` without `where('orgId', '==', '365MD')` or against foreign org data.
    *Expected*: `PERMISSION_DENIED` (blocked by `resource.data.orgId == '365MD'`).

12. **Payload 12 — Unauthorized Order Refund (`sales_orders` update)**:
    Cashier with `permSalesRefund == false` attempts to transition order `status` from `'completed'` to `'refunded'`.
    *Expected*: `PERMISSION_DENIED` (blocked by `canRefundSales()`).
