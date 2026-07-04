import assert from 'node:assert/strict';
import test from 'node:test';

import { corsHeaders, isPublicMediaPath, parseRange } from './worker.js';

test('notification images are public for stable FCM delivery', () => {
  assert.equal(isPublicMediaPath('/images/notifications/system/evercut.png'), true);
  assert.equal(isPublicMediaPath('/images/notifications/admin-1/promo.png'), true);
});

test('all other media paths remain protected', () => {
  assert.equal(isPublicMediaPath('/images/avatars/user-1/profile.png'), false);
  assert.equal(isPublicMediaPath('/images/services/service-1.png'), false);
  assert.equal(isPublicMediaPath('/videos/gallery/shop-1/video.mp4'), false);
});

test('byte range parsing distinguishes malformed and unsatisfiable ranges', () => {
  assert.deepEqual(parseRange('bytes=0-15', 100), {
    offset: 0,
    length: 16,
  });
  assert.equal(parseRange('not-a-range', 100), undefined);
  assert.deepEqual(parseRange('bytes=999-1000', 100), {
    unsatisfiable: true,
  });
});

test('CORS headers only allow configured browser origins', () => {
  const env = {
    ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5000',
  };

  const allowed = corsHeaders(new Request('https://media.test/image.png', {
    headers: { Origin: 'http://localhost:3000' },
  }), env);
  const unlisted = corsHeaders(new Request('https://media.test/image.png', {
    headers: { Origin: 'https://evil.example' },
  }), env);

  assert.equal(allowed['Access-Control-Allow-Origin'], 'http://localhost:3000');
  assert.equal('Access-Control-Allow-Origin' in unlisted, false);
});
