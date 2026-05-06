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
| `01-authentication.json` | EverCut - Authentication | OTP authentication for customer and barber test users, token capture, and health check |
| `02-onboarding.json` | EverCut - Onboarding | First-run customer and barber onboarding using onboarding JWTs, with shop schedule normalization to 24-hour storage |
| `03-customer-profile.json` | EverCut - Customer | Profile read/update and service discovery ID capture |
| `04-customer-bookings.json` | EverCut - Customer Bookings | Full booking lifecycle: create, schedule update, favorite add/remove, reorder, cancel |
| `05-customer-shop-discovery.json` | EverCut - Customer Shop Discovery | Shop discovery, availability, favorites, and keyword search |
| `06-customer-ratings.json` | EverCut - Customer Ratings | Submit a rating and read shop rating data |
| `07-barber-profile-shop.json` | EverCut - Barber Profile & Shop | Shop management: current profile, payout details, status, images, PIN, and account actions |
| `08-barber-employees.json` | EverCut - Barber Employees | Employee CRUD with optional photo upload and 24-hour employee schedule examples |
| `09-barber-services.json` | EverCut - Barber Services | Service catalogue CRUD (single and bundled services) |
| `10-barber-bookings.json` | EverCut - Barber Bookings | Booking administration: list filters, analytics, status update, cancellation |
| `11-barber-photos.json` | EverCut - Barber Photos | Shop gallery: upload, list, stats, delete |
| `12-barber-earnings.json` | EverCut - Barber Earnings | Earnings summary (requires completed bookings for non-zero values) |
| `13-barber-ratings.json` | EverCut - Barber Ratings | Rating listing, summary, reply management, and rating removal |
| `14-dashboard.json` | EverCut - Dashboard | Dashboard analytics: overview, pulse metrics, staff availability, today's queue |
| `15-payments-payouts.json` | EverCut - Payments & Payouts | Native PhonePe SDK payment initiation/verification/status/refunds and Cashfree payout retry |
| `16-notifications.json` | EverCut - Notifications | FCM token management, notification history, unread counts, and read tracking |
| `EverCut.postman_environment.json` | — | Active environment with OTP/JWT variables for local testing |
| `assets/sample-upload.png` | — | Sample image pre-wired into file-upload requests |

---

## Collection Request Reference

### `01-authentication.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/auth/otp/send` | Send OTP to customer |
| 2 | POST | `/api/v1/auth/otp/verify` | Verify customer OTP - captures onboarding or session tokens |
| 3 | POST | `/api/v1/auth/otp/send` | Send OTP to barber |
| 4 | POST | `/api/v1/auth/otp/verify` | Verify barber OTP - captures onboarding or session tokens |
| 5 | POST | `/api/v1/auth/token/refresh` | Refresh customer access token |
| 6 | POST | `/api/v1/auth/token/refresh` | Refresh barber access token |
| 7 | POST | `/api/v1/auth/logout` | Logout customer *(Terminal)* |
| 8 | POST | `/api/v1/auth/otp/resend` | Resend OTP (text channel) |
| 9 | GET | `/api/v1/health` | Health check |

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
| 1 | GET | `/api/v1/bookings?timeframe=upcoming` | List upcoming bookings - captures booking ID |
| 2 | GET | `/api/v1/employees/{{employee_id}}/availability` | Get employee availability |
| 3 | POST | `/api/v1/bookings` | Create a booking |
| 4 | GET | `/api/v1/bookings/{{booking_id}}` | Get booking details |
| 5 | PUT | `/api/v1/bookings/{{booking_id}}/favorite` | Add booking favorite |
| 6 | GET | `/api/v1/bookings?favorite=true` | List favorite bookings |
| 7 | PATCH | `/api/v1/bookings/{{booking_id}}` | Update booking schedule |
| 8 | POST | `/api/v1/bookings` | Reorder from `sourceBookingId` |
| 9 | DELETE | `/api/v1/bookings/{{booking_id}}/favorite` | Remove booking favorite |
| 10 | PATCH | `/api/v1/bookings/{{booking_id}}` | Cancel booking with `status=cancelled` |

### `05-customer-shop-discovery.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/shops?coordinates={{coordinates}}` | Get nearby shops - captures shop ID |
| 2 | GET | `/api/v1/shops/{{shop_id}}` | Get shop details - captures service ID |
| 3 | GET | `/api/v1/shops/{{shop_id}}/employees` | Get shop employees - captures employee ID |
| 4 | GET | `/api/v1/employees/{{employee_id}}/availability` | Get employee available slots |
| 5 | GET | `/api/v1/shops/{{shop_id}}/availability` | Get shop-wide availability |
| 6 | PUT | `/api/v1/shops/{{shop_id}}/favorite` | Add favorite shop |
| 7 | GET | `/api/v1/shops/favorites` | List favorite shops |
| 8 | DELETE | `/api/v1/shops/{{shop_id}}/favorite` | Remove favorite shop |
| 9 | GET | `/api/v1/shops?category=Door-Step` | Get doorstep shops |
| 10 | GET | `/api/v1/services/search` | Search services by keyword and gender |
| 11 | GET | `/api/v1/shops?query={{shop_search_query}}` | Search shops by keyword |

### `06-customer-ratings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/bookings?timeframe=past&limit=100` | Bootstrap: capture a shop ID from a completed past booking |
| 2 | POST | `/api/v1/ratings` | Submit a rating *(once per customer/shop - returns 409 on rerun)* |
| 3 | GET | `/api/v1/ratings/shop/{{shop_id}}` | List shop ratings |
| 4 | GET | `/api/v1/ratings/shop/{{shop_id}}/summary` | Get rating summary |

### `07-barber-profile-shop.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/shops/me` | Get profile - captures shop ID |
| 2 | PATCH | `/api/v1/shops/me` | Update business info |
| 3 | GET | `/api/v1/shops/me/payout-details` | Get payout details |
| 4 | PATCH | `/api/v1/shops/me/payout-details` | Update payout details |
| 5 | PATCH | `/api/v1/shops/me/status` | Ensure shop is open |
| 6 | PATCH | `/api/v1/shops/me/picture` | Update profile picture |
| 7 | PATCH | `/api/v1/shops/me/cover` | Update cover image |
| 8 | PATCH | `/api/v1/shops/me/pin` | Update PIN |
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
| 5 | PATCH | `/api/v1/employees/{{employee_id}}/status` | Toggle employee status |
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
| 2 | GET | `/api/v1/bookings/analytics/summary` | Get booking stats |
| 3 | GET | `/api/v1/bookings/analytics/milestones` | Get the monthly completed-booking milestone progress card data |
| 4 | GET | `/api/v1/bookings?status=awaiting_confirmation&paymentStatus=success` | List pending confirmations |
| 5 | GET | `/api/v1/bookings?status=confirmed` | Filter bookings by status |
| 6 | PATCH | `/api/v1/bookings/{{booking_id_status}}` | Confirm a booking |
| 7 | PATCH | `/api/v1/bookings/{{booking_id_status}}` | Update booking status |
| 8 | PATCH | `/api/v1/bookings/{{booking_id_delete}}` | Cancel a paid booking *(Terminal)* |

### `11-barber-photos.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/photos` | List gallery photos - captures photo ID |
| 2 | POST | `/api/v1/photos` | Upload photos |
| 3 | GET | `/api/v1/photos/stats` | Get photo stats |
| 4 | GET | `/api/v1/photos/{{photo_id}}` | Get photo by ID |
| 5 | DELETE | `/api/v1/photos/{{photo_id}}` | Delete photo *(Terminal)* |

### `12-barber-earnings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/earnings` | Get earnings summary |

### `13-barber-ratings.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/ratings` | List ratings - captures seeded IDs for reply/remove operations |
| 2 | GET | `/api/v1/ratings/summary` | Get the authenticated barber shop's rating summary |
| 3 | POST | `/api/v1/ratings/{{rating_id_add_reply}}/reply` | Add reply to a rating *(returns 409 on rerun once a reply exists)* |
| 4 | PUT | `/api/v1/ratings/{{rating_id_update_reply}}/reply` | Update an existing reply |
| 5 | DELETE | `/api/v1/ratings/{{rating_id_update_reply}}/reply` | Delete a reply |
| 6 | DELETE | `/api/v1/ratings/{{rating_id_remove_rating}}` | Remove a rating |

### `14-dashboard.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | GET | `/api/v1/earnings/overview` | Get complete dashboard overview (pulse + staff + queue) |
| 2 | GET | `/api/v1/bookings/analytics/today` | Get today's pulse metrics (occupancy + status breakdown) |
| 3 | GET | `/api/v1/employees/analytics/availability` | Get staff availability and progress tracking |
| 4 | GET | `/api/v1/bookings/analytics/queue?timeframe=active` | Get today's active queue |
| 5 | GET | `/api/v1/bookings/analytics/queue?timeframe=upcoming` | Get today's upcoming queue |

### `15-payments-payouts.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/payments` | Create native PhonePe SDK order for a pending customer booking |
| 2 | GET | `/api/v1/payments/{{payment_id}}` | Read and poll payment status |
| 2B | GET | `/api/v1/payments` | List visible payments for the authenticated actor |
| 3 | POST | `/api/v1/payments/{{payment_id}}/verify` | Verify Flutter SDK callback through backend/PhonePe Order Status |
| 4 | POST | `/api/v1/bookings/{{payment_booking_id}}/refunds` | Initiate refund before payout starts |
| 5 | POST | `/api/v1/payouts/{{payout_id}}/retry` | Retry failed or reversed payout as admin |

### `16-notifications.json`

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/notifications/tokens` | Register or refresh an FCM token for the authenticated user |
| 2 | GET | `/api/v1/notifications?page=1&limit=20` | List notification history and capture a notification ID |
| 3 | GET | `/api/v1/notifications/unread-count` | Get unread notification count |
| 4 | PATCH | `/api/v1/notifications/{{notification_id}}/read` | Mark one notification read |
| 5 | PATCH | `/api/v1/notifications/read-all` | Mark all notifications read |
| 6 | DELETE | `/api/v1/notifications/tokens` | Revoke the authenticated user's FCM token |

---

### Prerequisites

1. In `src/config/index.js`, set `testMode: true` inside the `msg91` config block to skip real SMS in development. The default is `false`; the inline comment says `flip to true in dev to skip real SMS`.
2. The test OTP is hardcoded as `123456` via `testOtp: '123456'` in the same config block - no env var needed.
3. From `server/`, start the API with `npm run dev`.

No manual token generation needed - the authentication and onboarding collections handle token capture automatically.

### Import into Postman

1. Import every `.json` collection from this folder.
2. Import `EverCut.postman_environment.json` as the active environment.
3. Verify `test_customer_mobile`, `test_barber_mobile`, and `test_otp` are set in the environment.
4. Run `01-authentication.json` requests 1-4 to send and verify OTP for both test users.
5. Returning users get access tokens immediately; brand-new users get onboarding tokens first and then receive access tokens from `02-onboarding.json`.
6. Run the other collections in order.

> Access tokens expire after 15 minutes once onboarding is complete. Run the **Refresh Token** requests (5-6) or re-run requests 1-4 to get fresh tokens. Tokens are auto-captured - no manual copy-paste.

### Test Users

| Role | MongoDB `_id` | Email | Phone |
|---|---|---|---|
| Customer | *(auto-generated on first successful onboarding)* | `test.customer@example.com` | `9876543210` |
| Barber | *(auto-generated on first successful onboarding)* | `test.barber@example.com` | `9876543211` |

### Environment Variables

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:5000` |
| `api_prefix` | `api/v1` |
| `test_customer_mobile` | `9876543210` |
| `test_barber_mobile` | `9876543211` |
| `test_otp` | `123456` |
| `customer_access_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `customer_refresh_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `barber_access_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `barber_refresh_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `customer_onboarding_token` | *(auto-set by 01-authentication.json)* |
| `barber_onboarding_token` | *(auto-set by 01-authentication.json)* |
| `admin_access_token` | Manual ADMIN JWT for payout retry |
| `payment_booking_id` | Booking ID to pay for; can be copied from `shared_booking_id` |
| `payment_id` | Auto-set by `15-payments-payouts.json` request 1 |
| `merchant_order_id` | Auto-set by `15-payments-payouts.json` request 1 |
| `merchant_refund_id` | Auto-set by `15-payments-payouts.json` request 5 |
| `refund_id` | Auto-set by `15-payments-payouts.json` request 5 |
| `payout_id` | Manual payout transaction ID for retry tests |

### Auth Collection Requests

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/auth/otp/send` | Send OTP to customer |
| 2 | POST | `/api/v1/auth/otp/verify` | Verify customer OTP - captures onboarding or session tokens |
| 3 | POST | `/api/v1/auth/otp/send` | Send OTP to barber |
| 4 | POST | `/api/v1/auth/otp/verify` | Verify barber OTP - captures onboarding or session tokens |
| 5 | POST | `/api/v1/auth/token/refresh` | Refresh customer access token |
| 6 | POST | `/api/v1/auth/token/refresh` | Refresh barber access token |
| 7 | POST | `/api/v1/auth/logout` | Logout customer *(Terminal)* |
| 8 | POST | `/api/v1/auth/otp/resend` | Resend OTP (text channel) |
| 9 | GET | `/api/v1/health` | Health check |

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
| `shared_photo_id` | `11-barber-photos.json` requests 1 and 2 | Photo detail and delete |
| `shared_barber_pin` | `07-barber-profile-shop.json` request 8 | Future PIN-gated requests |

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

This collection captures `shop_id` from `GET /bookings?timeframe=past`, not from nearby shop discovery. The authenticated customer must already have at least one completed past booking, otherwise request 1 fails intentionally because the backend allows ratings only for shops the customer has actually completed a booking with.

Request 2 succeeds once per customer/shop pair. It returns `409 Conflict` on subsequent runs because the API allows only one rating per customer per shop.

### Shop Schedule Input

Barber onboarding and shop schedule updates accept either `HH:MM` or `hh:mm AM/PM` values for `openTime`, `closeTime`, and break times. The backend normalizes shop schedule storage to `HH:MM`, while employee working hours stay `HH:MM` and are validated against that normalized schedule.

### `13-barber-ratings.json` — Add Reply (Request 2)

In the current collection this is request 3, because request 2 now fetches `GET /ratings/summary`.

This succeeds once for the seeded no-reply fixture. It returns `409 Conflict` on subsequent runs because `POST /ratings/:id/reply` no longer overwrites an existing reply.

### `10-barber-bookings.json` — Cancel Paid Booking (Request 8)

This is destructive and should be left until the end of a test cycle, after any booking status, earnings, or customer confirmation checks are complete.
