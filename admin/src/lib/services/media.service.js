import { apiFetch } from '@/lib/api-client';

export function requestNotificationImageUpload({ contentType, sizeBytes }, { token } = {}) {
  return apiFetch('/media/upload-url', {
    method: 'POST',
    body: {
      contentType,
      sizeBytes,
      purpose: 'notification',
    },
    token,
  });
}

export function confirmMediaUpload(mediaId, { token } = {}) {
  return apiFetch('/media/confirm', {
    method: 'POST',
    body: {
      mediaId,
    },
    token,
  });
}
