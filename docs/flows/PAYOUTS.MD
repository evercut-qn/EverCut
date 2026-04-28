# Payouts Flow

## Overview

Payouts send barber earnings through Cashfree after bookings are completed or marked no-show and have successful payments.

## Backend-Driven Flow

1. Customer pays a booking successfully.
2. Barber confirms and completes the booking, or marks it `no-show`.
3. Payout batch job finds eligible bookings:
   status in `completed` or `no-show`,
   `paymentStatus=success`,
   `payoutStatus=not_initiated`.
4. Backend verifies completed payment transactions.
5. Backend creates or refreshes Cashfree beneficiary.
6. Backend initiates payout.
7. Cashfree webhook updates payout and settlement state.

## Admin API

Retry failed payout:

`POST /api/v1/payouts/:payoutId/retry`

## Webhook

Cashfree sends payout events to:

`POST /api/v1/payouts/webhook`

## Important Notes

- Payout amounts are derived from completed payment settlement records, not caller-provided totals.
- Refunds are blocked once payout has started, except manual support paths outside the public API.
- The default unit test command no longer runs live Cashfree script utilities.
