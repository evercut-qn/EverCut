/**
 * regenerate-postman-collections.mjs
 *
 * Programmatically rebuilds every Postman collection in postman-collections/.
 *
 * What this script does:
 * 1. Defines all request items, pre-request scripts, and test scripts in code
 * 2. Writes one JSON file per collection (01-authentication.json … 13-barber-ratings.json)
 * 3. Writes the local Postman environment template used by the collections
 *
 * When to run it:
 * Run after changing route URLs, request bodies, validator shapes, or Postman test scripts.
 * The resulting files can be re-imported into Postman immediately.
 *
 * Usage:
 * node scripts/regenerate-postman-collections.mjs
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COLLECTIONS_DIR = resolve(__dirname, '..', 'postman-collections');

mkdirSync(COLLECTIONS_DIR, { recursive: true });

const bearerAuth = (tokenVariable) => ({
  type: 'bearer',
  bearer: [{ key: 'token', value: `{{${tokenVariable}}}`, type: 'string' }],
});

const textVariable = (key, value = '', description) => {
  const variable = { key, value, type: 'string' };
  if (description) variable.description = description;
  return variable;
};

const request = ({ method, url, description, headers = [], body, auth, event }) => {
  const requestObject = { method, header: headers, url, description };
  if (body) requestObject.body = body;
  if (auth) requestObject.auth = auth;
  const item = { request: requestObject };
  if (event) item.event = event;
  return item;
};

const jsonBody = (raw) => ({ mode: 'raw', raw, options: { raw: { language: 'json' } } });

const standardEnvelopeAssertions = [
  "pm.test('response uses the standard envelope', function () {",
  '  const response = pm.response.json();',
  "  pm.expect(response).to.be.an('object');",
  "  pm.expect(response).to.have.property('success');",
  "  pm.expect(response.success).to.be.a('boolean');",
  "  pm.expect(response).to.have.property('message');",
  "  pm.expect(response.message).to.be.a('string');",
  "  pm.expect(response).to.have.property('data');",
  "  if (response.meta !== undefined) pm.expect(response.meta).to.be.an('object');",
  "  const responseText = JSON.stringify(response);",
  "  ['\"$__\"', '\"_doc\"', '\"$isNew\"', '\"__v\"', '\"parent\"', '\"populated\"'].forEach((field) => {",
  "    pm.expect(responseText, `internal field ${field} must not appear`).to.not.include(field);",
  "  });",
  '});',
];

const testEvent = (...exec) => [{ listen: 'test', script: { type: 'text/javascript', exec: [...standardEnvelopeAssertions, ...exec] } }];
const rawTestEvent = (...exec) => [{ listen: 'test', script: { type: 'text/javascript', exec } }];
const preRequestEvent = (...exec) => [{ listen: 'prerequest', script: { type: 'text/javascript', exec } }];
const mergedEvents = (preRequestExec, testExec) => [
  { listen: 'prerequest', script: { type: 'text/javascript', exec: preRequestExec } },
  { listen: 'test', script: { type: 'text/javascript', exec: [...standardEnvelopeAssertions, ...testExec] } },
];

const collectionPreRequest = ({
  syncPairs = [],
  includeDateHelpers = false,
  extra = [],
} = {}) => {
  const exec = [];

  if (syncPairs.length > 0) {
    exec.push(
      "// Automatically pull IDs from Globals ONLY if user hasn't manually set them in Collection Variables.",
      "const syncGlobalToCollection = (globalKey, collectionKey = globalKey) => {",
      "  const globalVal = pm.globals.get(globalKey);",
      "  const collVal = pm.collectionVariables.get(collectionKey);",
      "  if (globalVal && !collVal) {",
      "    pm.collectionVariables.set(collectionKey, globalVal);",
      "  }",
      "};"
    );
    exec.push(...syncPairs.map(([sourceKey, collectionKey]) => `syncGlobalToCollection('${sourceKey}', '${collectionKey}');`));
  }

  if (includeDateHelpers) {
    exec.push(
      "// Smart date/time generation for bookings",
      "const getNextAvailableDate = (daysAhead, skipSundays = true) => {",
      "  const date = new Date();",
      "  date.setHours(0, 0, 0, 0);",
      "  date.setDate(date.getDate() + daysAhead);",
      "  if (skipSundays) {",
      "    while (date.getDay() === 0) { date.setDate(date.getDate() + 1); }",
      "  }",
      "  return date;",
      "};",
      "const toIsoDate = (date) => {",
      "  const year = date.getFullYear();",
      "  const month = String(date.getMonth() + 1).padStart(2, '0');",
      "  const day = String(date.getDate()).padStart(2, '0');",
      "  return `${year}-${month}-${day}`;",
      "};",
      "const getWorkingHourTime = (hour, minute = 0) => {",
      "  const clampedHour = Math.max(9, Math.min(20, hour));",
      "  return `${String(clampedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;",
      "};",
      "",
      "// Check if user has manually set dates/times in Collection Variables",
      "const hasManualDate = pm.collectionVariables.get('booking_date');",
      "const hasManualTime = pm.collectionVariables.get('booking_time');",
      "",
      "if (!hasManualDate) {",
      "  pm.collectionVariables.set('booking_date', toIsoDate(getNextAvailableDate(1)));",
      "  pm.collectionVariables.set('booking_update_date', toIsoDate(getNextAvailableDate(2)));",
      "  pm.collectionVariables.set('booking_reorder_date', toIsoDate(getNextAvailableDate(3)));",
      "  pm.collectionVariables.set('availability_date', toIsoDate(getNextAvailableDate(2)));",
      "}",
      "",
      "if (!hasManualTime) {",
      "  pm.collectionVariables.set('booking_time', getWorkingHourTime(11, 5));",
      "  pm.collectionVariables.set('booking_update_time', getWorkingHourTime(12, 10));",
      "  pm.collectionVariables.set('booking_reorder_time', getWorkingHourTime(14, 15));",
      "}"
    );
  }

  exec.push(...extra);
  return preRequestEvent(...exec);
};

const baseVariables = (...extra) => [
  textVariable('base_url', 'http://localhost:5000', 'Default local API server'),
  textVariable('api_prefix', 'api/v1', 'API prefix used by every request'),
  ...extra,
];

const writeCollection = (filename, collection) => {
  const filePath = resolve(COLLECTIONS_DIR, filename);
  writeFileSync(filePath, `${JSON.stringify(collection, null, 2)}\n`);
};

const customerLocationText = 'Church Street, Bengaluru';
const barberLocationText = 'MG Road, Bengaluru';
const sharedCoordinates = '77.5946,12.9716';
const customerLocationGeoJson = '{"type":"Point","coordinates":[77.5946,12.9716]}';
const barberLocationGeoJson = '{"type":"Point","coordinates":[77.5946,12.9716]}';

const authenticationCollection = {
  info: {
    name: 'EverCut - Authentication',
    description: 'OTP authentication endpoints for customer and barber test users. Sends OTP, verifies it, and captures onboarding tokens for brand-new users or JWT access/refresh tokens for returning users. Requires msg91.testMode set to true in config/index.js for local development.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    ...baseVariables(
      textVariable('test_customer_mobile', '9876543210'),
      textVariable('test_barber_mobile', '9876543211'),
      textVariable('test_otp', '123456'),
    ),
  ],
  item: [
    {
      name: '1. Send Customer OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/send',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mobile": "{{test_customer_mobile}}"\n}`),
        description: 'Send an OTP to the customer test number configured in the active Postman environment.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '2. Verify Customer OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/verify',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mobile": "{{test_customer_mobile}}",\n  "otp": "{{test_otp}}"\n}`),
        description: 'Verify the customer OTP and capture either onboarding or session JWTs for downstream collections.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data.isNewUser && data.onboardingToken) {",
          "  pm.environment.set('customer_onboarding_token', data.onboardingToken);",
          "  pm.environment.unset('customer_access_token');",
          "  pm.environment.unset('customer_refresh_token');",
          "  pm.test('onboarding token has expiresIn of 86400s', function () { pm.expect(data.onboardingExpiresIn).to.equal(86400); });",
          "} else {",
          "  pm.environment.unset('customer_onboarding_token');",
          "  if (data.accessToken) pm.environment.set('customer_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('customer_refresh_token', data.refreshToken);",
          "  pm.test('tokenType is Bearer', function () { pm.expect(data.tokenType).to.equal('Bearer'); });",
          "  pm.test('expiresIn is a positive number', function () { pm.expect(data.expiresIn).to.be.a('number').and.to.be.above(0); });",
          "  pm.test('refreshExpiresIn is a positive number', function () { pm.expect(data.refreshExpiresIn).to.be.a('number').and.to.be.above(0); });",
          "}",
          "pm.collectionVariables.set('last_session_role', 'CUSTOMER');",
          "pm.collectionVariables.set('last_session_is_new_user', String(Boolean(data.isNewUser)));"
        ),
      }),
    },
    {
      name: '3. Send Barber OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/send',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mobile": "{{test_barber_mobile}}"\n}`),
        description: 'Send an OTP to the barber test number configured in the active Postman environment.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Verify Barber OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/verify',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mobile": "{{test_barber_mobile}}",\n  "otp": "{{test_otp}}"\n}`),
        description: 'Verify the barber OTP and capture either onboarding or session JWTs for downstream collections.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data.isNewUser && data.onboardingToken) {",
          "  pm.environment.set('barber_onboarding_token', data.onboardingToken);",
          "  pm.environment.unset('barber_access_token');",
          "  pm.environment.unset('barber_refresh_token');",
          "  pm.test('onboarding token has expiresIn of 86400s', function () { pm.expect(data.onboardingExpiresIn).to.equal(86400); });",
          "} else {",
          "  pm.environment.unset('barber_onboarding_token');",
          "  if (data.accessToken) pm.environment.set('barber_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('barber_refresh_token', data.refreshToken);",
          "  pm.test('tokenType is Bearer', function () { pm.expect(data.tokenType).to.equal('Bearer'); });",
          "  pm.test('expiresIn is a positive number', function () { pm.expect(data.expiresIn).to.be.a('number').and.to.be.above(0); });",
          "  pm.test('refreshExpiresIn is a positive number', function () { pm.expect(data.refreshExpiresIn).to.be.a('number').and.to.be.above(0); });",
          "}",
          "pm.collectionVariables.set('last_session_role', 'BARBER');",
          "pm.collectionVariables.set('last_session_is_new_user', String(Boolean(data.isNewUser)));"
        ),
      }),
    },
    {
      name: '5. Refresh Customer Token',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/token/refresh',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "refreshToken": "{{customer_refresh_token}}"\n}`),
        description: 'Exchange the stored customer refresh token for a fresh access/refresh token pair.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data.accessToken) pm.environment.set('customer_access_token', data.accessToken);",
          "if (data.refreshToken) pm.environment.set('customer_refresh_token', data.refreshToken);",
          "pm.test('tokenType is Bearer', function () { pm.expect(data.tokenType).to.equal('Bearer'); });",
          "pm.test('expiresIn is a positive number', function () { pm.expect(data.expiresIn).to.be.a('number').and.to.be.above(0); });",
          "pm.test('refreshExpiresIn is a positive number', function () { pm.expect(data.refreshExpiresIn).to.be.a('number').and.to.be.above(0); });"
        ),
      }),
    },
    {
      name: '6. Refresh Barber Token',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/token/refresh',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "refreshToken": "{{barber_refresh_token}}"\n}`),
        description: 'Exchange the stored barber refresh token for a fresh access/refresh token pair.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data.accessToken) pm.environment.set('barber_access_token', data.accessToken);",
          "if (data.refreshToken) pm.environment.set('barber_refresh_token', data.refreshToken);",
          "pm.test('tokenType is Bearer', function () { pm.expect(data.tokenType).to.equal('Bearer'); });",
          "pm.test('expiresIn is a positive number', function () { pm.expect(data.expiresIn).to.be.a('number').and.to.be.above(0); });",
          "pm.test('refreshExpiresIn is a positive number', function () { pm.expect(data.refreshExpiresIn).to.be.a('number').and.to.be.above(0); });"
        ),
      }),
    },
    {
      name: '7. Logout Customer (Terminal)',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/logout',
        auth: bearerAuth('customer_access_token'),
        description: 'Revoke the active customer refresh token and clear the stored customer session values.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.environment.unset('customer_access_token');",
          "pm.environment.unset('customer_refresh_token');"
        ),
      }),
    },
    {
      name: '8. Resend Customer OTP (Text)',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/resend',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mobile": "{{test_customer_mobile}}",\n  "retryType": "text"\n}`),
        description: 'Resend the customer OTP over the text channel for local OTP flow testing.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9. Send Phone Update OTP (Customer)',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/account/phone/send-otp',
        auth: bearerAuth('customer_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "newMobile": "9876543299"\n}`),
        description: 'Send OTP to new phone number for verification. Requires authentication. Use a different number than the current one.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Verify Phone Update OTP (Customer)',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/account/phone/verify-otp',
        auth: bearerAuth('customer_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "newMobile": "9876543299",\n  "otp": "{{test_otp}}"\n}`),
        description: 'Verify OTP and update phone number atomically. Phone number is updated only after successful OTP verification.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes phoneNumber', function () { pm.expect(data).to.have.property('phoneNumber'); });"
        ),
      }),
    },
    {
      name: '11. Update Email (Customer)',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/account/email',
        auth: bearerAuth('customer_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "newEmail": "updated.customer@example.com"\n}`),
        description: 'Update user email. Email is stored with emailVerified: false until verification is implemented.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes email', function () { pm.expect(data).to.have.property('email'); });",
          "pm.test('response includes emailVerified', function () { pm.expect(data).to.have.property('emailVerified'); });",
          "pm.test('emailVerified is false', function () { pm.expect(data.emailVerified).to.equal(false); });"
        ),
      }),
    },
    {
      name: '12. Health Check',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/health',
        auth: { type: 'noauth' },
        description: 'Simple liveness check for the API server.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const onboardingCollection = {
  info: {
    name: 'EverCut - Onboarding',
    description: 'Customer and barber onboarding requests wired for the OTP test users and the local sample upload asset. Run 01-authentication.json first to populate onboarding tokens. Shop schedule fields accept HH:MM or hh:mm AM/PM input and are normalized to 24-hour storage. Upon successful onboarding, access and refresh tokens are captured for the other collections.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [...baseVariables()],
  event: collectionPreRequest(),
  item: [
    {
      name: '1. Complete Customer Profile',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/onboarding/customers',
        auth: bearerAuth('customer_onboarding_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "firstName": "Test",\n  "lastName": "Customer",\n  "email": "test.customer@example.com",\n  "gender": "Male",\n  "dateOfBirth": "1994-06-15",\n  "address": "${customerLocationText}",\n  "location": ${customerLocationGeoJson},\n  "photoMediaId": "{{shared_media_id}}"\n}`),
        description: 'Creates the customer for the OTP-verified customer test user using a confirmed R2 mediaId. Run the media upload flow first if shared_media_id is empty. A rerun returns 409 because onboarding only succeeds once per account.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
          "if (pm.response.code === 201) {",
          "  const data = pm.response.json().data || {};",
          "  if (data.accessToken) pm.environment.set('customer_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('customer_refresh_token', data.refreshToken);",
          "  pm.environment.unset('customer_onboarding_token');",
          "  pm.test('tokenType is Bearer', function () { pm.expect(data.tokenType).to.equal('Bearer'); });",
          "  pm.test('expiresIn is a positive number', function () { pm.expect(data.expiresIn).to.be.a('number').and.to.be.above(0); });",
          "  pm.test('refreshExpiresIn is a positive number', function () { pm.expect(data.refreshExpiresIn).to.be.a('number').and.to.be.above(0); });",
          "}"
        ),
      }),
    },
    {
      name: '2. Complete Barber Profile',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/onboarding/barbers',
        auth: bearerAuth('barber_onboarding_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "firstName": "Test",\n  "lastName": "Barber",\n  "email": "test.barber@example.com",\n  "dateOfBirth": "1991-01-12",\n  "gender": "Male",\n  "shopName": "Postman Test Barber Studio",\n  "category": "Barber",\n  "targetCustomers": "male",\n  "address": "${barberLocationText}",\n  "location": ${barberLocationGeoJson},\n  "amenities": ["Air Conditioning","Waiting Area","Drinking Water","Washrooms","Parking Area","Wi-Fi","Charging Points"],\n  "workingDays": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],\n  "workingHours": {"openTime":"09:00","closeTime":"20:00"},\n  "breakTimes": [{"start":"13:00","end":"14:00"}],\n  "accountHolderName": "Test Barber",\n  "bankName": "HDFC Bank",\n  "upiId": "test.barber@upi",\n  "pin": "1234",\n  "confirmPin": "1234",\n  "photoMediaId": "{{shared_media_id}}"\n}`),
        description: 'Creates the barber shop for the OTP-verified barber test user using a confirmed R2 mediaId. Shop schedule values can be sent in HH:MM or hh:mm AM/PM format and are normalized by the backend.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
          "if (pm.response.code === 201) {",
          "  const data = pm.response.json().data || {};",
          "  const shopId = data.shop && data.shop.id;",
          "  if (shopId) pm.globals.set('shared_shop_id', shopId);",
          "  if (data.accessToken) pm.environment.set('barber_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('barber_refresh_token', data.refreshToken);",
          "  pm.environment.unset('barber_onboarding_token');",
          "  pm.globals.set('shared_barber_pin', '1234');",
          "  pm.test('tokenType is Bearer', function () { pm.expect(data.tokenType).to.equal('Bearer'); });",
          "  pm.test('expiresIn is a positive number', function () { pm.expect(data.expiresIn).to.be.a('number').and.to.be.above(0); });",
          "  pm.test('refreshExpiresIn is a positive number', function () { pm.expect(data.refreshExpiresIn).to.be.a('number').and.to.be.above(0); });",
          "}"
        ),
      }),
    },
  ],
};

const customerCollection = {
  info: {
    name: 'EverCut - Customer',
    description: 'Customer profile management and nearby service discovery. The final request also captures shared shop/service IDs for later collections. NOTE: The /customers/me/home endpoint has been removed - use /customers/me instead and extract the fields you need on the frontend.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest(),
  variable: [
    ...baseVariables(
      textVariable('coordinates', sharedCoordinates),
      textVariable('shop_id', ''),
      textVariable('service_id', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Profile',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customers/me',
        description: 'Returns the current customer data.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '2. Update Profile',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/customers/me',
        description: 'Updates customer data. To replace the profile photo, include a confirmed R2 photoMediaId from the media upload flow. NOTE: Email updates must use PATCH /account/email endpoint.',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "firstName": "Test",\n  "lastName": "Customer",\n  "address": "${customerLocationText}, India",\n  "location": ${customerLocationGeoJson},\n  "photoMediaId": "{{shared_media_id}}"\n}`),
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get Services By Gender And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/services?gender=male&coordinates={{coordinates}}',
        description: 'Uses the shared Bengaluru coordinates so the response includes the barber shop created by onboarding. The script captures the first nearby Postman shop and service IDs.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const data = pm.response.json().data || {};",
          "const shops = Array.isArray(data.shops) ? data.shops : [];",
          "const services = Array.isArray(data.services) ? data.services : [];",
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (preferredShop && preferredShop.id) {",
          "  const shopId = preferredShop.id;",
          "  pm.collectionVariables.set('shop_id', shopId);",
          "  pm.globals.set('shared_shop_id', shopId);",
          "}",
          "if (preferredService && preferredService.id) {",
          "  const serviceId = preferredService.id;",
          "  pm.collectionVariables.set('service_id', serviceId);",
          "  pm.globals.set('shared_service_id', serviceId);",
          "}"
        ),
      }),
    },
  ],
};

const customerBookingsCollection = {
  info: {
    name: 'EverCut - Customer Bookings',
    description: 'Customer booking workflow with shared-variable automation. It reuses the shop, employee, and service IDs captured by the barber-side collections so there is no copy-paste between collections.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_shop_id', 'shop_id'],
      ['shared_employee_id', 'employee_id'],
      ['shared_service_id', 'service_id'],
      ['shared_booking_id', 'booking_id'],
    ],
    includeDateHelpers: true,
  }),
  variable: [
    ...baseVariables(
      textVariable('shop_id', ''),
      textVariable('employee_id', ''),
      textVariable('service_id', ''),
      textVariable('booking_id', ''),
      textVariable('booking_date', ''),
      textVariable('booking_update_date', ''),
      textVariable('booking_reorder_date', ''),
      textVariable('availability_date', ''),
      textVariable('booking_time', ''),
      textVariable('booking_update_time', ''),
      textVariable('booking_reorder_time', ''),
      textVariable('booking_idempotency_key', ''),
      textVariable('reordered_booking_id', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Upcoming Bookings And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?dateFrom={{booking_date}}',
        description: 'Lists bookings from the generated booking date onward and captures the first booking ID and first service ID when they already exist.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const bookings = Array.isArray(response.data) ? response.data : [];",
          "bookings.forEach((booking) => {",
          "  if (booking.employee) {",
          "    pm.expect(booking.employee).to.have.property('isAvailableOnBookingDate');",
          "    pm.expect(booking.employee.isAvailableOnBookingDate).to.be.a('boolean');",
          "  }",
          "});",
          "const firstBooking = bookings[0];",
          "if (firstBooking && firstBooking.id) {",
          "  const bookingId = firstBooking.id;",
          "  pm.collectionVariables.set('booking_id', bookingId);",
          "  pm.globals.set('shared_booking_id', bookingId);",
          "}"
        ),
      }),
    },
    {
      name: '2. Get Employee Availability',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}/availability?date={{availability_date}}&serviceId={{service_id}}',
        description: 'Checks exact-range availability for the captured employee on the generated booking date.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Book Salon',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "serviceIds": ["{{service_id}}"],\n  "employeeId": "{{employee_id}}",\n  "shopId": "{{shop_id}}",\n  "date": "{{booking_date}}",\n  "time": "{{booking_time}}",\n  "idempotencyKey": "{{booking_idempotency_key}}"\n}`),
        description: 'Creates a new future booking using exact time-range locking. The optional idempotency key makes client retries safe without creating duplicate bookings.',
        event: mergedEvents(
          [
            "pm.collectionVariables.set('booking_idempotency_key', `postman-booking-${Date.now()}`);"
          ],
          [
            "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
            "const response = pm.response.json();",
            "const bookingId = response.data && response.data.id;",
            "if (bookingId) { pm.collectionVariables.set('booking_id', bookingId); pm.globals.set('shared_booking_id', bookingId); }",
            "pm.test('booking response includes exact range metadata', function () {",
            "  const data = response.data || {};",
            "  pm.expect(data).to.have.property('time');",
            "  pm.expect(data).to.have.property('endTime');",
            "  pm.expect(data).to.have.property('startMinute');",
            "  pm.expect(data).to.have.property('endMinute');",
            "});"
          ]
        ),
      }),
    },
    {
      name: '4. Get Booking Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}',
        description: 'Reads the full booking detail payload for the captured booking.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const booking = response.data || {};",
          "pm.test('booking detail includes employee availability flag', function () {",
          "  pm.expect(booking.employee).to.have.property('isAvailableOnBookingDate');",
          "  pm.expect(booking.employee.isAvailableOnBookingDate).to.be.a('boolean');",
          "});"
        ),
      }),
    },
    {
      name: '5. Add Booking Favorite',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/favorite',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "favorite": true\n}`),
        description: 'Adds the current booking to the customer favorites list through the booking resource.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Get Favorite Bookings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?favorite=true',
        description: 'Lists the authenticated customer favorite bookings through the booking list flow.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Update Booking Schedule',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "employeeId": "{{employee_id}}",\n  "date": "{{booking_update_date}}",\n  "time": "{{booking_update_time}}"\n}`),
        description: 'Updates the booking schedule using the real validator shape: all three fields are required. Note: 7-day advance booking window applies.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Reorder Booking',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "sourceBookingId": "{{booking_id}}",\n  "date": "{{booking_reorder_date}}",\n  "time": "{{booking_reorder_time}}"\n}`),
        description: 'Creates a fresh booking from the current one through the booking collection create endpoint. 7-day advance booking window applies.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          "const response = pm.response.json();",
          "const bookingId = response.data && response.data.id;",
          "if (bookingId) { pm.collectionVariables.set('reordered_booking_id', bookingId); }"
        ),
      }),
    },
    {
      name: '9. Remove Booking Favorite',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/favorite',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "favorite": false\n}`),
        description: 'Removes the current booking from the customer favorites list.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Cancel Booking',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "status": "cancelled"\n}`),
        description: 'Cancels the currently captured booking and releases its exact locked time range. This stays last because it is destructive.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const customerShopDiscoveryCollection = {
  info: {
    name: 'EverCut - Customer Shop Discovery',
    description: 'Nearby shop discovery, employee list, availability checking, and search requests using the same Bengaluru coordinates as the barber onboarding flow.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_shop_id', 'shop_id'],
      ['shared_service_id', 'service_id'],
      ['shared_employee_id', 'employee_id'],
    ],
    includeDateHelpers: true,
  }),
  variable: [
    ...baseVariables(
      textVariable('coordinates', sharedCoordinates),
      textVariable('shop_id', ''),
      textVariable('service_id', ''),
      textVariable('employee_id', ''),
      textVariable('booking_date', ''),
      textVariable('service_search_query', 'Postman'),
      textVariable('shop_search_query', 'Postman'),
    ),
  ],
  item: [
    {
      name: '1. Get Nearby Shops And Capture Shop ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops?coordinates={{coordinates}}',
        description: 'Finds nearby shops and captures the Postman barber shop ID when it is present.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const shops = Array.isArray(response.data) ? response.data : [];",
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "if (preferredShop && preferredShop.id) {",
          "  const shopId = preferredShop.id;",
          "  pm.collectionVariables.set('shop_id', shopId);",
          "  pm.globals.set('shared_shop_id', shopId);",
          "}"
        ),
      }),
    },
    {
      name: '2. Get Shop Info And Capture Service ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}',
        description: 'Returns the full customer-facing shop payload and captures the first Postman service ID from the embedded service lists.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "const single = data.services && Array.isArray(data.services.single) ? data.services.single : [];",
          "const bundled = data.services && Array.isArray(data.services.bundled) ? data.services.bundled : [];",
          "const services = [...single, ...bundled];",
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (data.shop && data.shop.id) {",
          "  const shopId = data.shop.id;",
          "  pm.collectionVariables.set('shop_id', shopId);",
          "  pm.globals.set('shared_shop_id', shopId);",
          "}",
          "if (preferredService && preferredService.id) {",
          "  const serviceId = preferredService.id;",
          "  pm.collectionVariables.set('service_id', serviceId);",
          "  pm.globals.set('shared_service_id', serviceId);",
          "}"
        ),
      }),
    },
    {
      name: '3. Get Shop Employees And Capture Employee ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/employees',
        description: 'Returns the list of active employees for the shop and captures the first employee ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "const employees = Array.isArray(data.employees) ? data.employees : [];",
          "const firstEmployee = employees[0];",
          "if (firstEmployee && firstEmployee.id) { pm.collectionVariables.set('employee_id', firstEmployee.id); pm.globals.set('shared_employee_id', firstEmployee.id); }"
        ),
      }),
    },
    {
      name: '4. Get Employee Available Slots',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}/availability?date={{booking_date}}&serviceId={{service_id}}',
        description: 'Returns exact-range availability for the employee, including bookable starts, free windows, break blocking, booked ranges, blocked dates, and the 7-day advance booking window.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes slot information', function () {",
          "  pm.expect(data).to.have.property('slots');",
          "  pm.expect(data).to.have.property('availableWindows');",
          "  pm.expect(data).to.have.property('totalAvailable');",
          "  pm.expect(data).to.have.property('totalSlots');",
          "});"
        ),
      }),
    },
    {
      name: '5. Get Shop Availability',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/availability?date={{booking_date}}&serviceId={{service_id}}',
        description: 'Returns exact-range availability across all employees for the shop, including first available slot suggestion and the 7-day advance booking window.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes employee availability', function () {",
          "  pm.expect(data).to.have.property('employees');",
          "  pm.expect(data.employees).to.be.an('array');",
          "});"
        ),
      }),
    },
    {
      name: '6. Add Favorite Shop',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/favorite',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "favorite": true\n}`),
        description: 'Adds the captured shop to the authenticated customer favorite shops list through the shop discovery flow.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Get Favorite Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/favorites',
        description: 'Lists the authenticated customer favorite shops through the shop discovery flow.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Remove Favorite Shop',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/favorite',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "favorite": false\n}`),
        description: 'Removes the captured shop from the authenticated customer favorite shops list.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9. Get Doorstep Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops?category=Door-Step',
        description: 'Lists shops with the Door-Step category.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Search Services',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/services/search?query={{service_search_query}}&gender=male',
        description: 'Searches the customer-visible service catalogue for the services created by the barber service collection.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '11. Search Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops?query={{shop_search_query}}',
        description: 'Searches the customer-visible shop catalogue for the Postman barber shop.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const customerRatingsCollection = {
  info: {
    name: 'EverCut - Customer Ratings',
    description: 'Customer rating flow that captures a shop ID from the authenticated customer\'s completed booking history before submitting a rating.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest(),
  variable: [
    ...baseVariables(
      textVariable('shop_id', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Past Bookings And Capture Completed Shop ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?dateTo={{booking_date}}&status=completed&limit=100',
        description: 'Captures a shop ID from the authenticated customer\'s completed past bookings. This request fails the collection clearly when no eligible booking exists for rating.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const bookings = Array.isArray(response.data) ? response.data : [];",
          "const completedBooking = bookings.find((booking) => booking && booking.status === 'completed' && booking.shop && booking.shop.id);",
          "const shopId = completedBooking && completedBooking.shop && completedBooking.shop.id;",
          "pm.test('completed booking exists for rating eligibility', function () { pm.expect(shopId, 'A completed past booking is required before submitting a rating.').to.be.ok; });",
          "if (shopId) { pm.collectionVariables.set('shop_id', shopId); pm.globals.set('shared_shop_id', shopId); }"
        ),
      }),
    },
    {
      name: '2. Add Rating',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/ratings',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "shopId": "{{shop_id}}",\n  "rating": 5,\n  "review": "Postman collection review for the OTP/JWT customer flow."\n}`),
        description: 'Creates a new rating for the captured shop from the customer\'s completed booking history. The API allows only one rating per customer per shop, so reruns return 409 instead of 201 after the first success.',
        event: testEvent("pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });"),
      }),
    },
    {
      name: '3. Get Shop Ratings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/ratings',
        description: 'Lists all ratings for the captured shop, including barber replies.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Rating Summary',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/ratings/analytics',
        description: 'Returns the rating summary payload for the captured shop.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const barberProfileCollection = {
  info: {
    name: 'EverCut - Barber Profile & Shop',
    description: 'Barber profile and shop management collection. Uses the barber JWT access token captured by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_shop_id', 'shop_id'],
      ['shared_barber_pin', 'barber_active_pin'],
    ],
  }),
  variable: [
    ...baseVariables(
      textVariable('shop_id', ''),
      textVariable('barber_active_pin', '1234'),
      textVariable('barber_next_pin', '5678'),
    ),
  ],
  item: [
    {
      name: '1. Get Profile And Capture Shop ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/me',
        description: 'Reads the barber profile and stores the current shop ID for the dependent collections.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const shopId = response.data && response.data.id;",
          "if (shopId) { pm.collectionVariables.set('shop_id', shopId); pm.globals.set('shared_shop_id', shopId); }"
        ),
      }),
    },
    {
      name: '2. Update Business Info',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/me',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "firstName": "Test",\n  "lastName": "Barber",\n  "dateOfBirth": "1991-01-12",\n  "gender": "Male",\n  "shopName": "Postman Test Barber Studio",\n  "category": "Barber",\n  "targetCustomers": "male",\n  "address": "${barberLocationText}",\n  "location": ${barberLocationGeoJson},\n  "amenities": ["Air Conditioning", "Waiting Area", "Parking Area", "Wi-Fi"],\n  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],\n  "workingHours": {\n    "openTime": "09:00",\n    "closeTime": "20:00"\n  },\n  "breakTimes": [\n    {\n      "start": "13:00",\n      "end": "14:00"\n    }\n  ],\n  "bio": "Updated from the automated Postman profile collection."\n}`),
        description: 'Updates only barber profile and business fields. Payout details are managed through /shops/me/payout-details. NOTE: Email updates must use PATCH /account/email endpoint.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get Payout Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/me/payout-details',
        description: 'Reads the complete payout account details with verification status. Account number is masked for security.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes accountHolderName', function () { pm.expect(data).to.have.property('accountHolderName'); });",
          "pm.test('response includes bankAccountLast4', function () { pm.expect(data).to.have.property('bankAccountLast4'); });",
          "pm.test('response includes ifsc', function () { pm.expect(data).to.have.property('ifsc'); });",
          "pm.test('response includes verificationStatus', function () { pm.expect(data).to.have.property('verificationStatus'); });",
          "pm.test('response includes canReceivePayouts', function () { pm.expect(data).to.have.property('canReceivePayouts'); });"
        ),
      }),
    },
    {
      name: '4. Update Payout Details',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/me/payout-details',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "accountHolderName": "Test Barber",\n  "bankName": "HDFC Bank",\n  "bankAccount": "12345678901234",\n  "ifsc": "HDFC0001234",\n  "upiId": "test.barber@upi"\n}`),
        description: 'Updates complete payout account details including account number and IFSC. Verification status resets to pending on change.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('bankAccountLast4 is present', function () { pm.expect(data.bankAccountLast4).to.match(/^\\d{4}$/); });",
          "pm.test('verificationStatus is pending after update', function () { pm.expect(data.verificationStatus).to.equal('pending'); });"
        ),
      }),
    },
    {
      name: '5. Ensure Shop Is Open',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/me',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "isOpen": true\n}`),
        description: 'Explicitly opens the shop through the shop resource so customer discovery and bookings can run immediately after this collection.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Update Profile Picture',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/me/media/picture',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mediaId": "{{shared_media_id}}"\n}`),
        description: 'Replaces the owner profile picture with a confirmed R2 media object.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Update Cover Image',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/me/media/cover',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mediaId": "{{shared_media_id}}"\n}`),
        description: 'Replaces the shop cover image with a confirmed R2 media object.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Update PIN',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/me/security',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "currentPin": "{{barber_active_pin}}",\n  "newPin": "{{barber_next_pin}}",\n  "confirmNewPin": "{{barber_next_pin}}"\n}`),
        description: 'Flips the barber PIN between 1234 and 5678 so the request stays rerunnable.',
        event: mergedEvents(
          [
            "const currentPin = pm.collectionVariables.get('barber_active_pin') || '1234';",
            "const nextPin = currentPin === '1234' ? '5678' : '1234';",
            "pm.collectionVariables.set('barber_next_pin', nextPin);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "const nextPin = pm.collectionVariables.get('barber_next_pin');",
            "pm.collectionVariables.set('barber_active_pin', nextPin);",
            "pm.globals.set('shared_barber_pin', nextPin);"
          ]
        ),
      }),
    },
    {
      name: '9. Sign-Out Everywhere (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/account/sessions',
        description: 'Revokes the JWT refresh token, invalidating all sessions. Run this only when you are finished testing.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Delete Account (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/account',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "currentPin": "{{barber_active_pin}}"\n}`),
        description: 'Soft-deletes the barber account and revokes the JWT refresh token. Run this instead of the sign-out request when you want the account deleted.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const barberEmployeesCollection = {
  info: {
    name: 'EverCut - Barber Employees',
    description: 'Employee CRUD collection with automatic ID capture and a prewired sample image for the optional employee photo. Employee working hours stay in HH:MM 24-hour format and are compared against normalized shop hours.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [['shared_employee_id', 'employee_id']],
  }),
  variable: [
    ...baseVariables(
      textVariable('employee_id', ''),
      textVariable('employee_phone', ''),
      textVariable('employee_leave_date', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Employees And Capture Existing ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees',
        description: 'Lists current employees and captures the first Postman employee ID when it already exists.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const employees = Array.isArray(response.data) ? response.data : [];",
          "const preferredEmployee = employees.find((employee) => typeof employee.firstName === 'string' && employee.firstName.includes('Postman')) || employees[0];",
          "if (preferredEmployee && preferredEmployee.id) {",
          "  const employeeId = preferredEmployee.id;",
          "  pm.collectionVariables.set('employee_id', employeeId);",
          "  pm.globals.set('shared_employee_id', employeeId);",
          "}"
        ),
      }),
    },
    {
      name: '2. Get Employee Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}',
        description: 'Returns comprehensive employee information including profile, today\'s statistics, all-time statistics, monthly statistics, and upcoming bookings.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes employee profile', function () { pm.expect(data).to.have.property('employee'); });",
          "pm.test('response includes statistics', function () { pm.expect(data).to.have.property('statistics'); });",
          "if (data.statistics) {",
          "  pm.test('statistics includes today', function () { pm.expect(data.statistics).to.have.property('today'); });",
          "  pm.test('statistics includes allTime', function () { pm.expect(data.statistics).to.have.property('allTime'); });",
          "  pm.test('statistics includes thisMonth', function () { pm.expect(data.statistics).to.have.property('thisMonth'); });",
          "  pm.test('statistics includes upcoming', function () { pm.expect(data.statistics).to.have.property('upcoming'); });",
          "}"
        ),
      }),
    },
    {
      name: '3. Add Employee',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/employees',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "firstName": "Postman",\n  "lastName": "Automation",\n  "phoneNumber": "{{employee_phone}}",\n  "gender": "Female",\n  "dateOfBirth": "1995-05-15",\n  "workingHours": {"start":"09:00","end":"18:00"},\n  "photoMediaId": "{{shared_media_id}}"\n}`),
        description: 'Creates a new employee with a generated phone number and an optional confirmed R2 mediaId. Employee working hours remain HH:MM 24-hour values even when the shop was originally created with AM/PM schedule input.',
        event: mergedEvents(
          [
            "const suffix = Date.now().toString().slice(-7);",
            "pm.collectionVariables.set('employee_phone', `+1555${suffix}`);"
          ],
          [
            "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
            "const response = pm.response.json();",
            "const employeeId = response.data && response.data.id;",
            "if (employeeId) { pm.collectionVariables.set('employee_id', employeeId); pm.globals.set('shared_employee_id', employeeId); }"
          ]
        ),
      }),
    },
    {
      name: '4. Update Employee',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "firstName": "Postman",\n  "lastName": "Automation Updated",\n  "workingHours": {"start":"10:00","end":"19:00"},\n  "blockedDates": [],\n  "photoMediaId": "{{shared_media_id}}"\n}`),
        description: 'Updates the captured employee with only fields that the validator supports.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Toggle Employee Status',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "isActive": false\n}`),
        description: 'Marks the employee inactive through the employee resource.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes isActive', function () { pm.expect(data).to.have.property('isActive'); });",
          "pm.test('isActive is boolean', function () { pm.expect(data.isActive).to.be.a('boolean'); });"
        ),
      }),
    },
    {
      name: '6. Mark Employee Unavailable For Date',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}/blocked-dates',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "dates": ["{{employee_leave_date}}"],\n  "available": false\n}`),
        description: 'Marks the captured employee unavailable for a generated future date. Existing bookings remain unchanged and affected customers receive booking.employee_unavailable notifications.',
        event: mergedEvents(
          [
            "const date = new Date();",
            "date.setDate(date.getDate() + 3);",
            "const leaveDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;",
            "pm.collectionVariables.set('employee_leave_date', leaveDate);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "const response = pm.response.json();",
            "const data = response.data || {};",
            "pm.test('leave response includes affected booking counts', function () {",
            "  pm.expect(data).to.have.property('affectedBookings');",
            "  pm.expect(data).to.have.property('customersNotified');",
            "  pm.expect(data).to.have.property('blockedDates');",
            "});",
            "pm.test('blockedDates includes leave date', function () {",
            "  pm.expect(data.blockedDates || []).to.include(pm.collectionVariables.get('employee_leave_date'));",
            "});"
          ]
        ),
      }),
    },
    {
      name: '7. Mark Employee Available Again',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}/availability',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "dates": ["{{employee_leave_date}}"],\n  "available": true\n}`),
        description: 'Removes the generated leave date. The system does not notify customers when an employee becomes available again, avoiding multiple conflicting customer messages.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('availability response includes datesUnblocked', function () { pm.expect(data).to.have.property('datesUnblocked'); });",
          "pm.test('customers were not notified on availability restore', function () { pm.expect(data.customersNotified).to.equal(0); });"
        ),
      }),
    },
    {
      name: '8. Delete Employee (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}',
        description: 'Soft-deletes the captured employee. Run this last because later collections may still need the shared employee ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('employee_id');",
          "pm.globals.unset('shared_employee_id');"
        ),
      }),
    },
  ],
};

const barberServicesCollection = {
  info: {
    name: 'EverCut - Barber Services',
    description: 'Service catalogue collection with request bodies matched to the real Joi validators and automatic shared ID capture.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [['shared_service_id', 'service_id']],
  }),
  variable: [
    ...baseVariables(
      textVariable('service_id', ''),
      textVariable('single_service_name', ''),
      textVariable('bundled_service_name', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Services And Capture Existing ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/services',
        description: 'Lists current services and captures the first Postman service ID when it already exists.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const services = Array.isArray(response.data) ? response.data : [];",
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (preferredService && preferredService.id) {",
          "  const serviceId = preferredService.id;",
          "  pm.collectionVariables.set('service_id', serviceId);",
          "  pm.globals.set('shared_service_id', serviceId);",
          "}"
        ),
      }),
    },
    {
      name: '2. Add Single Service',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/services',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "serviceName": "{{single_service_name}}",\n  "serviceType": "single",\n  "serviceFor": "male",\n  "duration": 30,\n  "actualPrice": 500,\n  "offerPrice": 50\n}`),
        description: 'Creates a single service using only fields that the API validator accepts.',
        event: mergedEvents(
          ["pm.collectionVariables.set('single_service_name', `Postman Express Cut ${Date.now().toString().slice(-6)}`);"],
          [
            "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
            "const response = pm.response.json();",
            "const serviceId = response.data && response.data.id;",
            "if (serviceId) { pm.collectionVariables.set('service_id', serviceId); pm.globals.set('shared_service_id', serviceId); }"
          ]
        ),
      }),
    },
    {
      name: '3. Add Bundled Service',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/services',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "serviceName": "{{bundled_service_name}}",\n  "serviceType": "bundled",\n  "serviceFor": "male",\n  "actualPrice": 900,\n  "offerPrice": 100,\n  "bundledServices": ["Haircut", "Beard Trim", "Head Massage"],\n  "totalDuration": 75\n}`),
        description: 'Creates a bundled service using the fields required by the backend validator.',
        event: mergedEvents(
          ["pm.collectionVariables.set('bundled_service_name', `Postman Grooming Combo ${Date.now().toString().slice(-6)}`);"],
          ["pm.test('status is 201', function () { pm.response.to.have.status(201); });"]
        ),
      }),
    },
    {
      name: '4. Update Service',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/services/{{service_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "serviceFor": "unisex"\n}`),
        description: 'Updates the captured service with a validator-approved field.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Service (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/services/{{service_id}}',
        description: 'Soft-deletes the captured service. Run this last because customer discovery and booking flows depend on the shared service ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('service_id');",
          "pm.globals.unset('shared_service_id');"
        ),
      }),
    },
  ],
};

const barberBookingsCollection = {
  info: {
    name: 'EverCut - Barber Bookings',
    description: 'Barber booking administration collection covering list filters, combined analytics, status updates, and explicit booking cancellation.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_booking_id', 'booking_id_status'],
      ['shared_booking_id', 'booking_id_delete'],
      ['shared_employee_id', 'employee_id'],
    ],
    includeDateHelpers: true,
  }),
  variable: [
    ...baseVariables(
      textVariable('booking_id_status', ''),
      textVariable('booking_id_delete', ''),
      textVariable('employee_id', ''),
      textVariable('booking_date', ''),
    ),
  ],
  item: [
    {
      name: '1. Get All Bookings And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings',
        description: 'Reads the barber booking administration payload and captures one ID for status updates plus one paid booking ID for the cancellation route when available.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const bookings = Array.isArray(response.data) ? response.data : [];",
          "bookings.forEach((booking) => {",
          "  if (booking.employee) {",
          "    pm.expect(booking.employee).to.have.property('isAvailableOnBookingDate');",
          "    pm.expect(booking.employee.isAvailableOnBookingDate).to.be.a('boolean');",
          "  }",
          "});",
          "const statusBooking = bookings.find((booking) => ['pending', 'confirmed'].includes(booking.status)) || bookings[0];",
          "const deleteBooking = bookings.find((booking) => booking.paymentStatus === 'success') || statusBooking;",
          "const statusBookingId = statusBooking && statusBooking.id;",
          "const deleteBookingId = deleteBooking && deleteBooking.id;",
          "if (statusBookingId) { pm.collectionVariables.set('booking_id_status', statusBookingId); pm.globals.set('shared_booking_id', statusBookingId); }",
          "if (deleteBookingId) { pm.collectionVariables.set('booking_id_delete', deleteBookingId); }"
        ),
      }),
    },
    {
      name: '2. Get Booking Analytics',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/analytics',
        description: 'Returns booking summary, monthly milestone progress, today pulse metrics, and both active/upcoming queue buckets.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Pending Confirmations',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?status=awaiting_confirmation&paymentStatus=success',
        description: 'Lists all bookings awaiting barber confirmation. These are paid bookings that need explicit barber approval.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Get Confirmed Bookings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?status=confirmed',
        description: 'Lists confirmed bookings. Paid bookings move through awaiting_confirmation before barber confirmation.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Get Bookings By Employee',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?employeeId={{employee_id}}',
        description: 'Lists all bookings for a specific employee. Useful for tracking employee performance and managing employee schedules.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const bookings = Array.isArray(response.data) ? response.data : [];",
          "pm.test('all bookings belong to the specified employee', function () {",
          "  const employeeId = pm.collectionVariables.get('employee_id');",
          "  bookings.forEach((booking) => {",
          "    pm.expect(booking.employee && booking.employee.id).to.equal(employeeId);",
          "  });",
          "});"
        ),
      }),
    },
    {
      name: '7. Get Bookings By Date Range',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?dateFrom={{booking_date}}&dateTo={{booking_date}}',
        description: 'Lists all bookings within a date range. Use same date for both parameters to get bookings for a single day (e.g., today\'s schedule).',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Get Employee Bookings In Date Range',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?employeeId={{employee_id}}&dateFrom={{booking_date}}&dateTo={{booking_date}}',
        description: 'Lists bookings for a specific employee within a date range. Essential for employee leave management - find affected bookings when employee requests time off.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9. Get Employee Bookings With Status Filter',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?employeeId={{employee_id}}&status=confirmed,awaiting_confirmation',
        description: 'Lists active bookings for an employee (confirmed or awaiting confirmation). Useful for finding bookings that need reassignment when employee is unavailable.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Confirm Booking',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id_status}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "status": "confirmed"\n}`),
        description: 'Barber explicitly confirms a booking, moving it from awaiting_confirmation to confirmed status.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '11. Update Booking Status',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id_status}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "status": "completed"\n}`),
        description: 'Updates the captured booking status. Use `booking_id_status`, not the delete-only booking ID.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '12. Cancel Paid Booking (Terminal)',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id_delete}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "status": "cancelled"\n}`),
        description: 'Cancels a paid booking only when the booking is still awaiting confirmation.',
        event: testEvent(
          "pm.test('status is 200 or 400', function () { pm.expect(pm.response.code).to.be.oneOf([200, 400]); });",
          "if (pm.response.code === 200) { pm.collectionVariables.unset('booking_id_delete'); }"
        ),
      }),
    },
  ],
};

const barberMediaCollection = {
  info: {
    name: 'EverCut - Barber Media',
    description: 'Cloudflare R2 media workflow: presign, direct upload, confirm, attach to gallery, read, stats, and delete. Also includes onboarding media uploads and validation scenarios.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [['shared_media_id', 'media_id']],
  }),
  variable: [
    ...baseVariables(
      textVariable('media_id', ''),
      textVariable('media_upload_url', ''),
      textVariable('media_upload_content_type', 'image/png'),
      textVariable('media_upload_content_length', '406926'),
      textVariable('onboarding_media_id', ''),
      textVariable('onboarding_media_upload_url', ''),
      textVariable('onboarding_media_upload_content_type', 'image/png'),
    ),
  ],
  item: [
    {
      name: '1. Request Upload URL',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/upload-url',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "contentType": "{{media_upload_content_type}}",\n  "sizeBytes": {{media_upload_content_length}},\n  "purpose": "gallery",\n  "entityId": "{{shared_shop_id}}",\n  "originalName": "sample-upload.png"\n}`),
        description: 'Creates a pending Media record and returns a presigned R2 PUT URL plus the exact client headers required by R2. Keep sizeBytes equal to the binary file size used in the direct PUT.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data.mediaId) { pm.collectionVariables.set('media_id', data.mediaId); pm.globals.set('shared_media_id', data.mediaId); }",
          "if (data.uploadUrl) pm.collectionVariables.set('media_upload_url', data.uploadUrl);",
          "const headers = data.requiredHeaders || {};",
          "pm.collectionVariables.set('media_upload_content_type', headers['Content-Type'] || headers['content-type'] || 'image/png');",
          "pm.test('upload URL includes SigV4 date', function () { pm.expect(data.uploadUrl).to.include('X-Amz-Date='); });",
          "pm.test('upload headers do not include Authorization or x-amz-content-sha256', function () { pm.expect(headers).to.not.have.property('Authorization'); pm.expect(headers).to.not.have.property('x-amz-content-sha256'); });"
        ),
      }),
    },
    {
      name: '2. Direct PUT To R2',
      ...request({
        method: 'PUT',
        url: '{{media_upload_url}}',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: '{{media_upload_content_type}}' },
        ],
        body: { mode: 'file', file: { src: 'assets/sample-upload.png' } },
        description: 'Uploads the binary file directly to Cloudflare R2 using the presigned URL. This request is sent to R2, not the EverCut API. Keep Authorization set to No Auth and preserve the full query string in media_upload_url.',
        event: rawTestEvent(
          "pm.test('status is 200 or 201', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
          "pm.test('request does not send Authorization to R2', function () { pm.expect(pm.request.headers.has('Authorization')).to.equal(false); });"
        ),
      }),
    },
    {
      name: '3. Confirm Upload',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/confirm',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mediaId": "{{media_id}}"\n}`),
        description: 'Verifies the uploaded object in R2, checks content metadata, and marks the Media record ready.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Attach To Gallery',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/gallery',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mediaIds": ["{{media_id}}"],\n  "category": "shop_interior",\n  "description": "Uploaded from the R2 media workflow"\n}`),
        description: 'Attaches a confirmed media object to the authenticated barber shop gallery.',
        event: testEvent("pm.test('status is 201', function () { pm.response.to.have.status(201); });"),
      }),
    },
    {
      name: '5. Get Gallery And Capture Existing ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/media/gallery',
        description: 'Lists the current gallery and captures the first media ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const media = Array.isArray(response.data) ? response.data : [];",
          "const firstMedia = media[0];",
          "if (firstMedia && firstMedia.id) { pm.collectionVariables.set('media_id', firstMedia.id); pm.globals.set('shared_media_id', firstMedia.id); }"
        ),
      }),
    },
    {
      name: '6. Get Gallery Stats',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/media/gallery/stats',
        description: 'Returns gallery media counts and storage totals.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Get Media By ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/media/{{media_id}}',
        description: 'Reads the currently captured media record.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Delete Media (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/media/{{media_id}}',
        description: 'Soft-deletes the captured Media record and requests R2 object deletion. Run this last if later requests still need the shared media ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('media_id');",
          "pm.globals.unset('shared_media_id');"
        ),
      }),
    },
    {
      name: '9. Request Onboarding Upload URL',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/onboarding/upload-url',
        auth: bearerAuth('barber_onboarding_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "contentType": "{{media_upload_content_type}}",\n  "sizeBytes": {{media_upload_content_length}},\n  "purpose": "onboarding",\n  "originalName": "sample-upload.png"\n}`),
        description: 'Creates a temporary pending Media record for onboarding sessions. Requires an onboarding token from OTP verification for a new phone number.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data.mediaId) pm.collectionVariables.set('onboarding_media_id', data.mediaId);",
          "if (data.uploadUrl) pm.collectionVariables.set('onboarding_media_upload_url', data.uploadUrl);",
          "const headers = data.requiredHeaders || {};",
          "pm.collectionVariables.set('onboarding_media_upload_content_type', headers['Content-Type'] || headers['content-type'] || 'image/png');",
          "pm.test('upload URL includes SigV4 date', function () { pm.expect(data.uploadUrl).to.include('X-Amz-Date='); });"
        ),
      }),
    },
    {
      name: '10. Direct PUT Onboarding File To R2',
      ...request({
        method: 'PUT',
        url: '{{onboarding_media_upload_url}}',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: '{{onboarding_media_upload_content_type}}' },
        ],
        body: { mode: 'file', file: { src: 'assets/sample-upload.png' } },
        description: 'Uploads the onboarding binary file directly to Cloudflare R2 using the presigned URL. This request does not call the EverCut API.',
        event: rawTestEvent(
          "pm.test('status is 200 or 201', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
          "pm.test('request does not send Authorization to R2', function () { pm.expect(pm.request.headers.has('Authorization')).to.equal(false); });"
        ),
      }),
    },
    {
      name: '11. Confirm Onboarding Upload',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/onboarding/confirm',
        auth: bearerAuth('barber_onboarding_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mediaId": "{{onboarding_media_id}}"\n}`),
        description: 'Confirms an onboarding upload before it is consumed by POST /onboarding/customers or POST /onboarding/barbers as photoMediaId.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '12. Upload URL Requires Authentication',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/upload-url',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "contentType": "image/png",\n  "sizeBytes": 100,\n  "purpose": "gallery"\n}`),
        description: 'Negative test: regular upload URL creation requires a user JWT.',
        event: testEvent("pm.test('status is 401', function () { pm.response.to.have.status(401); });"),
      }),
    },
    {
      name: '13. Unsupported MIME Is Rejected',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/upload-url',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "contentType": "application/pdf",\n  "sizeBytes": 100,\n  "purpose": "gallery"\n}`),
        description: 'Negative test: the upload URL validator accepts only configured image/video MIME types.',
        event: testEvent("pm.test('status is 400', function () { pm.response.to.have.status(400); });"),
      }),
    },
    {
      name: '14. Customer Cannot Attach Barber Gallery',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/media/gallery',
        auth: bearerAuth('customer_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "mediaIds": ["{{media_id}}"],\n  "category": "other",\n  "description": "Negative auth test"\n}`),
        description: 'Negative test: gallery attachment is restricted to BARBER users.',
        event: testEvent("pm.test('status is 403', function () { pm.response.to.have.status(403); });"),
      }),
    },
  ],
};

const barberEarningsCollection = {
  info: {
    name: 'EverCut - Barber Earnings',
    description: 'Barber earnings summary and transaction history. Completed bookings are required for non-zero values.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest(),
  variable: [
    ...baseVariables(
      textVariable('transaction_id', '', 'Transaction ID - automatically set from transaction list response'),
    ),
  ],
  item: [
    {
      name: '1. Get Earnings Summary',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/earnings',
        description: 'Returns `totalEarning`, `lastMonthEarning`, `todayEarning`, and `monthlyRevenue` with percentage change.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '2. Get Transaction History',
      ...request({
        method: 'GET',
        url: {
          raw: '{{base_url}}/{{api_prefix}}/earnings/transactions?page=1&limit=20',
          host: ['{{base_url}}'],
          path: ['{{api_prefix}}', 'earnings', 'transactions'],
          query: [
            { key: 'page', value: '1', description: 'Page number (default: 1)' },
            { key: 'limit', value: '20', description: 'Items per page (default: 10)' },
            { key: 'status', value: 'completed', description: 'Filter by payment status', disabled: true },
            { key: 'startDate', value: '2026-01-01', description: 'Filter from date (ISO format)', disabled: true },
            { key: 'endDate', value: '2026-12-31', description: 'Filter to date (ISO format)', disabled: true },
          ],
        },
        description: 'Returns paginated transaction history with monthly revenue summary. Includes customer details, amounts, and timestamps.',
        event: mergedEvents(
          [],
          [
            "pm.test('response uses paginated envelope', function () {",
            "  const response = pm.response.json();",
            "  pm.expect(response).to.have.property('success', true);",
            "  pm.expect(response.data).to.be.an('array');",
            "  pm.expect(response).to.have.nested.property('meta.pagination');",
            "  pm.expect(response).to.have.nested.property('meta.monthlyRevenue');",
            "});",
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('transactions have required fields', function () {",
            "  const response = pm.response.json();",
            "  if (response.data.length > 0) {",
            "    const transaction = response.data[0];",
            "    pm.expect(transaction).to.have.property('transactionId');",
            "    pm.expect(transaction).to.have.property('customer');",
            "    pm.expect(transaction).to.have.property('amount');",
            "    pm.expect(transaction).to.have.property('status');",
            "    pm.expect(transaction).to.have.property('timestamp');",
            "    ",
            "    // Save first transaction ID for detail endpoint",
            "    pm.collectionVariables.set('transaction_id', transaction.id);",
            "  }",
            "});",
          ]
        ),
      }),
    },
    {
      name: '3. Get Transaction Detail',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/earnings/transactions/{{transaction_id}}',
        description: 'Returns detailed information about a specific transaction including customer, barber, services, and payment details.\n\nNOTE: Run \'2. Get Transaction History\' first to automatically populate the transaction_id variable, or manually set a valid MongoDB ObjectId in the transaction_id collection variable.',
        event: mergedEvents(
          [],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('transaction detail has required fields', function () {",
            "  const response = pm.response.json();",
            "  const transaction = response.data;",
            "  pm.expect(transaction).to.have.property('transactionId');",
            "  pm.expect(transaction).to.have.property('customer');",
            "  pm.expect(transaction.customer).to.have.property('name');",
            "  pm.expect(transaction).to.have.property('barber');",
            "  pm.expect(transaction.barber).to.have.property('name');",
            "  pm.expect(transaction).to.have.property('services');",
            "  pm.expect(transaction).to.have.property('grandTotal');",
            "  pm.expect(transaction).to.have.property('paymentStatus');",
            "});",
          ]
        ),
      }),
    },
    {
      name: '4. Download Transaction Statement (PDF)',
      ...request({
        method: 'GET',
        url: {
          raw: '{{base_url}}/{{api_prefix}}/earnings/transactions/statement?startDate=2026-01-01&endDate=2026-12-31',
          host: ['{{base_url}}'],
          path: ['{{api_prefix}}', 'earnings', 'transactions', 'statement'],
          query: [
            { key: 'startDate', value: '2026-01-01', description: 'Start date (ISO format, required)' },
            { key: 'endDate', value: '2026-12-31', description: 'End date (ISO format, required)' },
          ],
        },
        description: 'Downloads a professionally formatted PDF statement of all transactions within the specified date range. The PDF includes shop information, summary statistics, and a detailed transaction table.',
        event: mergedEvents(
          [],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('response is PDF', function () {",
            "  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf');",
            "});",
          ]
        ),
      }),
    },
  ],
};

const barberRatingsCollection = {
  info: {
    name: 'EverCut - Barber Ratings',
    description: 'Focused Postman collection for barber rating routes using seeded mock data and the JWT-authenticated barber user. This remains the reference standard for seeded-ID capture.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest(),
  variable: [
    ...baseVariables(
      textVariable('rating_id_add_reply', ''),
      textVariable('rating_id_update_reply', ''),
      textVariable('rating_id_remove_rating', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Ratings And Capture Seeded IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/ratings',
        description: 'Run this first. It captures the three seeded rating IDs created by `node scripts/seed-barber-rating-mock-data.js`.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const ratings = Array.isArray(response.data) ? response.data : [];",
          "const capture = (variableName, marker) => {",
          "  const match = ratings.find((item) => typeof item.review === 'string' && item.review.includes(marker));",
          "  const ratingId = match && match.id;",
          "  if (ratingId) { pm.collectionVariables.set(variableName, ratingId); }",
          "};",
          "capture('rating_id_add_reply', '[ADD_REPLY_TARGET]');",
          "capture('rating_id_update_reply', '[UPDATE_REPLY_TARGET]');",
          "capture('rating_id_remove_rating', '[REMOVE_RATING_TARGET]');",
          "if (!pm.collectionVariables.get('rating_id_add_reply') || !pm.collectionVariables.get('rating_id_update_reply') || !pm.collectionVariables.get('rating_id_remove_rating')) {",
          "  console.warn('Seeded rating markers were not found. Run `node scripts/seed-barber-rating-mock-data.js` before using this collection.');",
          "}"
        ),
      }),
    },
    {
      name: '2. Get Rating Summary',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/ratings/analytics',
        description: 'Returns aggregate rating metrics for the authenticated barber shop.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Add Reply',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/ratings/{{rating_id_add_reply}}/reply',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "replyText": "Thanks for the feedback. We appreciate your visit."\n}`),
        description: 'Adds a reply to the seeded rating that has no reply yet. Reruns return 409 once the reply already exists.',
        event: testEvent("pm.test('status is 200 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([200, 409]); });"),
      }),
    },
    {
      name: '4. Update Reply',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/ratings/{{rating_id_update_reply}}/reply',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "replyText": "Updated reply from Postman for the seeded barber rating flow."\n}`),
        description: 'Updates the seeded reply on the dedicated rating fixture.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Reply',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/ratings/{{rating_id_update_reply}}/reply',
        description: 'Deletes the reply from the same seeded rating used by the update step.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Remove Rating',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/ratings/{{rating_id_remove_rating}}',
        description: 'Deletes the seeded rating dedicated to the remove-rating route.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const paymentsPayoutsCollection = {
  info: {
    name: 'EverCut - Payments & Payouts',
    description: 'Native PhonePe SDK payment initiation/verification, refund processing, and payout retry for the EverCut dual-provider payment system. PhonePe is used for customer collection; Cashfree Payouts is used for barber disbursement.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_booking_id', 'payment_booking_id'],
      ['payment_id', 'payment_id'],
      ['merchant_order_id', 'merchant_order_id'],
      ['merchant_refund_id', 'merchant_refund_id'],
      ['refund_id', 'refund_id'],
      ['payout_id', 'payout_id'],
      ['admin_access_token', 'admin_access_token'],
    ],
    extra: [
      "// Ensure payment_booking_id is synced ONLY if it hasn't been set manually.",
      "const currentPaymentBookingId = pm.collectionVariables.get('payment_booking_id');",
      "if (!currentPaymentBookingId) {",
      "  const bookingId = pm.globals.get('shared_booking_id') || pm.globals.get('booking_id');",
      "  if (bookingId) {",
      "    pm.collectionVariables.set('payment_booking_id', bookingId);",
      "  }",
      "}"
    ],
  }),
  variable: [
    ...baseVariables(
      textVariable('admin_access_token', '', 'Required for payout retry. Use a JWT for a user whose role is ADMIN.'),
      textVariable('payment_booking_id', '', 'Booking ID for payment - auto-synced from shared_booking_id or booking_id'),
      textVariable('payment_id', '', 'Auto-captured from payment initiation'),
      textVariable('merchant_order_id', '', 'Auto-captured from payment initiation'),
      textVariable('merchant_refund_id', '', 'Auto-captured from refund initiation'),
      textVariable('refund_id', '', 'Auto-captured from refund initiation'),
      textVariable('payout_id', '', 'Payout ID for retry operations'),
    ),
  ],
  item: [
    {
      name: '1. Create Native SDK Payment Order',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payments',
        auth: bearerAuth('customer_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "bookingId": "{{payment_booking_id}}"\n}`),
        description: 'Creates a PhonePe native SDK checkout order for the authenticated customer\'s pending booking. The response returns id, orderId, token, merchantId, and merchantOrderId for the Flutter PhonePe SDK. No redirect URL is returned.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('captures native payment references', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.success).to.equal(true);",
          "  pm.expect(response.data).to.have.property('id');",
          "  pm.expect(response.data).to.have.property('merchantOrderId');",
          "  pm.expect(response.data).to.have.property('orderId');",
          "  pm.expect(response.data).to.have.property('token');",
          "  pm.expect(response.data).to.have.property('merchantId');",
          "  pm.expect(response.data).to.not.have.property('redirectUrl');",
          "  pm.collectionVariables.set('payment_id', response.data.id);",
          "  pm.collectionVariables.set('merchant_order_id', response.data.merchantOrderId);",
          "  pm.globals.set('payment_id', response.data.id);",
          "  pm.globals.set('merchant_order_id', response.data.merchantOrderId);",
          "});"
        ),
      }),
    },
    {
      name: '2. Get Payment',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/payments/{{payment_id}}',
        auth: bearerAuth('customer_access_token'),
        description: 'Reads payment details and polls PhonePe once when the payment is still pending. Use this for manual status checks or post-failure support.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get All Payments',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/payments',
        auth: bearerAuth('customer_access_token'),
        description: 'Lists payment transactions visible to the authenticated actor. Customers see their own payments, barbers see their shop payments, admins see all payments.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Verify Native SDK Payment',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payments/{{payment_id}}/verify',
        auth: bearerAuth('customer_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "sdkStatus": "SUCCESS",\n  "sdkResponseCode": "SDK_CALLBACK",\n  "sdkMessage": "Flutter SDK callback received"\n}`),
        description: 'Verifies the PhonePe SDK callback with the backend. The SDK callback is informational only; this endpoint calls PhonePe Order Status and returns the authoritative state.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('verified response has authoritative status fields', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.success).to.equal(true);",
          "  pm.expect(response.data).to.have.property('status');",
          "  pm.expect(response.data).to.have.property('gatewayState');",
          "  pm.expect(response.data).to.have.property('paymentStatus');",
          "});"
        ),
      }),
    },
    {
      name: '5. Initiate Refund',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{payment_booking_id}}/refunds',
        auth: bearerAuth('barber_access_token'),
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "reason": "Customer cancelled before payout batch"\n}`),
        description: 'Initiates a refund for a completed payment when payout has not started. Allowed roles: BARBER or ADMIN.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('captures refund references', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.success).to.equal(true);",
          "  if (response.data?.merchantRefundId) {",
          "    pm.collectionVariables.set('merchant_refund_id', response.data.merchantRefundId);",
          "    pm.globals.set('merchant_refund_id', response.data.merchantRefundId);",
          "  }",
          "  if (response.data?.refundId) {",
          "    pm.collectionVariables.set('refund_id', response.data.refundId);",
          "    pm.globals.set('refund_id', response.data.refundId);",
          "  }",
          "});"
        ),
      }),
    },
    {
      name: '6. Retry Failed Payout',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payouts/{{payout_id}}/retry',
        auth: bearerAuth('admin_access_token'),
        description: 'Retries a failed or reversed payout. Requires an ADMIN token and a payout ID from MongoDB.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('captures retry payout references when present', function () {",
          "  const response = pm.response.json();",
          "  const payoutId = response.data && response.data.id;",
          "  if (payoutId) {",
          "    pm.collectionVariables.set('payout_id', payoutId);",
          "    pm.globals.set('payout_id', payoutId);",
          "  }",
          "});"
        ),
      }),
    },

  ],
};

const analyticsCollection = {
  info: {
    name: 'EverCut - Operational Analytics',
    description: 'Operational analytics collection for barber shop owners. Provides booking analytics, employee availability analytics, and earnings through resource-owned endpoints.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest(),
  variable: [...baseVariables()],
  item: [
    {
      name: '1. Get Booking Analytics',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/analytics',
        description: 'Returns booking summary, monthly milestone progress, today pulse metrics, and both active/upcoming queue buckets.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes summary', function () { pm.expect(data).to.have.property('summary'); });",
          "pm.test('response includes milestones', function () { pm.expect(data).to.have.property('milestones'); });",
          "pm.test('response includes today', function () { pm.expect(data).to.have.property('today'); });",
          "pm.test('response includes queue', function () { pm.expect(data).to.have.property('queue'); });"
        ),
      }),
    },
    {
      name: '2. Get Employee Analytics',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees/analytics',
        description: 'Returns staff availability and progress tracking for today. Shows each employee\'s completed vs total appointments with progress percentage.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes staff array', function () { pm.expect(data).to.have.property('staff'); });",
          "pm.test('response includes totalStaff', function () { pm.expect(data).to.have.property('totalStaff'); });",
          "if (Array.isArray(data.staff) && data.staff.length > 0) {",
          "  const firstStaff = data.staff[0];",
          "  pm.test('staff item has required fields', function () {",
          "    pm.expect(firstStaff).to.have.property('id');",
          "    pm.expect(firstStaff).to.have.property('name');",
          "    pm.expect(firstStaff).to.have.property('progress');",
          "  });",
          "}"
        ),
      }),
    },
    {
      name: '3. Get Earnings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/earnings',
        description: 'Returns financial earnings totals and monthly revenue for the authenticated barber shop.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes monthlyRevenue', function () { pm.expect(data).to.have.property('monthlyRevenue'); });"
        ),
      }),
    },
  ],
};

const notificationsCollection = {
  info: {
    name: 'EverCut - Notifications',
    description: 'Hybrid FCM + REST notification APIs for device token registration, notification history, unread counts, and read tracking. Use this with either a customer or barber access token.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_notification_id', 'notification_id'],
    ],
  }),
  variable: [
    ...baseVariables(
      textVariable('notification_id', '', 'Notification ID captured from the list endpoint.'),
    ),
  ],
  item: [
    {
      name: '1. Register FCM Token',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/notifications/tokens',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "token": "{{fcm_token}}",\n  "platform": "android",\n  "deviceId": "postman-device-1",\n  "appVersion": "1.0.0",\n  "locale": "en-IN"\n}`),
        description: 'Registers or refreshes an FCM token for the authenticated user. Multiple devices are supported by registering different tokens. Reusing a token reassigns ownership to the current authenticated user.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('token document returned', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.success).to.equal(true);",
          "  pm.expect(response.data).to.have.property('id');",
          "  pm.expect(response.data).to.have.property('platform');",
          "  pm.expect(response.data).to.not.have.property('token');",
          "});"
        ),
      }),
    },
    {
      name: '2. List Notifications And Capture ID',
      ...request({
        method: 'GET',
        url: {
          raw: '{{base_url}}/{{api_prefix}}/notifications?page=1&limit=20',
          host: ['{{base_url}}'],
          path: ['{{api_prefix}}', 'notifications'],
          query: [
            { key: 'page', value: '1', description: 'Page number' },
            { key: 'limit', value: '20', description: 'Page size' },
            { key: 'read', value: 'false', description: 'Optional read filter', disabled: true },
            { key: 'type', value: 'hybrid', description: 'Optional notification type filter', disabled: true },
            { key: 'eventType', value: 'booking.confirmed', description: 'Optional event filter', disabled: true },
          ],
        },
        description: 'Returns notification history from MongoDB. FCM is only the real-time trigger; clients should use this REST endpoint as source of truth.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "pm.test('response uses paginated envelope', function () {",
          "  pm.expect(response.data).to.be.an('array');",
          "  pm.expect(response).to.have.nested.property('meta.pagination');",
          "});",
          "const notifications = Array.isArray(response.data) ? response.data : [];",
          "const first = notifications[0];",
          "if (first && first.id) {",
          "  const notificationId = first.id;",
          "  pm.collectionVariables.set('notification_id', notificationId);",
          "  pm.globals.set('shared_notification_id', notificationId);",
          "}"
        ),
      }),
    },
    {
      name: '3. Get Notification Summary',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/notifications/summary',
        description: 'Returns the unread notification count for the authenticated user.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('unreadCount is present', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.data).to.have.property('unreadCount');",
          "});"
        ),
      }),
    },
    {
      name: '4. Mark Notification Read',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/notifications/{{notification_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "read": true\n}`),
        description: 'Marks one notification as read. Run the list request first to capture notification_id, or set it manually.',
        event: testEvent("pm.test('status is 200 or 404', function () { pm.expect(pm.response.code).to.be.oneOf([200, 404]); });"),
      }),
    },
    {
      name: '5. Mark All Notifications Read',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/notifications',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "read": true\n}`),
        description: 'Marks all unread notifications for the authenticated user as read.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Unregister FCM Token',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/notifications/tokens',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "token": "{{fcm_token}}"\n}`),
        description: 'Revokes the current user device token. The token must belong to the authenticated user; otherwise the operation is a no-op.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('revoked flag is present', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.data).to.have.property('revoked');",
          "});"
        ),
      }),
    },
  ],
};

const environmentTemplate = {
  id: 'evercut-local-environment',
  name: 'EverCut Local',
  values: [
    { key: 'base_url', value: 'http://localhost:5000', enabled: true },
    { key: 'api_prefix', value: 'api/v1', enabled: true },
    { key: 'test_customer_mobile', value: '9876543210', enabled: true },
    { key: 'test_barber_mobile', value: '9876543211', enabled: true },
    { key: 'test_otp', value: '123456', enabled: true },
    { key: 'customer_access_token', value: '', enabled: true },
    { key: 'customer_refresh_token', value: '', enabled: true },
    { key: 'customer_onboarding_token', value: '', enabled: true },
    { key: 'barber_access_token', value: '', enabled: true },
    { key: 'barber_refresh_token', value: '', enabled: true },
    { key: 'barber_onboarding_token', value: '', enabled: true },
    { key: 'admin_access_token', value: '', enabled: true },
    { key: 'fcm_token', value: 'postman-fcm-token-{{$timestamp}}', enabled: true },
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'regenerate-postman-collections.mjs',
};

writeCollection('01-authentication.json', authenticationCollection);
writeCollection('02-onboarding.json', onboardingCollection);
writeCollection('03-customer-profile.json', customerCollection);
writeCollection('04-customer-bookings.json', customerBookingsCollection);
writeCollection('05-customer-shop-discovery.json', customerShopDiscoveryCollection);
writeCollection('06-customer-ratings.json', customerRatingsCollection);
writeCollection('07-barber-profile-shop.json', barberProfileCollection);
writeCollection('08-barber-employees.json', barberEmployeesCollection);
writeCollection('09-barber-services.json', barberServicesCollection);
writeCollection('10-barber-bookings.json', barberBookingsCollection);
writeCollection('11-barber-media.json', barberMediaCollection);
writeCollection('12-barber-earnings.json', barberEarningsCollection);
writeCollection('13-barber-ratings.json', barberRatingsCollection);
writeCollection('14-operational-analytics.json', analyticsCollection);
writeCollection('15-payments-payouts.json', paymentsPayoutsCollection);
writeCollection('16-notifications.json', notificationsCollection);
writeFileSync(resolve(COLLECTIONS_DIR, 'EverCut.postman_environment.json'), `${JSON.stringify(environmentTemplate, null, 2)}\n`);
