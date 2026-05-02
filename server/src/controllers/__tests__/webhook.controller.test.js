import assert from 'node:assert/strict';
import test from 'node:test';

import createApp from '../../app.js';

const withTestServer = async (fn) => {
    const app = createApp();
    const server = app.listen(0);

    try {
        const { port } = server.address();
        return await fn(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
};

test('PhonePe webhook endpoint rejects invalid authorization', async () => {
    await withTestServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/payments/webhook`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: 'invalid-signature',
            },
            body: JSON.stringify({
                event: 'checkout.order.completed',
                payload: { merchantOrderId: 'ORDER_1', state: 'COMPLETED' },
            }),
        });

        assert.equal(response.status, 400);
    });
});

test('Cashfree payout webhook endpoint rejects invalid signature', async () => {
    await withTestServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/payouts/webhook`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-webhook-signature': 'invalid-signature',
                'x-webhook-timestamp': '1713850000',
            },
            body: JSON.stringify({
                type: 'TRANSFER_SUCCESS',
                data: { transfer_id: 'PAYOUT_1', status: 'SUCCESS' },
            }),
        });

        assert.equal(response.status, 400);
    });
});
