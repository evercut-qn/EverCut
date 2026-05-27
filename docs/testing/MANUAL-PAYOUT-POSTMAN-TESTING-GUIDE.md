# Manual Payout Postman Testing Guide

Last updated: 2026-05-27

## Purpose

Use this guide to verify the immutable manual payout workflow and the retained Cashfree retry workflow.

Manual payouts are recorded only after a successful external transfer has already completed. They are created as `gateway=manual`, `status=SUCCESS`, and are not manually status-mutated after creation.

## Required Setup

1. Start the API server.
2. Import or regenerate the Postman collections from `server/postman-collections`.
3. Create or use an admin account.
4. Run the authentication collection admin OTP requests to populate `admin_access_token`.
5. Prepare at least one completed or no-show booking with successful payment and pending payout status.

## Collection Flow

Use `15-payments-payouts.json`.

| Request | Purpose |
|---|---|
| `6. List Pending Manual Payouts` | Captures `manual_payout_barber_id` and `manual_payout_booking_ids_json` |
| `7. Create Manual Payout` | Records completed manual payout and captures `payout_id` |
| `8. List Manual Payout History` | Lists manual payout records |
| `9. Get Payout Detail` | Reads payout detail for `payout_id` |
| `10. Retry Failed Cashfree Payout` | Retries failed/reversed automatic Cashfree payout only |

## Manual Payout Creation

Request:

```http
POST /api/v1/payouts
```

Expected body:

```json
{
  "barberId": "{{manual_payout_barber_id}}",
  "bookingIds": {{manual_payout_booking_ids_json}},
  "utr": "{{manual_payout_utr}}",
  "transferMode": "upi",
  "notes": "Recorded after successful external transfer"
}
```

Expected response properties:

```json
{
  "success": true,
  "data": {
    "gateway": "manual",
    "status": "SUCCESS",
    "utr": "POSTMANUTR..."
  }
}
```

Expected database effects:

| Collection | Expected effect |
|---|---|
| `payout_transactions` | New manual payout with `status=SUCCESS` |
| `bookings` | Linked bookings have completed payout status, UTR, and payout completion time |
| `payment_transactions` | Linked payments have settlement marked settled |

## Payout History

Useful examples:

```text
GET /api/v1/payouts?gateway=manual&page=1&limit=20
GET /api/v1/payouts?status=SUCCESS&gateway=manual
GET /api/v1/payouts?barberId={{manual_payout_barber_id}}
GET /api/v1/payouts?sort=amount:desc
```

## Payout Detail

Request:

```http
GET /api/v1/payouts/{{payout_id}}
```

Verify:

- `gateway` is `manual` for manual payouts.
- `status` is `SUCCESS` for manual payouts.
- `completedByAdminId` is present when the payout was created by an admin.
- Linked bookings and payments are serialized when available.
- No manual correction payload or manual status mutation action is required.

## Cashfree Retry

Request:

```http
POST /api/v1/payouts/{{payout_id}}/retry
```

Use this only with an automatic Cashfree payout whose status is `FAILED` or `REVERSED`.

Expected behavior:

- Admin token is required.
- Manual payouts are rejected by backend business rules.
- Non-failed/non-reversed automatic payouts are rejected.
- Successful retry initiation returns an updated payout response.

## Negative Tests

| Scenario | Expected result |
|---|---|
| Missing admin token | `401` or auth error |
| Non-admin token | `403` |
| Duplicate UTR | Conflict response |
| Duplicate booking IDs | Validation error |
| Settled payment reused | Conflict or bad request |
| Cashfree retry on manual payout | Bad request |
| Cashfree retry on successful automatic payout | Bad request |

## Current Invariant

The Postman collection must not include any manual payout status mutation request. A created manual payout is the final settlement evidence for that transfer.
