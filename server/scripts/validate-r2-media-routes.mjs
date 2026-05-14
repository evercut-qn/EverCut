import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.EVERCUT_API_BASE_URL || 'http://localhost:5000/api/v1';
const BARBER_MOBILE = process.env.EVERCUT_TEST_BARBER_MOBILE || '9876543211';
const CUSTOMER_MOBILE = process.env.EVERCUT_TEST_CUSTOMER_MOBILE || '9876543210';
const TEST_OTP = process.env.EVERCUT_TEST_OTP || '123456';
const SAMPLE_IMAGE_PATH = process.env.EVERCUT_TEST_IMAGE_PATH
  || path.resolve(__dirname, '../postman-collections/assets/sample-upload.png');

const results = [];

const MEDIA_ROUTE_COVERAGE = [
  'POST /media/onboarding/upload-url',
  'POST /media/onboarding/confirm',
  'POST /media/upload-url',
  'POST /media/confirm',
  'GET /media/:id',
  'DELETE /media/:id',
  'POST /media/gallery',
  'GET /media/gallery',
  'GET /media/gallery/stats',
  'POST /onboarding/customers',
  'POST /onboarding/barbers',
  'PATCH /customers/me',
  'PATCH /shops/me/media/picture',
  'PATCH /shops/me/media/cover',
  'POST /employees',
  'PATCH /employees/:id',
  'DELETE /employees/:id',
];

const validatedMediaRoutes = new Set();

const markMediaRoutes = (...routes) => {
  for (const route of routes) validatedMediaRoutes.add(route);
};

const record = (name, status, details = {}) => {
  results.push({ name, status, details });
  const marker = status === 'PASS' ? 'PASS' : status === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`[${marker}] ${name}${details.statusCode ? ` (${details.statusCode})` : ''}`);
  if (details.message) console.log(`      ${details.message}`);
};

const assertCondition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertPresignedUploadContract = (uploadUrl, requiredHeaders) => {
  const parsed = new URL(uploadUrl);
  assertCondition(parsed.searchParams.get('X-Amz-Date'), 'presigned URL is missing X-Amz-Date');
  assertCondition(parsed.searchParams.get('X-Amz-Content-Sha256') === 'UNSIGNED-PAYLOAD', 'presigned URL is missing query payload signature');
  assertCondition(parsed.searchParams.get('X-Amz-SignedHeaders') === 'content-type;host', `unexpected signed headers: ${parsed.searchParams.get('X-Amz-SignedHeaders')}`);
  assertCondition(requiredHeaders?.['Content-Type'], 'Content-Type upload header missing');
  assertCondition(!requiredHeaders?.Authorization, 'direct R2 upload must not send Authorization');
  assertCondition(!requiredHeaders?.['x-amz-content-sha256'], 'x-amz-content-sha256 must stay in the presigned query, not request headers');
  assertCondition(!requiredHeaders?.['Content-Length'], 'Content-Length must not be signed because browsers cannot set it manually');
};

const decodeJwtPayload = (token) => {
  const [, payload] = token.split('.');
  if (!payload) return {};
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
};

const request = async (method, pathOrUrl, { token, body, headers = {} } = {}) => {
  const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
  const url = isAbsolute ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const requestHeaders = {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let requestBody;
  if (body !== undefined) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    requestBody = requestHeaders['Content-Type'] === 'application/json'
      ? JSON.stringify(body)
      : body;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data, text };
};

const runStep = async (name, fn) => {
  try {
    const details = await fn();
    record(name, 'PASS', details);
    return details;
  } catch (error) {
    record(name, 'FAIL', { message: error.message });
    throw error;
  }
};

const cleanupMediaRecord = async (mediaId) => {
  if (!mediaId) return;
  const [{ default: connectDB, disconnectDB }, { default: Media }, { default: storageProvider }] = await Promise.all([
    import('../src/config/database.config.js'),
    import('../src/models/media.model.js'),
    import('../src/services/media/storage-provider.service.js'),
  ]);

  await connectDB();
  try {
    const media = await Media.findById(mediaId).lean();
    if (media?.r2Key) await storageProvider.deleteObject(media.r2Key);
    await Media.deleteOne({ _id: mediaId });
  } finally {
    await disconnectDB();
  }
};

const cleanupOnboardedIdentity = async ({ phoneNumber, mediaId }) => {
  const [
    { default: connectDB, disconnectDB },
    { default: User },
    { default: Customer },
    { default: Shop },
    { default: Media },
    { default: storageProvider },
  ] = await Promise.all([
    import('../src/config/database.config.js'),
    import('../src/models/user.model.js'),
    import('../src/models/customer.model.js'),
    import('../src/models/shop.model.js'),
    import('../src/models/media.model.js'),
    import('../src/services/media/storage-provider.service.js'),
  ]);

  await connectDB();
  try {
    const user = await User.findOne({ phoneNumber }).lean();
    if (mediaId) {
      const media = await Media.findById(mediaId).lean();
      if (media?.r2Key) await storageProvider.deleteObject(media.r2Key);
      await Media.deleteOne({ _id: mediaId });
    }
    if (user?._id) {
      await Promise.all([
        Customer.deleteMany({ userId: user._id }),
        Shop.deleteMany({ ownerId: user._id }),
      ]);
      await User.deleteOne({ _id: user._id });
    }
  } finally {
    await disconnectDB();
  }
};

const login = async (label, mobile, expectedRole) => {
  await runStep(`${label}: send OTP`, async () => {
    const { response, data } = await request('POST', '/auth/otp/send', { body: { mobile } });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    return { statusCode: response.status };
  });

  return runStep(`${label}: verify OTP`, async () => {
    const { response, data } = await request('POST', '/auth/otp/verify', { body: { mobile, otp: TEST_OTP } });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.isNewUser === false, `${label} test account is not onboarded; expected an existing user`);
    assertCondition(data?.data?.accessToken, `${label} accessToken missing`);
    const tokenClaims = decodeJwtPayload(data.data.accessToken);
    const actualRole = data?.data?.user?.role || data?.data?.user?.roleType || tokenClaims.role;
    assertCondition(actualRole === expectedRole, `${label} role mismatch: expected ${expectedRole}, got ${actualRole || 'missing'}`);
    return {
      statusCode: response.status,
      token: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      userId: data.data.user.id,
      role: actualRole,
    };
  });
};

const onboardingLogin = async (label = 'Onboarding') => {
  const mobile = `9${String(Date.now()).slice(-7)}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
  await runStep(`${label}: send OTP for temporary user`, async () => {
    const { response, data } = await request('POST', '/auth/otp/send', { body: { mobile } });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    return { statusCode: response.status, message: `mobile=${mobile}` };
  });

  return runStep(`${label}: verify OTP returns onboarding token`, async () => {
    const { response, data } = await request('POST', '/auth/otp/verify', { body: { mobile, otp: TEST_OTP } });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.isNewUser === true, 'Temporary phone should produce an onboarding session');
    assertCondition(data?.data?.onboardingToken, 'onboardingToken missing');
    return { statusCode: response.status, token: data.data.onboardingToken, mobile };
  });
};

const assertStaticRouteCoverage = async () => {
  await runStep('Static media route coverage is complete', async () => {
    const missing = MEDIA_ROUTE_COVERAGE.filter((route) => !validatedMediaRoutes.has(route));
    assertCondition(missing.length === 0, `Missing validator coverage for: ${missing.join(', ')}`);
    return {
      statusCode: 200,
      message: `${MEDIA_ROUTE_COVERAGE.length} media-affected routes covered`,
    };
  });
};

const uploadAndConfirm = async ({ token, purpose, originalName, label }) => {
  const file = await fs.readFile(SAMPLE_IMAGE_PATH);
  const contentType = 'image/png';

  const uploadRequest = await runStep(`${label}: POST /media/upload-url`, async () => {
    const { response, data } = await request('POST', '/media/upload-url', {
      token,
      body: {
        contentType,
        sizeBytes: file.length,
        purpose,
        originalName,
      },
    });
    assertCondition(response.status === 201, `Expected 201, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.mediaId, 'mediaId missing');
    assertCondition(data?.data?.uploadUrl, 'uploadUrl missing');
    assertPresignedUploadContract(data.data.uploadUrl, data.data.requiredHeaders);
    markMediaRoutes('POST /media/upload-url');
    return {
      statusCode: response.status,
      mediaId: data.data.mediaId,
      uploadUrl: data.data.uploadUrl,
      requiredHeaders: data.data.requiredHeaders,
      r2Key: data.data.r2Key,
    };
  });

  await runStep(`${label}: direct PUT to R2`, async () => {
    const response = await fetch(uploadRequest.uploadUrl, {
      method: 'PUT',
      headers: {
        ...(uploadRequest.requiredHeaders || {}),
      },
      body: file,
    });
    const text = await response.text();
    assertCondition(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}: ${text}`);
    return { statusCode: response.status };
  });

  return runStep(`${label}: POST /media/confirm`, async () => {
    const { response, data } = await request('POST', '/media/confirm', {
      token,
      body: { mediaId: uploadRequest.mediaId },
    });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.cdnUrl, 'cdnUrl missing');
    assertCondition(data?.data?.contentType === contentType, `Unexpected contentType: ${data?.data?.contentType}`);
    markMediaRoutes('POST /media/confirm');
    return {
      statusCode: response.status,
      mediaId: data.data.mediaId,
      cdnUrl: data.data.cdnUrl,
      r2Key: data.data.r2Key,
      fileSize: data.data.fileSize,
    };
  });
};

const uploadAndConfirmOnboarding = async ({ token, originalName, label }) => {
  const file = await fs.readFile(SAMPLE_IMAGE_PATH);
  const contentType = 'image/png';

  const uploadRequest = await runStep(`${label}: POST /media/onboarding/upload-url`, async () => {
    const { response, data } = await request('POST', '/media/onboarding/upload-url', {
      token,
      body: {
        contentType,
        sizeBytes: file.length,
        purpose: 'onboarding',
        originalName,
      },
    });
    assertCondition(response.status === 201, `Expected 201, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.mediaId, 'mediaId missing');
    assertCondition(data?.data?.uploadUrl, 'uploadUrl missing');
    assertPresignedUploadContract(data.data.uploadUrl, data.data.requiredHeaders);
    markMediaRoutes('POST /media/onboarding/upload-url');
    return {
      statusCode: response.status,
      mediaId: data.data.mediaId,
      uploadUrl: data.data.uploadUrl,
      requiredHeaders: data.data.requiredHeaders,
      r2Key: data.data.r2Key,
    };
  });

  await runStep(`${label}: direct PUT to R2`, async () => {
    const response = await fetch(uploadRequest.uploadUrl, {
      method: 'PUT',
      headers: {
        ...(uploadRequest.requiredHeaders || {}),
      },
      body: file,
    });
    const text = await response.text();
    assertCondition(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}: ${text}`);
    return { statusCode: response.status };
  });

  return runStep(`${label}: POST /media/onboarding/confirm`, async () => {
    const { response, data } = await request('POST', '/media/onboarding/confirm', {
      token,
      body: { mediaId: uploadRequest.mediaId },
    });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.cdnUrl, 'cdnUrl missing');
    markMediaRoutes('POST /media/onboarding/confirm');
    return {
      statusCode: response.status,
      mediaId: data.data.mediaId,
      cdnUrl: data.data.cdnUrl,
      r2Key: data.data.r2Key,
      fileSize: data.data.fileSize,
    };
  });
};

const verifyCdnUrl = async (cdnUrl, label) => {
  await runStep(`${label}: signed CDN HEAD`, async () => {
    const response = await fetch(cdnUrl, { method: 'HEAD', headers: { Origin: 'http://localhost:3000' } });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}`);
    return {
      statusCode: response.status,
      message: `content-type=${response.headers.get('content-type')}; cache-control=${response.headers.get('cache-control')}`,
    };
  });

  await runStep(`${label}: unsigned CDN blocked`, async () => {
    const parsed = new URL(cdnUrl);
    const response = await fetch(`${parsed.origin}${parsed.pathname}`);
    assertCondition(response.status === 401, `Expected 401, got ${response.status}`);
    return { statusCode: response.status };
  });
};

const main = async () => {
  console.log(`API base: ${API_BASE_URL}`);
  console.log(`Sample image: ${SAMPLE_IMAGE_PATH}`);

  const barber = await login('Barber', BARBER_MOBILE, 'BARBER');
  const customer = await login('Customer', CUSTOMER_MOBILE, 'CUSTOMER');
  const customerOnboarding = await onboardingLogin('Customer onboarding');
  const barberOnboarding = await onboardingLogin('Barber onboarding');

  await runStep('Unauthenticated /media/upload-url is rejected', async () => {
    const { response } = await request('POST', '/media/upload-url', {
      body: { contentType: 'image/png', sizeBytes: 100, purpose: 'gallery' },
    });
    assertCondition(response.status === 401, `Expected 401, got ${response.status}`);
    return { statusCode: response.status };
  });

  await runStep('Customer cannot attach barber gallery', async () => {
    const { response } = await request('POST', '/media/gallery', {
      token: customer.token,
      body: { mediaIds: ['not-a-real-media-id'], category: 'other', description: 'negative test' },
    });
    assertCondition(response.status === 403, `Expected 403, got ${response.status}`);
    return { statusCode: response.status };
  });

  await runStep('Unsupported media MIME is rejected before upload URL creation', async () => {
    const { response, data } = await request('POST', '/media/upload-url', {
      token: barber.token,
      body: { contentType: 'application/pdf', sizeBytes: 100, purpose: 'gallery' },
    });
    assertCondition(response.status === 400, `Expected 400, got ${response.status}: ${JSON.stringify(data)}`);
    return { statusCode: response.status };
  });

  const customerOnboardingMedia = await uploadAndConfirmOnboarding({
    token: customerOnboarding.token,
    originalName: 'route-validation-customer-onboarding.png',
    label: 'Customer onboarding media',
  });
  await verifyCdnUrl(customerOnboardingMedia.cdnUrl, 'Customer onboarding media');
  await runStep('POST /onboarding/customers consumes confirmed onboarding media', async () => {
    const { response, data } = await request('POST', '/onboarding/customers', {
      token: customerOnboarding.token,
      body: {
        email: `route.customer.${Date.now()}@example.test`,
        firstName: 'Route',
        lastName: 'Customer',
        gender: 'Male',
        dateOfBirth: '1994-06-15',
        address: 'Route Validation Customer Address',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        photoMediaId: customerOnboardingMedia.mediaId,
      },
    });
    assertCondition(response.status === 201, `Expected 201, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.profile?.photoUrl, 'customer onboarding photoUrl missing');
    markMediaRoutes('POST /onboarding/customers');
    return { statusCode: response.status };
  });
  await runStep('Customer onboarding cleanup removes user, profile, media, and R2 object', async () => {
    await cleanupOnboardedIdentity({
      phoneNumber: customerOnboarding.mobile,
      mediaId: customerOnboardingMedia.mediaId,
    });
    return { statusCode: 200 };
  });

  const barberOnboardingMedia = await uploadAndConfirmOnboarding({
    token: barberOnboarding.token,
    originalName: 'route-validation-barber-onboarding.png',
    label: 'Barber onboarding media',
  });
  await verifyCdnUrl(barberOnboardingMedia.cdnUrl, 'Barber onboarding media');
  await runStep('POST /onboarding/barbers consumes confirmed onboarding media', async () => {
    const { response, data } = await request('POST', '/onboarding/barbers', {
      token: barberOnboarding.token,
      body: {
        email: `route.barber.${Date.now()}@example.test`,
        firstName: 'Route',
        lastName: 'Barber',
        gender: 'Male',
        dateOfBirth: '1991-01-12',
        shopName: 'Route Validation Barber Studio',
        category: 'Barber',
        targetCustomers: 'male',
        address: 'Route Validation Barber Address',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        amenities: ['Air Conditioning', 'Waiting Area'],
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        workingHours: { openTime: '09:00', closeTime: '20:00' },
        breakTimes: [{ start: '13:00', end: '14:00' }],
        accountHolderName: 'Route Barber',
        bankName: 'HDFC Bank',
        upiId: 'route.barber@upi',
        pin: '1234',
        confirmPin: '1234',
        photoMediaId: barberOnboardingMedia.mediaId,
      },
    });
    assertCondition(response.status === 201, `Expected 201, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.shop?.coverUrl, 'barber onboarding coverUrl missing');
    markMediaRoutes('POST /onboarding/barbers');
    return { statusCode: response.status };
  });
  await runStep('Barber onboarding cleanup removes user, shop, media, and R2 object', async () => {
    await cleanupOnboardedIdentity({
      phoneNumber: barberOnboarding.mobile,
      mediaId: barberOnboardingMedia.mediaId,
    });
    return { statusCode: 200 };
  });

  const galleryMedia = await uploadAndConfirm({
    token: barber.token,
    purpose: 'gallery',
    originalName: 'route-validation-gallery.png',
    label: 'Barber gallery media',
  });
  await verifyCdnUrl(galleryMedia.cdnUrl, 'Barber gallery media');

  await runStep('GET /media/:id reads confirmed media', async () => {
    const { response, data } = await request('GET', `/media/${galleryMedia.mediaId}`, { token: barber.token });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.id === galleryMedia.mediaId, 'Returned media ID mismatch');
    assertCondition(data?.data?.url, 'media url missing');
    assertCondition(!Object.prototype.hasOwnProperty.call(data.data, 'photoUrl'), 'media response must not duplicate url as photoUrl');
    markMediaRoutes('GET /media/:id');
    return { statusCode: response.status };
  });

  await runStep('Customer cannot read barber-owned media', async () => {
    const { response } = await request('GET', `/media/${galleryMedia.mediaId}`, { token: customer.token });
    assertCondition(response.status === 404, `Expected 404, got ${response.status}`);
    return { statusCode: response.status };
  });

  await runStep('POST /media/gallery attaches confirmed media', async () => {
    const { response, data } = await request('POST', '/media/gallery', {
      token: barber.token,
      body: {
        mediaIds: [galleryMedia.mediaId],
        category: 'shop_interior',
        description: `Route validation ${new Date().toISOString()}`,
      },
    });
    assertCondition(response.status === 201, `Expected 201, got ${response.status}: ${JSON.stringify(data)}`);
    markMediaRoutes('POST /media/gallery');
    return { statusCode: response.status };
  });

  await runStep('GET /media/gallery lists gallery', async () => {
    const { response, data } = await request('GET', '/media/gallery?category=all&page=1&limit=20', { token: barber.token });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(Array.isArray(data?.data), 'Gallery data must be an array');
    for (const item of data.data) {
      assertCondition(!Object.prototype.hasOwnProperty.call(item, 'photoUrl'), 'gallery media item must not duplicate url as photoUrl');
    }
    markMediaRoutes('GET /media/gallery');
    return { statusCode: response.status, message: `items=${data.data.length}` };
  });

  await runStep('GET /media/gallery/stats returns stats', async () => {
    const { response, data } = await request('GET', '/media/gallery/stats', { token: barber.token });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    markMediaRoutes('GET /media/gallery/stats');
    return { statusCode: response.status };
  });

  await runStep('DELETE /media/:id deletes gallery validation media', async () => {
    const { response, data } = await request('DELETE', `/media/${galleryMedia.mediaId}`, { token: barber.token });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    markMediaRoutes('DELETE /media/:id');
    return { statusCode: response.status };
  });

  const shopPictureMedia = await uploadAndConfirm({
    token: barber.token,
    purpose: 'profile',
    originalName: 'route-validation-shop-picture.png',
    label: 'Shop owner picture media',
  });
  await runStep('PATCH /shops/me/media/picture updates barber picture', async () => {
    const { response, data } = await request('PATCH', '/shops/me/media/picture', {
      token: barber.token,
      body: { mediaId: shopPictureMedia.mediaId },
    });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.photoUrl, 'photoUrl missing');
    markMediaRoutes('PATCH /shops/me/media/picture');
    return { statusCode: response.status };
  });

  const coverMedia = await uploadAndConfirm({
    token: barber.token,
    purpose: 'cover',
    originalName: 'route-validation-cover.png',
    label: 'Shop cover media',
  });
  await runStep('PATCH /shops/me/media/cover updates cover', async () => {
    const { response, data } = await request('PATCH', '/shops/me/media/cover', {
      token: barber.token,
      body: { mediaId: coverMedia.mediaId },
    });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.coverUrl, 'coverUrl missing');
    markMediaRoutes('PATCH /shops/me/media/cover');
    return { statusCode: response.status };
  });

  const employeeMedia = await uploadAndConfirm({
    token: barber.token,
    purpose: 'employee',
    originalName: 'route-validation-employee.png',
    label: 'Employee create media',
  });
  const employee = await runStep('POST /employees creates employee with photoMediaId', async () => {
    const phoneSuffix = String(Date.now()).slice(-8);
    const { response, data } = await request('POST', '/employees', {
      token: barber.token,
      body: {
        firstName: 'Route',
        lastName: 'Validation',
        phoneNumber: `9${phoneSuffix}`,
        gender: 'Female',
        dateOfBirth: '1995-05-15',
        workingHours: { start: '09:00', end: '18:00' },
        blockedDates: [],
        photoMediaId: employeeMedia.mediaId,
      },
    });
    assertCondition(response.status === 201, `Expected 201, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data?.data?.id, 'employee id missing');
    markMediaRoutes('POST /employees');
    return { statusCode: response.status, employeeId: data.data.id };
  });

  const employeeUpdateMedia = await uploadAndConfirm({
    token: barber.token,
    purpose: 'employee',
    originalName: 'route-validation-employee-update.png',
    label: 'Employee update media',
  });
  await runStep('PATCH /employees/:id updates employee with photoMediaId', async () => {
    const { response, data } = await request('PATCH', `/employees/${employee.employeeId}`, {
      token: barber.token,
      body: {
        lastName: 'Validation Updated',
        workingHours: { start: '10:00', end: '19:00' },
        blockedDates: [],
        photoMediaId: employeeUpdateMedia.mediaId,
      },
    });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    markMediaRoutes('PATCH /employees/:id');
    return { statusCode: response.status };
  });

  await runStep('DELETE /employees/:id cleans up validation employee', async () => {
    const { response, data } = await request('DELETE', `/employees/${employee.employeeId}`, { token: barber.token });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    markMediaRoutes('DELETE /employees/:id');
    return { statusCode: response.status };
  });

  const customerMedia = await uploadAndConfirm({
    token: customer.token,
    purpose: 'avatar',
    originalName: 'route-validation-customer.png',
    label: 'Customer profile media',
  });
  await runStep('PATCH /customers/me updates customer photoMediaId', async () => {
    const { response, data } = await request('PATCH', '/customers/me', {
      token: customer.token,
      body: { photoMediaId: customerMedia.mediaId },
    });
    assertCondition(response.status === 200, `Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    markMediaRoutes('PATCH /customers/me');
    return { statusCode: response.status };
  });

  await assertStaticRouteCoverage();

  const failed = results.filter((result) => result.status === 'FAIL');
  console.log('\nValidation summary');
  console.log(JSON.stringify({
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    apiBaseUrl: API_BASE_URL,
  }, null, 2));

  if (failed.length > 0) process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
