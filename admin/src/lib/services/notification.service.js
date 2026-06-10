import { apiFetch } from '@/lib/api-client';
import { buildQuery } from '@/lib/services/query';

const broadcastBase = '/notifications/broadcasts';

export function getNotifications({ page, limit, status, category, search, token } = {}) {
  return apiFetch(`${broadcastBase}${buildQuery({ page, limit, status, category, search })}`, {
    method: 'GET',
    token,
  });
}

export function createNotification(payload, { token } = {}) {
  return apiFetch(broadcastBase, {
    method: 'POST',
    body: payload,
    token,
  });
}

export function getNotification(notificationId, { token } = {}) {
  return apiFetch(`${broadcastBase}/${notificationId}`, {
    method: 'GET',
    token,
  });
}

export function getNotificationRecipients(notificationId, { page, limit, status, roleType, token } = {}) {
  return apiFetch(`${broadcastBase}/${notificationId}/recipients${buildQuery({ page, limit, status, roleType })}`, {
    method: 'GET',
    token,
  });
}

export function getNotificationInboxItems(notificationId, { page, limit, read, token } = {}) {
  return apiFetch(`${broadcastBase}/${notificationId}/inbox-items${buildQuery({ page, limit, read })}`, {
    method: 'GET',
    token,
  });
}

export function getNotificationAuditLogs(notificationId, { limit, token } = {}) {
  return apiFetch(`${broadcastBase}/${notificationId}/audits${buildQuery({ limit })}`, {
    method: 'GET',
    token,
  });
}
