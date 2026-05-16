# EverCut — Service Image System Guide

> **Complete guide for seeding, managing, and resolving service images in Cloudflare R2.**

---

## 1. Overview

Service images are stored as **R2 keys** (`imageR2Key`) in MongoDB — not signed URLs. Signed CDN URLs are generated fresh at read time via `buildMediaUrl()`.

**Two ways a service gets its image:**

1. **Custom upload** — Client passes `imageMediaId` when creating/updating a service. The server resolves the confirmed media record, stores its `r2Key` as `imageR2Key`, and links the media to the service entity.
2. **Intelligent default assignment** — When no `imageMediaId` is provided, the server matches the service name and gender against a seeded image collection (`service_default_images`) and assigns the most relevant default R2 key.

---

## 2. How Default Image Assignment Works

When a service is created or updated without `imageMediaId`, the `resolveDefaultServiceImageR2Key()` function in `service-catalog.service.js` matches the service against the `ServiceDefaultImage` collection.

**Matching priority (highest to lowest):**

1. **Exact match (Name + Type + Gender)** — Normalize the service name (lowercase, remove spaces) and look for an exact match for that name, service type, and gender.

2. **Keyword scoring (Type + Gender filter)** — Filter the collection by `serviceType` and `serviceFor`. Then, perform a text search on the `keywords` field using the service name. Pick the entry with the highest relevance score.

3. **Bundle concatenation** — For bundled services only: concatenate the `bundledServices` names (normalized, sorted) into a single key and look for an exact name match.

4. **Generic fallback** — If nothing matches, return the fallback image for that specific type and gender (e.g., `images/services/default/single/male.jpg`).

---

## 3. Preparing Images for Seeding

### Directory Structure

All service images MUST be placed in `server/assets/services/`. The naming convention follows `[type]-[category]-[gender].jpg`.

```
server/assets/services/
├── single-haircut-male.jpg      → Single service image (male)
├── single-haircut-female.jpg    → Single service image (female)
├── bundled-haircutshave-male.jpg → Bundled service image
└── ...
```

---

## 4. The Manifest File

**Path:** `server/scripts/service-images-manifest.json`

This is the single source of truth for the seed script. It defines every image to upload along with its matching keywords and gender.

### Format

```json
{
  "images": [
    {
      "name": "single-haircut-male",
      "keywords": ["haircut", "trim", "fade", "hair cut"],
      "serviceType": "single",
      "serviceFor": "male",
      "file": "assets/services/single-haircut-male.jpg",
      "contentType": "image/jpeg"
    }
  ],
  "defaults": {
    "single": "assets/services/single-haircut-male.jpg",
    "bundled": "assets/services/bundled-haircutshave-male.jpg"
  }
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase kebab-case). Determines the R2 key suffix. |
| `keywords` | Yes | Array of terms for fuzzy matching. |
| `serviceType` | Yes | `"single"` or `"bundled"`. |
| `serviceFor` | Yes | `"male"`, `"female"`, or `"unisex"`. |
| `file` | Yes | Relative path from `server/` to the local file. |
| `contentType` | Yes | MIME type (`image/jpeg`, `image/png`, `image/webp`). |

---

## 5. Running the Seed Script

The seed script (`scripts/seed-service-images.mjs`) reads the manifest, uploads each image to R2, and upserts the metadata into MongoDB.

```bash
# 1. Dry-run first
node scripts/seed-service-images.mjs

# 2. Upload and update DB
node scripts/seed-service-images.mjs --write

# 3. Force re-upload
node scripts/seed-service-images.mjs --write --force
```

---

## 6. Key Code References

| File | Purpose |
|------|---------|
| `server/src/models/service-default-image.model.js` | Database schema for default images |
| `server/src/repositories/service-default-image.repository.js` | Resolution logic (deterministic matching) |
| `server/src/services/service-catalog.service.js` | Service layer integration |
| `server/scripts/seed-service-images.mjs` | Seeding script |
| `server/scripts/service-images-manifest.json` | Master image configuration |
