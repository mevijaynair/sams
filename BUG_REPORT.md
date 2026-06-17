# SAMS Blind Bug Test Report

**Date:** 2026-06-17  
**Tester:** Automated blind test (user interaction simulation)  
**Environment:** Development server, localhost:3000  

---

## 🔴 Critical Issues Found

### 1. **Missing Input Validation on Backend — Multiple Fields**

**Severity:** HIGH  
**Fields affected:** `fee_rate`, `sport`, `fee_plan_type`

**Issues:**
- ✗ Negative fee rates accepted (e.g., fee_rate = -100)
- ✗ Invalid sports accepted (e.g., sport = "InvalidSport123")
- ✗ Empty fee plan accepted (e.g., fee_plan_type = "")
- ✗ No max-length validation on name (500+ character strings accepted)

**Impact:** Invalid data stored in database; data integrity compromised

**Evidence:**
```
fee_rate: -100       → Status 201 ✓ (should reject)
sport: "InvalidSport123" → Status 201 ✓ (should reject)
fee_plan_type: ""    → Status 201 ✓ (should reject)
name: 500 chars      → Status 201 ✓ (should limit to ~100)
```

**Fix needed:** Backend validators in `/server/validators.js` must validate:
- `fee_rate`: must be >= 0
- `sport`: must be in academy's allowed sports list
- `fee_plan_type`: must be 'monthly' | 'per_session' | 'package'
- `name`: max 100 characters

---

### 2. **Potential Cross-Tenant Access Issue**

**Severity:** MEDIUM → HIGH (depends on RBAC intention)  
**Endpoint:** `GET /api/students`

**Issue:**
- Admin user (ACAD_01) can GET students from ACAD_02 → Status 200 ✓

**Expected behavior:**
- Admin should only access their own tenant's students
- Only super-admin should access all tenants

**Current behavior:**
- No tenant boundary enforcement detected (or super-admin logic is broader than intended)

**Test:**
```
Admin@apex.dev → GET /api/students with X-Tenant-Id: ACAD_02
Expected: 403 Forbidden
Actual: 200 OK ✓
```

---

## 🟡 Medium Issues Found

### 3. **XSS: Malicious Input Accepted by Backend** ⚠️

**Severity:** MEDIUM (mitigated by frontend escaping)

**Issue:**
- Backend accepts `<script>alert("XSS")</script>` as student name

**Current Status:**
- ✓ **Frontend properly escapes** via `esc()` function (innerText shows escaped text, not HTML)
- ✓ No JavaScript execution observed
- ✗ But malicious data is stored in database

**Impact:**
- Not an immediate XSS risk (frontend escapes)
- Bad practice; data should be validated at input boundary

**Fix needed:** Add XSS/input sanitization or stricter validation:
```js
name: (v) => /^[a-zA-Z0-9\s\-'.,]*$/.test(v) ? null : 'Invalid characters'
```

---

### 4. **Missing Sport Validation Against Academy's Allowed Sports**

**Severity:** MEDIUM

**Issue:**
- Can create a student with `sport: "Basketball"` in **Football-only** academy (ACAD_01)

**Expected:**
- Only allow sports in `academy.sports` list

**Evidence:**
```
Academy ACAD_01: sports = ["Football"]
POST /api/students: sport = "Basketball" → Status 201 ✓ (should reject)
```

---

## 🟢 Minor Issues / Edge Cases

### 5. **Empty Fee Plan Not Rejected**

**Issue:** `fee_plan_type: ""` accepted (should require valid enum)  
**Fix:** Validator must reject empty string

### 6. **Decimal Fee Rates Accepted**

**Issue:** `fee_rate: 450.99` accepted (may need business logic decision)  
**Note:** Not necessarily a bug — depends on whether fractional AED is allowed. Verify with product.

### 7. **No Max Length on Student Name**

**Issue:** 500+ character names accepted  
**Recommendation:** Limit to 100 characters

---

## ✅ What Works Well

- ✓ **XSS Prevention:** Frontend escapes malicious input with `esc()` function
- ✓ **404 Handling:** Nonexistent student IDs return proper 404 errors
- ✓ **Invalid Update Validation:** Updating with blank name/invalid age group rejects (400)
- ✓ **Theme Toggle:** Dark/light theme button renders and accessible
- ✓ **Navigation:** All nav items load without JS errors
- ✓ **Auth:** Login with invalid credentials properly rejected (401)

---

## 📋 Recommended Fixes (Priority Order)

| # | Issue | Priority | Estimated Effort |
|---|-------|----------|------------------|
| 1 | Sport validation against academy list | HIGH | 30 min |
| 2 | Fee rate validation (>= 0) | HIGH | 15 min |
| 3 | Fee plan type validation (required enum) | HIGH | 15 min |
| 4 | Cross-tenant access check | HIGH | 1-2 hours (audit all endpoints) |
| 5 | Name max-length validation | MEDIUM | 10 min |
| 6 | Input character whitelist (name field) | MEDIUM | 20 min |
| 7 | Decimal fee rate decision | LOW | 5 min (documentation) |

---

## Test Summary

- **Total tests run:** 15
- **Passed:** 7
- **Failed (validation):** 6
- **Permission issue:** 1 (potential)
- **Vulnerability:** 1 (mitigated by frontend)

**Overall:** Application has good XSS protection but **weak backend input validation**. Recommend fixing validators before production deployment on fmss.ae.

---

**Next steps:** Patch `/server/validators.js` and retest before deployment.
