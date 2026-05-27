# Payout Immutability Cleanup Report

Date: 2026-05-27

## Decision

Manual payouts are immutable successful settlement records. The manual payout mutation surface was removed from backend APIs, admin UI, Postman tooling, and active payout documentation.

## Rationale

The system creates manual payouts only after an admin has completed the external transfer and has a UTR/reference. Marking that record failed later would rewrite settlement evidence and could accidentally reopen bookings and unsettle payments even though money had already moved.

Provider-owned Cashfree payouts remain mutable because the application initiates those transfers before final provider outcome is known.

## Final Behavior

- Manual payout creation records `gateway=manual`, `status=SUCCESS`.
- Manual payout records can be listed and viewed.
- Manual payout status cannot be changed by admins.
- Cashfree webhooks, polling, reversals, and retry remain supported.
- Admin UI exposes retry only for failed/reversed Cashfree payouts.

## Operational Follow-Up

If bank reconciliation later finds a mismatch, handle it as a separate adjustment/support workflow rather than by changing the original payout record.
