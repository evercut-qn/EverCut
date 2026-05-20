# EverCut — Service Image System Guide (v2)

> **Complete guide for seeding, managing, and resolving service images in Cloudflare R2 with high precision.**

---

## 1. Overview

Service images are stored as **R2 keys** (`imageR2Key`) in MongoDB. Signed CDN URLs are generated fresh at read time.

**Two ways a service gets its image:**

1. **Custom upload** — Client passes `imageMediaId`.
2. **Intelligent default assignment** — The server matches the service name and gender against a seeded image collection (`service_default_images`) using a deterministic 4-step hierarchy.

---

## 2. Deterministic Resolution Hierarchy

When a service is created/updated without `imageMediaId`, the `resolveDefaultServiceImageR2Key()` function follows this priority:

1.  **Exact Match:** Name + Type + Gender (e.g., `premiumhaircut` for `men`).
2.  **Category Fuzzy Match:** Text search on `keywords` within the same Type + Gender (e.g., matching "Fade" to the `haircut` category for `men`).
3.  **Global Gender Fallback:** If no specific category matches, use the **Global Default** for that gender (e.g., `images/services/single/default/men.jpg`).
4.  **Absolute System Fallback:** As a last resort, use the **Global Unisex Default** (`images/services/single/default/unisex.jpg`).

---

## 3. Tiered Asset Organization

Images are organized in a tiered structure to support precise matching and clean management.

**Directory Structure:**
`server/assets/services/[serviceType]/[categoryId]/[serviceFor].jpg`

**Example:**
- `server/assets/services/single/haircut/men.jpg`
- `server/assets/services/single/haircut/unisex.jpg`
- `server/assets/services/single/default/women.jpg`

---

## 4. The Manifest File

**Path:** `server/scripts/service-images-manifest.json`

The single source of truth for the seeding process.

### Categories
- **Single:** `haircut`, `shave`, `facial`, `massage`, `haircolor`, `cleanup`, `headmassage`, `pedicure`, `manicure`, `waxing`, `threading`, `makeup`.
- **Bundled:** `haircut-shave`, `haircut-facial`, `full-grooming`, `bridal-package`, `skincare-combo`, `spa`.

### Schema
- `categoryId`: Group identifier (e.g., `haircut`, `shave`).
- `name`: Unique identifier for the image record.
- `keywords`: Array of terms for fuzzy matching.
- `serviceType`: `single` or `bundled`.
- `serviceFor`: `men`, `women`, or `unisex`.
- `isGlobalDefault`: Boolean (only one per Type + Gender).

---

## 5. Key Scripts

### Seeding
```bash
# Upload assets to R2 and sync metadata to MongoDB
node scripts/seed-service-images.mjs --write --force
```

### Re-resolution (Maintenance)
```bash
# Re-calculate default images for all active services in the DB
node scripts/re-resolve-service-images.mjs --write
```

---

## 6. Key Code References

| File | Purpose |
|------|---------|
| `server/src/models/service-default-image.model.js` | Database schema with `categoryId` and `isGlobalDefault` |
| `server/src/repositories/service-default-image.repository.js` | 4-step deterministic resolution logic |
| `server/src/services/service-catalog.service.js` | Service layer integration |
| `server/tests/service-image-resolution.test.js` | Automated verification of resolution branches |
