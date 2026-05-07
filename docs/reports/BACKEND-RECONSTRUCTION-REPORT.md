# Backend Reconstruction Report

Date: 2026-04-28
Scope: `server/`

## Summary

The backend was audited from routes through controllers, services, repositories, validators, models, jobs, tests, and Postman generation. The reconstruction keeps the existing Express/Mongoose layered design and fixes the most important production risks: inconsistent booking time contracts, start-only slot locking, unpaid payment failures leaving slots blocked, misplaced discovery routes, action-named payment routes, and test commands that executed live payout scripts.

## API Inventory

All routes are mounted under `/api/v1`.

| Domain | Method | Endpoint | Auth | Controller |
|---|---:|---|---|---|
| Health | GET | `/health` | Public | inline |
| Auth | POST | `/auth/otp/send` | Public | `authController.sendOtp` |
| Auth | POST | `/auth/otp/verify` | Public | `authController.verifyOtp` |
| Auth | POST | `/auth/otp/resend` | Public | `authController.resendOtp` |
| Auth | POST | `/auth/token/refresh` | Public | `authController.refreshToken` |
| Auth | POST | `/auth/logout` | User | `authController.logout` |
| Onboarding | POST | `/onboarding/customers` | Onboarding token | `onboardingController.createCustomerOnboarding` |
| Onboarding | POST | `/onboarding/barbers` | Onboarding token | `onboardingController.createBarberOnboarding` |
| Customers | GET | `/customers/me` | Customer | `customerController.getMe` |
| Customers | PUT | `/customers/me` | Customer | `customerController.updateMe` |
| Customers | GET | `/customers/me/home` | Customer | `customerController.getMyHome` |
| Shops | GET | `/shops/nearby/services` | Public | `shopController.getNearbyServices` |
| Shops | GET | `/shops/nearby` | Public | `shopController.getNearbyShops` |
| Shops | GET | `/shops/doorstep` | Public | `shopController.getDoorstepShops` |
| Shops | GET | `/shops/search` | Public | `shopController.searchShops` |
| Shops | GET | `/shops/:id/employees` | Public | `shopController.getShopEmployees` |
| Shops | GET | `/shops/:id/availability` | User | `shopController.getShopAvailability` |
| Shops | GET | `/shops/:id` | Public | `shopController.getShopById` |
| Shops | GET | `/shops/me` | Barber | `shopController.getMyShop` |
| Shops | PUT | `/shops/me` | Barber | `shopController.updateMyShop` |
| Shops | GET | `/shops/me/upi` | Barber | `shopController.getMyUpiDetails` |
| Shops | PUT | `/shops/me/upi` | Barber | `shopController.updateMyUpiDetails` |
| Shops | PUT | `/shops/me/security` | Barber | `shopController.updateMyPin` |
| Shops | PUT | `/shops/me/media/picture` | Barber | `shopController.updateMyPicture` |
| Shops | PUT | `/shops/me/media/cover` | Barber | `shopController.updateMyCover` |
| Shops | PUT | `/shops/me` | Barber | `shopController.toggleMyStatus` |
| Shops | POST | `/shops/me/sign-out-everywhere` | Barber | `shopController.signOutEverywhere` |
| Shops | DELETE | `/shops/me` | Barber | `shopController.deleteMyShop` |
| Employees | GET | `/employees/:id/calendar` | User | `employeeController.getEmployeeCalendar` |
| Employees | GET | `/employees/:id/available-slots` | User | `employeeController.getAvailableSlots` |
| Employees | GET | `/employees` | Barber | `employeeController.getEmployees` |
| Employees | POST | `/employees` | Barber | `employeeController.addEmployee` |
| Employees | PUT | `/employees/:id` | Barber | `employeeController.updateEmployee` |
| Employees | DELETE | `/employees/:id` | Barber | `employeeController.deleteEmployee` |
| Services | GET | `/services/search` | Public | `serviceController.searchServices` |
| Services | GET | `/services` | Barber | `serviceController.getServices` |
| Services | POST | `/services` | Barber | `serviceController.addService` |
| Services | PUT | `/services/:id` | Barber | `serviceController.updateService` |
| Services | DELETE | `/services/:id` | Barber | `serviceController.deleteService` |
| Bookings | POST | `/bookings` | Customer | `bookingController.createBooking` |
| Bookings | GET | `/bookings` | Customer/Barber | `bookingController.getBookings` |
| Bookings | GET | `/bookings/status` | Barber | `bookingController.getBookingsByStatus` |
| Bookings | GET | `/bookings/pending-confirmations` | Barber | `bookingController.getPendingConfirmations` |
| Bookings | GET | `/bookings/analytics` | Barber | `bookingController.getBookingAnalytics` |
| Bookings | GET | `/bookings/analytics` | Barber | `bookingController.getBookingAnalytics` |
| Bookings | GET | `/bookings/:id` | Customer/Barber | `bookingController.getBookingById` |
| Bookings | GET | `/bookings/:id/confirmation` | Customer | `bookingController.getBookingConfirmation` |
| Bookings | PUT | `/bookings/:id` | Customer | `bookingController.updateBooking` |
| Bookings | PUT | `/bookings/:id/reschedule` | Customer | `bookingController.rescheduleBooking` |
| Bookings | POST | `/bookings/:id/reorder` | Customer | `bookingController.reorderBooking` |
| Bookings | PUT | `/bookings/:id/favorite` | Customer | `bookingController.toggleFavorite` |
| Bookings | PATCH | `/bookings/:id/confirm` | Barber | `bookingController.confirmBookingByBarber` |
| Bookings | POST | `/bookings/:id/cancel` | Customer/Barber | `bookingController.cancelBooking` |
| Bookings | POST | `/bookings/:id/refund` | Admin/Barber | `paymentController.initiateRefund` |
| Bookings | PUT | `/bookings/:id/status` | Barber | `bookingController.updateBookingStatus` |
| Photos | GET | `/photos` | Barber | `photoController.getPhotos` |
| Photos | POST | `/photos` | Barber | `photoController.uploadPhotos` |
| Photos | GET | `/photos/analytics` | Barber | `photoController.getPhotoStats` |
| Photos | GET | `/photos/:id` | Barber | `photoController.getPhotoById` |
| Photos | DELETE | `/photos/:id` | Barber | `photoController.deletePhoto` |
| Ratings | GET | `/shops/:id/ratings` | Public | `ratingController.getShopRatings` |
| Ratings | GET | `/shops/:id/ratings/analytics` | Public | `ratingController.getShopRatingSummary` |
| Ratings | GET | `/ratings/analytics` | Barber | `ratingController.getOwnedRatingSummary` |
| Ratings | GET | `/ratings` | Barber | `ratingController.getOwnedRatings` |
| Ratings | POST | `/ratings` | Customer | `ratingController.addRating` |
| Ratings | PUT | `/ratings/:id/reply` | Barber | `ratingController.updateReply` |
| Ratings | DELETE | `/ratings/:id/reply` | Barber | `ratingController.deleteReply` |
| Ratings | DELETE | `/ratings/:id` | Barber | `ratingController.deleteRating` |
| Earnings | GET | `/earnings` | Barber | `earningsController.getEarnings` |
| Payments | POST | `/payments` | Customer | `paymentController.initiatePayment` |
| Payments | GET | `/payments/:id` | User | `paymentController.getPaymentStatus` |
| Payments | GET | `/payments/redirect` | Public | `paymentController.handleRedirect` |
| Payments | POST | `/payments/webhook` | Provider | `paymentController.handleWebhook` |
| Payouts | POST | `/payouts/webhook` | Provider | `payoutController.handlePayoutWebhook` |
| Payouts | POST | `/payouts/:payoutId/retry` | Admin | `payoutController.retryPayout` |

## Dependency Map

- Auth: `auth.routes` -> `auth.controller` -> `auth.service`, `otp.service` -> `user.repository`, `customer.repository`, `shop.repository`, `photo.repository` -> `User`, `Customer`, `Shop`, `Photo`.
- Onboarding: `onboarding.routes` -> `onboarding.controller` -> `onboarding.service` -> `user.repository`, `customer.repository`, `shop.repository`, `photo.repository` -> `User`, `Customer`, `Shop`, `Photo`.
- Customer profile: `customers.routes` -> `customer.controller` -> `user.service` -> `customer.repository`, `user.repository` -> `Customer`, `User`.
- Shop discovery/profile: `shops.routes` -> `shop.controller` -> `shop.service`, `booking.service`, `photo.service`, `account.service`, `pin.service` -> shop/service/photo/rating/booking/customer/user repositories -> domain models.
- Employees: `employees.routes` -> `employee.controller` -> `employee.service`, `booking.service` -> `employee.repository`, `booking.repository`, `shop.repository` -> `Employee`, `Booking`, `Shop`.
- Services: `services.routes` -> `service.controller` -> `service-catalog.service` -> `service.repository`, `shop.repository` -> `Service`, `Shop`.
- Bookings: `bookings.routes` -> `booking.controller` -> `booking.service` -> `booking.repository`, `employee.repository`, `service.repository`, `shop.repository`, `customer.repository` -> `Booking`, `Employee`, `Service`, `Shop`, `Customer`.
- Payments: `payment.routes` and booking nested payment routes -> `payment.controller` -> `payment.service` -> `payment.repository`, `booking.repository`, `employee.repository`, `service.repository`, `shop.repository`, `customer.repository`, `phonePeAdapter` -> `PaymentTransaction`, `Booking`, `Employee`, `Service`, `Shop`, `Customer`.
- Payouts: `payout.routes`, payout jobs -> `payout.controller` -> `payout.service` -> `payout.repository`, `payment.repository`, `booking.repository`, `shop.repository`, `user.repository`, `cashfreeAdapter` -> `PayoutTransaction`, `PaymentTransaction`, `Booking`, `Shop`, `User`.
- Ratings: `ratings.routes` -> `rating.controller` -> `rating.service` -> `rating.repository`, `booking.repository`, `customer.repository`, `shop.repository` -> `Rating`, `Booking`, `Customer`, `Shop`.
- Photos: `photos.routes` -> `photo.controller` -> `photo.service` -> `photo.repository`, `shop.repository` -> `Photo`, `Shop`.
- Earnings: `earnings.routes` -> `earnings.controller` -> `earnings.service` -> `booking.repository`, `shop.repository` -> `Booking`, `Shop`.

## Flow Designs

- Authentication: OTP send -> verify -> returning user tokens or new user onboarding token -> refresh/logout.
- Onboarding: onboarding token -> customer or barber profile creation -> normal token pair.
- Shop discovery: nearby/search -> shop details -> shop employees -> employee or shop availability.
- Booking: discovery -> availability -> create booking with atomic slot lock -> payment -> awaiting confirmation -> barber confirm -> complete/no-show/cancel.
- Payments: create payment -> provider checkout -> webhook/poll -> success moves booking to `awaiting_confirmation`; failure or expiry cancels unpaid booking and releases slots.
- Barber operations: manage shop, employees, services, photos, bookings, earnings, ratings.
- Ratings: completed booking gate -> customer rating -> barber reply lifecycle.
- Payouts: completed/no-show paid bookings -> batch grouping by barber -> Cashfree transfer -> webhook settlement.

## Key Issues Found

- Booking validators rejected the `HH:MM` availability values that the backend itself returned.
- Slot locks used raw time strings, so `10:00 AM` and `10:00` could bypass each other.
- Slot locks protected only the start time, not the service duration interval.
- Invalid bundle bookings could claim a slot before failing the minimum amount rule.
- Update/reschedule could mutate paid bookings and release locked slots after payment had started.
- Payment failures and expirations left unpaid booking slots held indefinitely.
- Booking discovery APIs were nested under `/bookings/shops/:id/...` instead of the shop resource.
- Payment APIs used action or lookup names: `/payments/initiate`, `/payments/:id/status`, `/payments/booking/:bookingId`.
- Booking cancellation was exposed as `DELETE /bookings/:id`, even though it is a state transition.
- `npm test` executed live script utilities under `server/scripts`, including Cashfree payout checks.
- `no-show` existed as a status constant but was not accepted by booking status APIs.

## What Was Fixed

- Added `slotLockTimes` and `durationMinutes` to bookings.
- Added `employeeRepository.claimSlots()` and `releaseSlots()` for atomic multi-marker locks.
- Normalized booking input times to `HH:MM` in validation and service logic.
- Made availability use each booking's real `durationMinutes`.
- Released slot locks on customer/barber cancellation, auto-cancel, payment failure, payment mismatch, and payment expiry.
- Blocked update/reschedule after payment has started.
- Moved discovery to `/shops/:id/employees` and `/shops/:id/availability`.
- Replaced payment APIs with resource-oriented endpoints.
- Replaced booking deletion route with `POST /bookings/:id/cancel`.
- Added `no-show` to booking status validation and payout eligibility.
- Scoped `npm test` to `src/**/*.test.js`.
- Regenerated Postman collections and updated Postman README.

## New APIs Added

- `GET /api/v1/shops/:id/employees`
- `GET /api/v1/shops/:id/availability`
- `POST /api/v1/bookings/:id/cancel`
- `POST /api/v1/bookings/:id/refund`
- `POST /api/v1/payments`
- `GET /api/v1/payments/:id`

## Removed/Replaced APIs

- Replaced `GET /api/v1/bookings/shops/:id/employees` with `GET /api/v1/shops/:id/employees`.
- Replaced `GET /api/v1/bookings/shops/:id/availability` with `GET /api/v1/shops/:id/availability`.
- Replaced `POST /api/v1/payments/initiate` with `POST /api/v1/payments`.
- Replaced `GET /api/v1/payments/:id/status` with `GET /api/v1/payments/:id`.
- Removed `GET /api/v1/bookings/:id/payment` (redundant with `GET /api/v1/payments/:id`).
- Removed `GET /api/v1/payments/booking/:bookingId` (redundant with `GET /api/v1/payments/:id`).
- Replaced `POST /api/v1/payments/:bookingId/refund` with `POST /api/v1/bookings/:id/refund`.
- Replaced `DELETE /api/v1/bookings/:id` with `POST /api/v1/bookings/:id/cancel`.

## File-Wise Implementation Changes

- `server/src/routes/*`: moved discovery routes, renamed booking cancellation, nested booking payment/refund routes, simplified payment routes.
- `server/src/controllers/booking.controller.js`: renamed `deleteBooking` to `cancelBooking`.
- `server/src/controllers/payment.controller.js`: accepts either `bookingId` or nested booking `id` params.
- `server/src/services/booking.service.js`: added time normalization, duration calculation, multi-slot lock claim/release, paid booking mutation guard, no-show support.
- `server/src/services/payment.service.js`: releases and cancels unpaid bookings on payment failure, expiry, initiation failure, and amount mismatch.
- `server/src/repositories/employee.repository.js`: added atomic `claimSlots()` and `releaseSlots()`.
- `server/src/repositories/booking.repository.js`: included `awaiting_confirmation` in active employee guards, made no-show payout/earnings eligible.
- `server/src/models/booking.model.js`: added `durationMinutes`, `slotLockTimes`, and `noShowAt`.
- `server/src/validators/common.validator.js`: accepts and normalizes both `HH:MM` and `hh:mm AM/PM`.
- `server/src/validators/booking.validator.js`: accepts `awaiting_confirmation` query status and `no-show` status updates.
- `server/src/utils/slot-lock.utils.js`: new helper for slot marker generation and date-only normalization.
- `server/src/utils/slot-calculator.utils.js`: overlap checks now respect actual booked durations.
- `server/scripts/regenerate-postman-collections.mjs`: updated final API URLs, examples, and flow grouping.
- `server/postman-collections/*.json`: regenerated collections.
- `server/package.json`: test script scoped to real source tests.

## Documentation Created

- `docs/flows/authentication.md`
- `docs/flows/onboarding.md`
- `docs/flows/shop-discovery.md`
- `docs/flows/booking.md`
- `docs/flows/payments.md`
- `docs/flows/barber-operations.md`
- `docs/flows/ratings.md`
- `docs/flows/payouts.md`
- `docs/backend-reconstruction-report.md`

## Assumptions

- A failed or expired unpaid payment means the Flutter app should create a new booking rather than retrying the same booking, because the original slot lock is released for availability correctness.
- Existing legacy bookings without `slotLockTimes` release only their normalized start time.
- `no-show` bookings are payable to the barber and therefore payout-eligible.
- Public shop employee listing exposes only public employee fields already returned by `shopService.getEmployeesByShopId`.

## Validation Checklist

- API inventory verified from route files.
- Route -> controller -> service -> repository -> model dependency map verified from imports.
- Booking flow verified against validators, booking service, employee repository, payment service, and tests.
- Payment flow verified against payment service, payment repository, and unit tests.
- Postman generator updated and regenerated.
- Old renamed API URLs removed from Postman generator and collections.
- `npm test` passes: 89 tests, 0 failures.
