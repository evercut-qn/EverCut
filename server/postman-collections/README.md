# EverCut API — Postman Collections

A complete set of Postman collections for the EverCut API, with shared-variable automation, pre-wired file uploads, OTP/JWT token capture, and reusable IDs so requests can be run sequentially without manual copy-pasting.

---

## Response Envelope

All collections now assume the backend returns the same JSON envelope for both success and error responses:

```json
{
  "success": true,
  "message": "Human-readable status",
  "data": {},
  "meta": {}
}
```

`meta` is optional and is used for pagination, counts, and summaries. Paginated endpoints return the array directly in `data` and pagination details in `meta.pagination`. Collections capture each resource's public identifier from `id` and store it in Postman variables such as `shop_id` and `booking_id`; `_id`, domain ID aliases, `__v`, `$__`, `_doc`, and other Mongoose internals are not part of the response contract. Validation and field-level failures are returned inside `data.errors`.

---

## Files in This Directory

| File | Collection name | Description |
|---|---|---|
| `01-authentication.json` | EverCut - Authentication | OTP authentication for customer, barber, and admin test users, token capture, and health check |
| `02-onboarding.json` | EverCut - Onboarding | First-run customer and barber onboarding using onboarding JWTs, with shop schedule normalization to 24-hour storage |
| `03-customer-profile.json` | EverCut - Customer | Profile read/update and service discovery ID capture |
| `04-customer-bookings.json` | EverCut - Customer Bookings | Full booking lifecycle: create, schedule update, favorite state, reorder, cancel |
| `05-customer-shop-discovery.json` | EverCut - Customer Shop Discovery | Shop discovery, availability, favorites, and keyword search |
| `06-customer-ratings.json` | EverCut - Customer Ratings | Submit a rating and read shop rating data |
| `07-barber-profile-shop.json` | EverCut - Barber Profile & Shop | Shop management: current profile, payout details, open state, media, security, and account actions |
| `08-barber-employees.json` | EverCut - Barber Employees | Employee CRUD with optional R2 photo media IDs and 24-hour employee schedule examples |
| `09-barber-services.json` | EverCut - Barber Services | Service catalogue CRUD (single and bundled services) |
| `10-barber-bookings.json` | EverCut - Barber Bookings | Booking administration: list filters, analytics, status update, cancellation |
| `11-barber-media.json` | EverCut - Barber Media | R2 media workflow: presign, direct upload, confirm, gallery attach, analytics, delete |
| `12-barber-earnings.json` | EverCut - Barber Earnings | Earnings summary (requires completed bookings for non-zero values) |
| `13-barber-ratings.json` | EverCut - Barber Ratings | Rating listing, analytics, reply management, and rating removal |
| `14-operational-analytics.json` | EverCut - Operational Analytics | Booking, employee, and earnings analytics through resource-owned endpoints |
| `15-payments-payouts.json` | EverCut - Payments & Payouts | Native PhonePe SDK payment initiation/verification/status/refunds, manual payout recording, payout history, and Cashfree payout retry |
| `16-notifications.json` | EverCut - Notifications | FCM token management, notification history, summary, and read-state updates |
| `17-subscriptions.json` | EverCut - Subscriptions | Razorpay subscription lifecycle, plan changes, transaction history, and signed webhook simulation |
| `EverCut.postman_environment.json` | — | Active environment with OTP/JWT variables for local testing |
| `assets/sample-upload.png` | — | Sample image for direct R2 PUT requests |

---

## Collection Request Reference

### `01-authentication.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/auth/otp/send` | Send OTP to customer |
| 2 | POST | `/api/v1/auth/otp/verify` | Verify customer OTP - captures onboarding or session tokens |
| 3 | POST | `/api/v1/auth/otp/send` | Send OTP to barber |
| 4 | POST | `/api/v1/auth/otp/verify` | Verify barber OTP - captures onboarding or session tokens |
| 5 | POST | `/api/v1/auth/otp/send` | Send OTP to admin |
| 6 | POST | `/api/v1/auth/otp/verify` | Verify admin OTP - captures admin session tokens |
| 7 | POST | `/api/v1/auth/token/refresh` | Refresh customer access token |
| 8 | POST | `/api/v1/auth/token/refresh` | Refresh barber access token |
| 9 | POST | `/api/v1/auth/token/refresh` | Refresh admin access token |
| 10 | POST | `/api/v1/auth/logout` | Logout customer *(Terminal)* |
| 11 | POST | `/api/v1/auth/otp/resend` | Resend OTP (text channel) |
| 12 | POST | `/api/v1/account/phone/send-otp` | Send phone update OTP |
| 13 | POST | `/api/v1/account/phone/verify-otp` | Verify phone update OTP |
| 14 | PATCH | `/api/v1/account/email` | Update customer email |
| 15 | GET | `/api/v1/health` | Health check |

### `02-onboarding.json`

Shop opening, closing, and break times may be sent as either `HH:MM` or `hh:mm AM/PM`. The backend normalizes those values to `HH:MM` before persisting the shop profile.

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/onboarding/customers` | Complete customer onboarding *(first run only)* |
| 2 | POST | `/api/v1/onboarding/barbers` | Complete barber profile *(first run only)* |

### `03-customer-profile.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/customers/me` | Get profile |
| 2 | PUT | `/api/v1/customers/me` | Update profile |
| 3 | GET | `/api/v1/shops/services` | Get services by gender - also captures shared shop/service IDs |

### `04-customer-bookings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/bookings?dateFrom={{booking_date}}` | List bookings from the generated date - captures booking ID |
| 2 | GET | `/api/v1/employees/{{employee_id}}/availability` | Get employee availability |
| 3 | POST | `/api/v1/bookings` | Create a booking |
| 4 | GET | `/api/v1/bookings/{{booking_id}}` | Get booking details |
| 5 | PATCH | `/api/v1/bookings/{{booking_id}}/favorite` | Set booking favorite true |
| 6 | GET | `/api/v1/bookings?favorite=true` | List favorite bookings |
| 7 | PATCH | `/api/v1/bookings/{{booking_id}}` | Update booking schedule |
| 8 | POST | `/api/v1/bookings` | Reorder from `sourceBookingId` |
| 9 | PATCH | `/api/v1/bookings/{{booking_id}}/favorite` | Set booking favorite false |
| 10 | PATCH | `/api/v1/bookings/{{booking_id}}` | Cancel booking with `status=cancelled` |

### `05-customer-shop-discovery.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/shops?coordinates={{coordinates}}` | Get nearby shops - captures shop ID |
| 2 | GET | `/api/v1/shops/{{shop_id}}` | Get shop details - captures service ID |
| 3 | GET | `/api/v1/shops/{{shop_id}}/employees` | Get shop employees - captures employee ID |
| 4 | GET | `/api/v1/employees/{{employee_id}}/availability` | Get employee available slots |
| 5 | GET | `/api/v1/shops/{{shop_id}}/availability` | Get shop-wide availability |
| 6 | PATCH | `/api/v1/shops/{{shop_id}}/favorite` | Set favorite shop true |
| 7 | GET | `/api/v1/shops/favorites` | List favorite shops |
| 8 | PATCH | `/api/v1/shops/{{shop_id}}/favorite` | Set favorite shop false |
| 9 | GET | `/api/v1/shops?category=Door-Step` | Get doorstep shops |
| 10 | GET | `/api/v1/services/search` | Search services by keyword and gender |
| 11 | GET | `/api/v1/shops?query={{shop_search_query}}` | Search shops by keyword |

### `06-customer-ratings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/bookings?dateTo={{booking_date}}&status=completed&limit=100` | Bootstrap: capture a shop ID from a completed booking |
| 2 | POST | `/api/v1/ratings` | Submit a rating *(once per customer/shop - returns 409 on rerun)* |
| 3 | GET | `/api/v1/shops/{{shop_id}}/ratings` | List shop ratings |
| 4 | GET | `/api/v1/shops/{{shop_id}}/ratings/analytics` | Get rating analytics |

### `07-barber-profile-shop.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/shops/me` | Get profile - captures shop ID |
| 2 | PATCH | `/api/v1/shops/me` | Update business info |
| 3 | GET | `/api/v1/shops/me/payout-details` | Get payout details |
| 4 | PATCH | `/api/v1/shops/me/payout-details` | Update payout details |
| 5 | PATCH | `/api/v1/shops/me` | Ensure shop is open |
| 6 | PATCH | `/api/v1/shops/me/media/picture` | Update profile picture |
| 7 | PATCH | `/api/v1/shops/me/media/cover` | Update cover image |
| 8 | PATCH | `/api/v1/shops/me/security` | Update PIN |
| 9A | DELETE | `/api/v1/account/sessions` | Sign out everywhere *(Terminal)* |
| 9B | DELETE | `/api/v1/account` | Delete account *(Terminal)* |

### `08-barber-employees.json`

Employee `workingHours.start` and `workingHours.end` remain `HH:MM` 24-hour values. Those hours are now compared against normalized shop hours, so legacy AM/PM shop schedules no longer cause false validation failures.

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/employees` | List employees - captures employee ID |
| 2 | GET | `/api/v1/employees/{{employee_id}}` | Get employee details with statistics |
| 3 | POST | `/api/v1/employees` | Add employee |
| 4 | PATCH | `/api/v1/employees/{{employee_id}}` | Update employee |
| 5 | PATCH | `/api/v1/employees/{{employee_id}}` | Update employee active state |
| 6 | DELETE | `/api/v1/employees/{{employee_id}}` | Delete employee *(Terminal)* |

### `09-barber-services.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/services` | List services - captures service ID |
| 2 | POST | `/api/v1/services` | Add a single service |
| 3 | POST | `/api/v1/services` | Add a bundled service |
| 4 | PUT | `/api/v1/services/{{service_id}}` | Update service |
| 5 | DELETE | `/api/v1/services/{{service_id}}` | Delete service *(Terminal)* |

### `10-barber-bookings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/bookings` | List all bookings - captures IDs for status update and cancellation |
| 2 | GET | `/api/v1/bookings/analytics` | Get combined booking analytics |
| 4 | GET | `/api/v1/bookings?status=awaiting_confirmation&paymentStatus=success` | List pending confirmations |
| 5 | GET | `/api/v1/bookings?status=confirmed` | Filter bookings by status |
| 6 | PATCH | `/api/v1/bookings/{{booking_id_status}}` | Confirm a booking |
| 7 | PATCH | `/api/v1/bookings/{{booking_id_status}}` | Update booking status |
| 8 | PATCH | `/api/v1/bookings/{{booking_id_delete}}` | Cancel a paid booking *(Terminal)* |

### `11-barber-media.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/media/upload-url` | Request a presigned R2 upload URL |
| 2 | PUT | `{{media_upload_url}}` | Upload binary directly to R2 with `No Auth` and the returned `Content-Type` header |
| 3 | POST | `/api/v1/media/confirm` | Confirm and validate the upload |
| 4 | POST | `/api/v1/media/gallery` | Attach confirmed media to gallery |
| 5 | GET | `/api/v1/media/gallery` | List gallery media |
| 6 | GET | `/api/v1/media/gallery/stats` | Get gallery analytics |
| 7 | GET | `/api/v1/media/{{media_id}}` | Get media by ID |
| 8 | DELETE | `/api/v1/media/{{media_id}}` | Delete media *(Terminal)* |

### `12-barber-earnings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/earnings` | Get earnings summary |

### `13-barber-ratings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/ratings` | List ratings - captures seeded IDs for reply/remove operations |
| 2 | GET | `/api/v1/ratings/analytics` | Get the authenticated barber shop's rating analytics |
| 3 | PUT | `/api/v1/ratings/{{rating_id_add_reply}}/reply` | Add or replace reply on a rating |
| 4 | PUT | `/api/v1/ratings/{{rating_id_update_reply}}/reply` | Update an existing reply |
| 5 | DELETE | `/api/v1/ratings/{{rating_id_update_reply}}/reply` | Delete a reply |
| 6 | DELETE | `/api/v1/ratings/{{rating_id_remove_rating}}` | Remove a rating |

### `14-operational-analytics.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/bookings/analytics` | Get booking summary, milestones, today pulse, and queue |
| 2 | GET | `/api/v1/employees/analytics` | Get staff availability and progress tracking |
| 3 | GET | `/api/v1/earnings` | Get earnings analytics |

### `15-payments-payouts.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/payments` | Create native PhonePe SDK order for a pending customer booking |
| 2 | GET | `/api/v1/payments/{{payment_id}}` | Read and poll payment status |
| 3 | GET | `/api/v1/payments` | List visible payments for the authenticated actor |
| 4 | POST | `/api/v1/payments/{{payment_id}}/verify` | Verify Flutter SDK callback through backend/PhonePe Order Status |
| 5 | POST | `/api/v1/bookings/{{payment_booking_id}}/refunds` | Initiate refund before payout starts |
| 6 | GET | `/api/v1/payouts/pending` | List pending manual payout groups as admin |
| 7 | POST | `/api/v1/payouts` | Create manual payout as admin |
| 8 | GET | `/api/v1/payouts?gateway=manual` | List manual payout history |
| 9 | GET | `/api/v1/payouts/{{payout_id}}` | Get payout detail |
| 10 | PATCH | `/api/v1/payouts/{{payout_id}}` | Mark manual payout failed *(Terminal)* |
| 11 | POST | `/api/v1/payouts/{{payout_id}}/retry` | Retry failed or reversed Cashfree payout as admin |

### `16-notifications.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/notifications/tokens` | Register or refresh an FCM token for the authenticated user |
| 2 | GET | `/api/v1/notifications?page=1&limit=20` | List notification history and capture a notification ID |
| 3 | GET | `/api/v1/notifications/summary` | Get notification summary |
| 4 | PATCH | `/api/v1/notifications/{{notification_id}}` | Mark one notification read |
| 5 | PATCH | `/api/v1/notifications` | Mark all notifications read |
| 6 | DELETE | `/api/v1/notifications/tokens` | Revoke the authenticated user's FCM token |

### `17-subscriptions.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/subscriptions/plans` | List Basic, Popular, and Advanced plan capabilities |
| 2 | GET | `/api/v1/subscriptions/me` | Read current barber subscription, usage, and entitlements |
| 3 | POST | `/api/v1/subscriptions/subscribe` | Create a Razorpay subscription for `PLAN_POPULAR` or `PLAN_ADVANCED` |
| 4 | POST | `/api/v1/subscriptions/upgrade` | Upgrade an active paid subscription immediately |
| 5 | POST | `/api/v1/subscriptions/downgrade` | Schedule a paid downgrade at next renewal, or cancel when downgrading to Basic |
| 6 | POST | `/api/v1/subscriptions/cancel` | Cancel the paid subscription at cycle end |
| 7 | GET | `/api/v1/subscriptions/transactions?page=1&limit=20` | List immutable subscription lifecycle/audit records |
| 8 | POST | `/api/v1/subscriptions/webhook` | Simulate a signed Razorpay subscription webhook |

---

### Prerequisites

1. In non-production, `src/config/index.js` has MSG91 `testMode` enabled so local OTP requests use the configured test OTP instead of sending real SMS.
2. The test OTP is hardcoded as `123456` via `testOtp: '123456'` in the same config block - no env var needed.
3. From `server/`, start the API with `npm run dev`.

No manual token generation needed - the authentication and onboarding collections handle token capture automatically.

### Import into Postman

1. Import every `.json` collection from this folder.
2. Import `EverCut.postman_environment.json` as the active environment.
3. Verify `test_customer_mobile`, `test_barber_mobile`, `test_admin_mobile`, and `test_otp` are set in the environment.
4. Create the admin user with `node scripts/create-admin-user.mjs --phone 9876543212 --email admin@example.com`.
5. Run `01-authentication.json` requests 1-6 to send and verify OTP for customer, barber, and admin users.
6. Returning users get access tokens immediately; brand-new users get onboarding tokens first and then receive access tokens from `02-onboarding.json`.
7. Run the other collections in order.

> Access tokens expire after 15 minutes once onboarding is complete. Run the **Refresh Token** requests (7-9) or re-run OTP verification to get fresh tokens. Tokens are auto-captured - no manual copy-paste.

### Test Users

| Role | MongoDB `_id` | Email | Phone |
|---|---|---|---|
| Customer | *(auto-generated on first successful onboarding)* | `test.customer@example.com` | `9876543210` |
| Barber | *(auto-generated on first successful onboarding)* | `test.barber@example.com` | `9876543211` |
| Admin | Created with `scripts/create-admin-user.mjs` | `admin@example.com` | `9876543212` |

### Environment Variables

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:5000` |
| `api_prefix` | `api/v1` |
| `test_customer_mobile` | `9876543210` |
| `test_barber_mobile` | `9876543211` |
| `test_admin_mobile` | `9876543212` |
| `test_otp` | `123456` |
| `customer_access_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `customer_refresh_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `barber_access_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `barber_refresh_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `customer_onboarding_token` | *(auto-set by 01-authentication.json)* |
| `barber_onboarding_token` | *(auto-set by 01-authentication.json)* |
| `admin_access_token` | Auto-set by `01-authentication.json` request 6 for manual payout and Cashfree retry requests |
| `admin_refresh_token` | Auto-set by `01-authentication.json` request 6 |
| `payment_booking_id` | Booking ID to pay for; can be copied from `shared_booking_id` |
| `payment_id` | Auto-set by `15-payments-payouts.json` request 1 |
| `merchant_order_id` | Auto-set by `15-payments-payouts.json` request 1 |
| `merchant_refund_id` | Auto-set by `15-payments-payouts.json` request 5 |
| `refund_id` | Auto-set by `15-payments-payouts.json` request 5 |
| `manual_payout_barber_id` | Auto-set by `15-payments-payouts.json` request 6 |
| `manual_payout_booking_ids_json` | Auto-set by `15-payments-payouts.json` request 6 |
| `manual_payout_utr` | Unique UTR used by `15-payments-payouts.json` request 7 |
| `payout_id` | Manual payout transaction ID for detail/update or Cashfree retry tests |
| `subscription_plan_id` | `PLAN_POPULAR` by default; set to `PLAN_ADVANCED` to test Advanced checkout |
| `subscription_upgrade_plan_id` | `PLAN_ADVANCED` |
| `subscription_downgrade_plan_id` | `PLAN_POPULAR` |
| `razorpay_subscription_id` | Auto-set by `17-subscriptions.json` request 3, or manually copied from Razorpay |
| `razorpay_plan_id_popular` | Razorpay gateway plan ID from `RAZORPAY_PLAN_ID_POPULAR` |
| `razorpay_webhook_secret` | Local/test Razorpay webhook secret used by the signed webhook simulation |

### Auth Collection Requests

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/auth/otp/send` | Send OTP to customer |
| 2 | POST | `/api/v1/auth/otp/verify` | Verify customer OTP - captures onboarding or session tokens |
| 3 | POST | `/api/v1/auth/otp/send` | Send OTP to barber |
| 4 | POST | `/api/v1/auth/otp/verify` | Verify barber OTP - captures onboarding or session tokens |
| 5 | POST | `/api/v1/auth/otp/send` | Send OTP to admin |
| 6 | POST | `/api/v1/auth/otp/verify` | Verify admin OTP - captures admin session tokens |
| 7 | POST | `/api/v1/auth/token/refresh` | Refresh customer access token |
| 8 | POST | `/api/v1/auth/token/refresh` | Refresh barber access token |
| 9 | POST | `/api/v1/auth/token/refresh` | Refresh admin access token |
| 10 | POST | `/api/v1/auth/logout` | Logout customer *(Terminal)* |
| 11 | POST | `/api/v1/auth/otp/resend` | Resend OTP (text channel) |
| 12 | POST | `/api/v1/account/phone/send-otp` | Send phone update OTP |
| 13 | POST | `/api/v1/account/phone/verify-otp` | Verify phone update OTP |
| 14 | PATCH | `/api/v1/account/email` | Update customer email |
| 15 | GET | `/api/v1/health` | Health check |

### Recommended Run Order

**Barber side** (must run first to create bookable data):

1. `01-authentication.json` → **3. Send Barber OTP** → **4. Verify Barber OTP**
2. `02-onboarding.json` → **2. Complete Barber Profile** *(first run only)*
3. Continue with barber collections in order.

**Customer side:**

1. `01-authentication.json` → **1. Send Customer OTP** → **2. Verify Customer OTP**
2. `02-onboarding.json` → **1. Complete Customer** *(first run only)*
3. Continue with customer collections in order.
4. Run `15-payments-payouts.json` after a pending booking has been created. Request 1 captures the payment references needed by the status, refund, and webhook requests.
5. Run `17-subscriptions.json` after barber onboarding. Request 3 captures `razorpay_subscription_id`; request 8 signs its body with `razorpay_webhook_secret` before calling the webhook endpoint.

**Admin manual payout side:**

1. Create an admin user with `node scripts/create-admin-user.mjs --phone 9876543212 --email admin@example.com`.
2. `01-authentication.json` → **5. Send Admin OTP** → **6. Verify Admin OTP**.
3. Prepare at least one completed/no-show, paid booking with pending payout status.
4. `15-payments-payouts.json` → **6. List Pending Manual Payouts** → **7. Create Manual Payout**.
5. Use requests 8-10 for history/detail/failure-correction testing. Request 11 is only for legacy Cashfree payout retry.

> Requests marked ***(Terminal)*** are destructive. Run them last within their collection and avoid them if you still need the related account or data for later requests.

---

## Shared Automation

Collections capture and share the following Postman globals automatically:

| Global | Set by | Used by |
|---|---|---|
| `shared_shop_id` | `07-barber-profile-shop.json` request 1 | Customer collections and ratings |
| `shared_employee_id` | `08-barber-employees.json` requests 1 and 2 | Customer bookings |
| `shared_service_id` | `09-barber-services.json` requests 1 and 2 | Customer bookings |
| `shared_booking_id` | `04-customer-bookings.json` requests 1 and 3 | Booking detail requests |
| `shared_media_id` | `11-barber-media.json` requests 1 and 5 | Media attachment, detail, and delete |
| `shared_barber_pin` | `07-barber-profile-shop.json` request 8 | Future PIN-gated requests |
| `razorpay_subscription_id` | `17-subscriptions.json` request 3 | Subscription status and webhook simulation |
| `manual_payout_barber_id` | `15-payments-payouts.json` request 6 | Manual payout creation |
| `manual_payout_booking_ids_json` | `15-payments-payouts.json` request 6 | Manual payout creation |
| `payout_id` | `15-payments-payouts.json` request 7 | Payout detail, failure correction, or Cashfree retry |

---

## Special Cases

### `13-barber-ratings.json` — Seed Data Required

The rating reply and remove requests each need ratings in different states (no reply, has reply, removable). The live API cannot manufacture these on demand. Run the seed script first:

```bash
cd server
node scripts/seed-barber-rating-mock-data.js
```

Request 1 captures seeded IDs from the serialized `id` field returned by the API.

### `06-customer-ratings.json` — Add Rating (Request 2)

This collection captures `shop_id` from completed bookings, not from nearby shop discovery. The authenticated customer must already have at least one completed booking, otherwise request 1 fails intentionally because the backend allows ratings only for shops the customer has actually completed a booking with.

Request 2 succeeds once per customer/shop pair. It returns `409 Conflict` on subsequent runs because the API allows only one rating per customer per shop.

### Shop Schedule Input

Barber onboarding and shop schedule updates accept either `HH:MM` or `hh:mm AM/PM` values for `openTime`, `closeTime`, and optional break times. The backend normalizes shop schedule storage to `HH:MM`, while employee working hours stay `HH:MM` and are validated against that normalized schedule.

### `13-barber-ratings.json` — Add Reply (Request 2)

In the current collection this is request 3, because request 2 now fetches `GET /ratings/analytics`.

This succeeds once for the seeded no-reply fixture. It returns `409 Conflict` on subsequent runs if the service rejects replacing an existing reply.

### `10-barber-bookings.json` — Cancel Paid Booking (Request 8)

This is destructive and should be left until the end of a test cycle, after any booking status, earnings, or customer confirmation checks are complete.
