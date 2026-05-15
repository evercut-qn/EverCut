# Scripts

Utility scripts for local development and testing. Run all commands from the `server/` directory.

---

## `firebase-token-gen.js`

Generates Firebase ID tokens for the two test users (`test-customer-001` and `test-barber-001`) and injects them directly into the Postman environment file so no manual copy-pasting is required.

**What it does:**

| Step | Action |
|---|---|
| 1 | Initialises Firebase Admin SDK using `firebase-admin-sdk.json` |
| 2 | Creates each test user in Firebase Auth if they don't exist yet *(idempotent — safe to re-run)* |
| 3 | Writes persistent custom claims (`role`, etc.) onto each Auth record |
| 4 | Mints a short-lived custom token (Admin SDK, server-side only) |
| 5 | Exchanges it with the Firebase REST API for a real ID token |
| 6 | Saves tokens to `scripts/test-tokens.txt` and `scripts/test-tokens.json` |

**Prerequisites:**
- `firebase-admin-sdk.json` in the project root (Firebase Console → Project Settings → Service Accounts → Generate New Private Key)
- `FIREBASE_API_KEY` in `.env` (Firebase Console → Project Settings → General → Web API Key)

**Usage:**
```bash
node scripts/firebase-token-gen.js
```

**Output files** *(all gitignored)*:
- `scripts/test-tokens.txt` — human-readable token listing
- `scripts/test-tokens.json` — machine-readable token data

> Firebase ID tokens expire after **1 hour**. Re-run the script to refresh them.

**Customising test users:**

Edit the `TEST_USERS` array at the top of the script:

```js
const TEST_USERS = [
  {
    uid:         'test-customer-001',   // Must be unique in Firebase Auth
    email:       'test.customer@example.com',
    phoneNumber: '+15550000001',        // E.164 format
    displayName: 'Test Customer',
    claims:      { role: 'CUSTOMER' }, // Embedded in every ID token
  },
  // Add more users here...
];
```

---

## `regenerate-postman-collections.mjs`

Programmatically rebuilds every Postman collection JSON file in `postman-collections/`.

All collections are defined in code — request items, URLs, bodies, pre-request scripts, and test scripts. Run this after changing route shapes, validator rules, or Postman automation logic, then re-import the updated files in Postman.

**Usage:**
```bash
node scripts/regenerate-postman-collections.mjs
```

**Output:** `postman-collections/01-authentication.json` … `postman-collections/13-barber-ratings.json`

> Does not touch `EverCut.postman_environment.json` or `EverCut.postman_environment.local.json`.

---

## `generate-token-secrets.mjs`

Generates cryptographically secure JWT secrets for EverCut's three token types (access, refresh, onboarding) using Node.js's built-in `crypto.randomBytes()`. Zero external dependencies.

**Security properties:**
- **Source:** OS-level CSPRNG (`crypto.randomBytes()`)
- **Default length:** 64 bytes = 512 bits (exceeds HS256 and HS512 requirements)
- **Encoding:** base64url — URL-safe, no `+` / `=` characters
- **Independence:** Each secret is generated from a separate entropy draw

**Usage:**

```bash
# Print ready-to-paste .env block (default)
node scripts/generate-token-secrets.mjs

# Print shell export statements
node scripts/generate-token-secrets.mjs --format=export

# Pipe-friendly: one secret per line
node scripts/generate-token-secrets.mjs --format=raw

# JSON object
node scripts/generate-token-secrets.mjs --format=json

# Generate 768-bit secrets (96 bytes)
node scripts/generate-token-secrets.mjs --bytes=96

# Audit existing .env secrets for strength and uniqueness
node scripts/generate-token-secrets.mjs --check

# Generate and write directly into .env (overwrites existing secrets)
node scripts/generate-token-secrets.mjs --write

# Help
node scripts/generate-token-secrets.mjs --help
```

**`--check` output — what it validates:**

| Check | Outcome |
|---|---|
| Key present in `.env` | ✔ / ⚠ missing |
| Not a placeholder (`replace_with…`) | ✔ / ⚠ placeholder |
| Entropy ≥ 256 bits | ✔ strong / ⚠ weak |
| All three values are unique | ✔ / ✖ violation |

**After rotation:** Any active JWT tokens signed with the old secret are immediately invalidated — users must re-authenticate. Plan rotations accordingly.

---


## `seed-barber-rating-mock-data.js`

Seeds a self-contained set of mock data into MongoDB for testing the barber rating routes.

**What it creates:**
- A mock barber user and shop
- Three mock customers with profiles
- One employee and one service under the shop
- Three completed bookings (one per customer)
- Three ratings (one per booking)

The script is idempotent — re-running it resets the mock data to a clean state. Seeded IDs are printed to the console for use in manual testing.

**Usage:**
```bash
node scripts/seed-barber-rating-mock-data.js
```

**Requires:** `MONGODB_URI` in `.env` and the server's models to be resolvable.

---

## Service Image Scripts

### `seed-service-images.mjs`

Uploads default service images to Cloudflare R2 and generates the runtime catalog JSON consumed by `service-catalog.service.js`. Images and their metadata are defined in `scripts/service-images-manifest.json`.

**What it does:**

| Step | Action |
|---|---|
| 1 | Reads `scripts/service-images-manifest.json` |
| 2 | For each image entry, uploads the file to R2 at `images/services/{serviceType}/{name}.{ext}` using `storageProvider.putObject()` |
| 3 | Uploads default fallback images (`default/service.jpg`, `default/bundled.jpg`) |
| 4 | Generates `src/config/service-image-catalog.json` — the runtime catalog for intelligent image assignment |

**Usage:**
```bash
# Dry-run (logs planned uploads without executing)
node scripts/seed-service-images.mjs

# Actually upload images and generate catalog
node scripts/seed-service-images.mjs --write

# Re-upload even if objects already exist in R2
node scripts/seed-service-images.mjs --write --force
```

**Prerequisites:**
- Image files at the paths specified in `service-images-manifest.json`
- R2 credentials in `.env` (`CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `CDN_BASE_URL`, `MEDIA_TOKEN_SECRET`)

**After seeding:** Restart the server to pick up the updated `service-image-catalog.json`.

---

## `cleanup-orphaned-fields.mjs`

Removes non-schema fields from all MongoDB collections and fixes inconsistent `entityId/entityType` pairs in the media collection. Raw MongoDB driver operations (used in migration scripts) bypass Mongoose's `strict: true` validation and can persist arbitrary fields that don't belong in the schema — e.g. transient input parameters like `imageMediaId`, `photoMediaId`, `coverMediaId`.

Additionally, this script clears `entityId` on media documents where `entityType` is `null`. `entityId` and `entityType` should always be set together or both be `null` — an entity ID without a type is meaningless since it's impossible to know what the ID references.

**Usage:**
```bash
# Dry-run (see which fields would be removed without executing)
node scripts/cleanup-orphaned-fields.mjs

# Actually remove orphaned fields and fix inconsistent pairs
node scripts/cleanup-orphaned-fields.mjs --write
```

**When to use:**
- After running any migration script that uses raw MongoDB driver operations
- When MongoDB Compass shows fields that don't exist in the Mongoose schema
- When media documents have `entityId` set but `entityType` is `null`
- As part of the service image migration finalization process

**Requires:** `MONGODB_URI` in `.env`

---

## Generated files *(gitignored)*

| File | Created by | Purpose |
|---|---|---|
| `test-tokens.txt` | `firebase-token-gen.js` | Human-readable token listing |
| `test-tokens.json` | `firebase-token-gen.js` | Machine-readable tokens for Postman/CLI use |

---

## `.gitignore` checklist

Make sure these entries are in your `.gitignore`:

```
firebase-admin-sdk.json
scripts/test-tokens.txt
scripts/test-tokens.json
.env
```
