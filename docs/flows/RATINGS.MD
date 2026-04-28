# Ratings Flow

## Overview

Customers can rate a shop only after completing a booking with that shop. Barbers can view ratings for their own shop and manage replies.

## Customer APIs

1. Find a completed past booking:
   `GET /api/v1/bookings?type=past`

2. Create rating:
   `POST /api/v1/ratings`

3. View shop ratings:
   `GET /api/v1/ratings/shop/:id`

4. View summary:
   `GET /api/v1/ratings/shop/:id/summary`

## Create Rating Request

```json
{
  "shopId": "shop_id",
  "rating": 5,
  "review": "Great service."
}
```

## Barber APIs

- List owned ratings: `GET /api/v1/ratings`
- Summary: `GET /api/v1/ratings/summary`
- Add reply: `POST /api/v1/ratings/:id/reply`
- Update reply: `PUT /api/v1/ratings/:id/reply`
- Delete reply: `DELETE /api/v1/ratings/:id/reply`
- Delete rating: `DELETE /api/v1/ratings/:id`

## Important Notes

- Duplicate customer rating for the same shop returns `409`.
- Duplicate reply creation returns `409`; use update for existing replies.
