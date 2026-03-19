/**
 * regenerate-postman-collections.mjs
 *
 * Programmatically rebuilds every Postman collection in postman-collections/.
 *
 * What this script does:
 *   1. Defines all request items, pre-request scripts, and test scripts in code
 *   2. Writes one JSON file per collection (01-authentication.json … 13-barber-ratings.json)
 *   3. Writes the local Postman environment template used by the collections
 *
 * When to run it:
 *   Run after changing route URLs, request bodies, validator shapes, or Postman test scripts.
 *   The resulting files can be re-imported into Postman immediately.
 *
 * Usage:
 *   node scripts/regenerate-postman-collections.mjs
 *
 * Output:
 *   postman-collections/01-authentication.json
 *   postman-collections/02-onboarding.json
 *   … (one file per collection)
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COLLECTIONS_DIR = resolve(__dirname, '..', 'postman-collections');
const SAMPLE_UPLOAD_PATH = resolve(COLLECTIONS_DIR, 'assets', 'sample-upload.png');

mkdirSync(COLLECTIONS_DIR, { recursive: true });

const bearerAuth = (tokenVariable) => ({
  type: 'bearer',
  bearer: [
    {
      key: 'token',
      value: `{{${tokenVariable}}}`,
      type: 'string',
    },
  ],
});

const textVariable = (key, value = '', description) => {
  const variable = { key, value, type: 'string' };
  if (description) variable.description = description;
  return variable;
};

const request = ({
  method,
  url,
  description,
  headers = [],
  body,
  auth,
  event,
}) => {
  const requestObject = {
    method,
    header: headers,
    url,
    description,
  };

  if (body) requestObject.body = body;
  if (auth) requestObject.auth = auth;

  const item = { request: requestObject };
  if (event) item.event = event;
  return item;
};

const jsonBody = (raw) => ({
  mode: 'raw',
  raw,
  options: {
    raw: {
      language: 'json',
    },
  },
});

const formDataBody = (formdata) => ({
  mode: 'formdata',
  formdata,
});

const fileField = (key, description) => ({
  key,
  type: 'file',
  src: SAMPLE_UPLOAD_PATH,
  description,
});

const textField = (key, value, description) => {
  const field = { key, value, type: 'text' };
  if (description) field.description = description;
  return field;
};

const standardEnvelopeAssertions = [
  "pm.test('response uses the standard envelope', function () {",
  '  const response = pm.response.json();',
  "  pm.expect(response).to.be.an('object');",
  "  pm.expect(response).to.have.property('success');",
  "  pm.expect(response.success).to.be.a('boolean');",
  "  pm.expect(response).to.have.property('message');",
  "  pm.expect(response.message).to.be.a('string');",
  "  pm.expect(response).to.have.property('data');",
  '});',
];

const testEvent = (...exec) => [
  {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: [...standardEnvelopeAssertions, ...exec],
    },
  },
];

const preRequestEvent = (...exec) => [
  {
    listen: 'prerequest',
    script: {
      type: 'text/javascript',
      exec,
    },
  },
];

const collectionPreRequest = ({
  syncPairs = [],
  includeDateHelpers = false,
  extra = [],
  includeAccessTokens = true,
  includeOnboardingTokens = false,
} = {}) => {
  const exec = [
    "const readScopedValue = (...keys) => {",
    "  for (const key of keys) {",
    "    const environmentValue = pm.environment.get(key);",
    "    if (environmentValue) return environmentValue;",
    "    const globalValue = pm.globals.get(key);",
    "    if (globalValue) return globalValue;",
    "  }",
    "  return '';",
    "};",
    "const syncScopedValue = (sourceKey, collectionKey = sourceKey) => {",
    "  const scopedValue = readScopedValue(sourceKey);",
    "  if (scopedValue) {",
    "    pm.collectionVariables.set(collectionKey, scopedValue);",
    "  }",
    "};",
    "syncScopedValue('base_url');",
    "syncScopedValue('api_prefix');",
    ...syncPairs.map(([sourceKey, collectionKey]) => `syncScopedValue('${sourceKey}', '${collectionKey}');`),
  ];

  if (includeAccessTokens) {
    exec.push(
      "const customerToken = readScopedValue('customer_access_token');",
      "if (customerToken) { pm.collectionVariables.set('customer_access_token', customerToken); }",
      "const barberToken = readScopedValue('barber_access_token');",
      "if (barberToken) { pm.collectionVariables.set('barber_access_token', barberToken); }",
    );
  }

  if (includeOnboardingTokens) {
    exec.push(
      "const customerOnboardingToken = readScopedValue('customer_onboarding_token');",
      "if (customerOnboardingToken) { pm.collectionVariables.set('customer_onboarding_token', customerOnboardingToken); }",
      "const barberOnboardingToken = readScopedValue('barber_onboarding_token');",
      "if (barberOnboardingToken) { pm.collectionVariables.set('barber_onboarding_token', barberOnboardingToken); }",
    );
  }

  if (includeDateHelpers) {
    exec.push(
      "const nextWorkingDay = (daysAhead) => {",
      "  const date = new Date();",
      "  date.setHours(0, 0, 0, 0);",
      "  date.setDate(date.getDate() + daysAhead);",
      "  while (date.getDay() === 0) {",
      "    date.setDate(date.getDate() + 1);",
      "  }",
      "  return date;",
      "};",
      "const toIsoDate = (date) => date.toISOString().slice(0, 10);",
      "pm.collectionVariables.set('booking_date', toIsoDate(nextWorkingDay(2)));",
      "pm.collectionVariables.set('booking_update_date', toIsoDate(nextWorkingDay(3)));",
      "pm.collectionVariables.set('booking_reschedule_date', toIsoDate(nextWorkingDay(4)));",
      "pm.collectionVariables.set('booking_reorder_date', toIsoDate(nextWorkingDay(5)));",
      "pm.collectionVariables.set('calendar_date', toIsoDate(nextWorkingDay(2)));",
      "pm.collectionVariables.set('booking_time', '11:00 AM');",
      "pm.collectionVariables.set('booking_update_time', '12:00 PM');",
      "pm.collectionVariables.set('booking_reschedule_time', '01:00 PM');",
      "pm.collectionVariables.set('booking_reorder_time', '02:00 PM');",
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

const accessTokenVariables = () => ([
  textVariable(
    'customer_access_token',
    '',
    'JWT access token - auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup',
  ),
  textVariable(
    'barber_access_token',
    '',
    'JWT access token - auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup',
  ),
]);

const onboardingTokenVariables = () => ([
  textVariable(
    'customer_onboarding_token',
    '',
    'Short-lived onboarding JWT - auto-set by 01-authentication.json when a new customer is detected',
  ),
  textVariable(
    'barber_onboarding_token',
    '',
    'Short-lived onboarding JWT - auto-set by 01-authentication.json when a new barber is detected',
  ),
]);

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
      textVariable('customer_access_token', ''),
      textVariable('customer_refresh_token', ''),
      textVariable('customer_onboarding_token', ''),
      textVariable('barber_access_token', ''),
      textVariable('barber_refresh_token', ''),
      textVariable('barber_onboarding_token', ''),
    ),
  ],
  event: preRequestEvent(
    "const readScopedValue = (...keys) => {",
    "  for (const key of keys) {",
    "    const environmentValue = pm.environment.get(key);",
    "    if (environmentValue) return environmentValue;",
    "    const globalValue = pm.globals.get(key);",
    "    if (globalValue) return globalValue;",
    "  }",
    "  return '';",
    "};",
    "const baseUrl = readScopedValue('base_url');",
    "if (baseUrl) { pm.collectionVariables.set('base_url', baseUrl); }",
    "const apiPrefix = readScopedValue('api_prefix');",
    "if (apiPrefix) { pm.collectionVariables.set('api_prefix', apiPrefix); }",
    "const customerMobile = readScopedValue('test_customer_mobile');",
    "if (customerMobile) { pm.collectionVariables.set('test_customer_mobile', customerMobile); }",
    "const barberMobile = readScopedValue('test_barber_mobile');",
    "if (barberMobile) { pm.collectionVariables.set('test_barber_mobile', barberMobile); }",
    "const testOtp = readScopedValue('test_otp');",
    "if (testOtp) { pm.collectionVariables.set('test_otp', testOtp); }",
  ),
  item: [
    {
      name: '1. Send Customer OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/send',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "mobile": "{{test_customer_mobile}}"
}`),
        description: 'Send an OTP to the customer test number configured in the active Postman environment.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        ),
      }),
    },
    {
      name: '2. Verify Customer OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/verify',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "mobile": "{{test_customer_mobile}}",
  "otp": "{{test_otp}}"
}`),
        description: 'Verify the customer OTP and capture either onboarding or session JWTs for downstream collections.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          "if (data.isNewUser && data.onboardingToken) {",
          "  pm.collectionVariables.set('customer_onboarding_token', data.onboardingToken);",
          "  pm.environment.set('customer_onboarding_token', data.onboardingToken);",
          "  pm.collectionVariables.set('customer_access_token', '');",
          "  pm.collectionVariables.set('customer_refresh_token', '');",
          "  pm.environment.set('customer_access_token', '');",
          "  pm.environment.set('customer_refresh_token', '');",
          "} else {",
          "  pm.collectionVariables.set('customer_onboarding_token', '');",
          "  pm.environment.set('customer_onboarding_token', '');",
          "  if (data.accessToken) {",
          "    pm.collectionVariables.set('customer_access_token', data.accessToken);",
          "    pm.environment.set('customer_access_token', data.accessToken);",
          "  }",
          "  if (data.refreshToken) {",
          "    pm.collectionVariables.set('customer_refresh_token', data.refreshToken);",
          "    pm.environment.set('customer_refresh_token', data.refreshToken);",
          "  }",
          "}",
          "pm.collectionVariables.set('last_session_role', 'CUSTOMER');",
          "pm.collectionVariables.set('last_session_is_new_user', String(Boolean(data.isNewUser)));",
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
        body: jsonBody(`{
  "mobile": "{{test_barber_mobile}}"
}`),
        description: 'Send an OTP to the barber test number configured in the active Postman environment.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        ),
      }),
    },
    {
      name: '4. Verify Barber OTP',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/auth/otp/verify',
        auth: { type: 'noauth' },
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "mobile": "{{test_barber_mobile}}",
  "otp": "{{test_otp}}"
}`),
        description: 'Verify the barber OTP and capture either onboarding or session JWTs for downstream collections.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          "if (data.isNewUser && data.onboardingToken) {",
          "  pm.collectionVariables.set('barber_onboarding_token', data.onboardingToken);",
          "  pm.environment.set('barber_onboarding_token', data.onboardingToken);",
          "  pm.collectionVariables.set('barber_access_token', '');",
          "  pm.collectionVariables.set('barber_refresh_token', '');",
          "  pm.environment.set('barber_access_token', '');",
          "  pm.environment.set('barber_refresh_token', '');",
          "} else {",
          "  pm.collectionVariables.set('barber_onboarding_token', '');",
          "  pm.environment.set('barber_onboarding_token', '');",
          "  if (data.accessToken) {",
          "    pm.collectionVariables.set('barber_access_token', data.accessToken);",
          "    pm.environment.set('barber_access_token', data.accessToken);",
          "  }",
          "  if (data.refreshToken) {",
          "    pm.collectionVariables.set('barber_refresh_token', data.refreshToken);",
          "    pm.environment.set('barber_refresh_token', data.refreshToken);",
          "  }",
          "}",
          "pm.collectionVariables.set('last_session_role', 'BARBER');",
          "pm.collectionVariables.set('last_session_is_new_user', String(Boolean(data.isNewUser)));",
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
        body: jsonBody(`{
  "refreshToken": "{{customer_refresh_token}}"
}`),
        description: 'Exchange the stored customer refresh token for a fresh access/refresh token pair.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          "if (data.accessToken) {",
          "  pm.collectionVariables.set('customer_access_token', data.accessToken);",
          "  pm.environment.set('customer_access_token', data.accessToken);",
          "}",
          "if (data.refreshToken) {",
          "  pm.collectionVariables.set('customer_refresh_token', data.refreshToken);",
          "  pm.environment.set('customer_refresh_token', data.refreshToken);",
          "}",
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
        body: jsonBody(`{
  "refreshToken": "{{barber_refresh_token}}"
}`),
        description: 'Exchange the stored barber refresh token for a fresh access/refresh token pair.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          "if (data.accessToken) {",
          "  pm.collectionVariables.set('barber_access_token', data.accessToken);",
          "  pm.environment.set('barber_access_token', data.accessToken);",
          "}",
          "if (data.refreshToken) {",
          "  pm.collectionVariables.set('barber_refresh_token', data.refreshToken);",
          "  pm.environment.set('barber_refresh_token', data.refreshToken);",
          "}",
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
          "pm.collectionVariables.set('customer_access_token', '');",
          "pm.collectionVariables.set('customer_refresh_token', '');",
          "pm.environment.set('customer_access_token', '');",
          "pm.environment.set('customer_refresh_token', '');",
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
        body: jsonBody(`{
  "mobile": "{{test_customer_mobile}}",
  "retryType": "text"
}`),
        description: 'Resend the customer OTP over the text channel for local OTP flow testing.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        ),
      }),
    },
    {
      name: '9. Health Check',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/health',
        auth: { type: 'noauth' },
        description: 'Simple liveness check for the API server.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        ),
      }),
    },
  ],
};

const onboardingCollection = {
  info: {
    name: 'EverCut - Onboarding',
    description: 'Customer and barber onboarding requests wired for the OTP test users and the local sample upload asset. Run 01-authentication.json first to populate onboarding tokens. Upon successful onboarding, access and refresh tokens are captured for the other collections.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
      ...onboardingTokenVariables(),
    ),
  ],
  event: collectionPreRequest({ includeOnboardingTokens: true }),
  item: [
    {
      name: '1. Complete Customer Profile',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/onboarding/customers',
        auth: bearerAuth('customer_onboarding_token'),
        body: formDataBody([
          textField('firstName', 'Test'),
          textField('lastName', 'Customer'),
          textField('phoneNumber', '9876543210'),
          textField('email', 'test.customer@example.com'),
          textField('gender', 'Male'),
          textField('dateOfBirth', '1994-06-15'),
          textField('address', customerLocationText),
          textField('location', customerLocationGeoJson, 'GeoJSON point near the barber test shop'),
          fileField('photo', 'Prewired local sample upload'),
        ]),
        description: 'Creates the customer for the OTP-verified customer test user. A rerun returns 409 because onboarding only succeeds once per account.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
          'const response = pm.response.code === 201 ? pm.response.json() : null;',
          'const data = response && response.data ? response.data : {};',
          "if (pm.response.code === 201) {",
          "  if (data.accessToken) {",
          "    pm.collectionVariables.set('customer_access_token', data.accessToken);",
          "    pm.environment.set('customer_access_token', data.accessToken);",
          "  }",
          "  if (data.refreshToken) {",
          "    pm.collectionVariables.set('customer_refresh_token', data.refreshToken);",
          "    pm.environment.set('customer_refresh_token', data.refreshToken);",
          "  }",
          "  pm.collectionVariables.set('customer_onboarding_token', '');",
          "  pm.environment.set('customer_onboarding_token', '');",
          "}",
        ),
      }),
    },
    {
      name: '2. Complete Barber Profile',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/onboarding/barbers',
        auth: bearerAuth('barber_onboarding_token'),
        body: formDataBody([
          textField('firstName', 'Test'),
          textField('lastName', 'Barber'),
          textField('email', 'test.barber@example.com'),
          textField('dateOfBirth', '1991-01-12'),
          textField('gender', 'Male'),
          textField('shopName', 'Postman Test Barber Studio'),
          textField('shopOwner', 'Test Barber'),
          textField('businessCategory', 'Barber'),
          textField('targetCustomers', 'male'),
          textField('shopLocation', barberLocationText),
          textField('location', barberLocationGeoJson, 'Matches the customer discovery coordinates'),
          textField('amenities', '["Air Conditioning","Waiting Area","Drinking Water","Washrooms","Parking Area","Wi-Fi","Charging Points"]'),
          textField('workingDays', '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'),
          textField('workingHours', '{"opensAt":"09:00","closesAt":"20:00"}'),
          textField('breakTimings', '[{"startsAt":"13:00","endsAt":"14:00"}]'),
          textField('accountHolderName', 'Test Barber'),
          textField('bankName', 'HDFC Bank'),
          textField('upiAddress', 'test.barber@upi'),
          textField('pin', '1234'),
          textField('confirmPin', '1234'),
          fileField('shopImages', 'Sample shop image 1 of 3'),
          fileField('shopImages', 'Sample shop image 2 of 3'),
          fileField('shopImages', 'Sample shop image 3 of 3'),
        ]),
        description: 'Creates the barber shop for the OTP-verified barber test user. The three shop image fields already point to the local sample file.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
          'const response = pm.response.code === 201 ? pm.response.json() : null;',
          'const data = response && response.data ? response.data : {};',
          'const shopId = data.shop && data.shop._id;',
          "if (shopId) { pm.globals.set('shared_shop_id', shopId); }",
          "if (pm.response.code === 201) {",
          "  if (data.accessToken) {",
          "    pm.collectionVariables.set('barber_access_token', data.accessToken);",
          "    pm.environment.set('barber_access_token', data.accessToken);",
          "  }",
          "  if (data.refreshToken) {",
          "    pm.collectionVariables.set('barber_refresh_token', data.refreshToken);",
          "    pm.environment.set('barber_refresh_token', data.refreshToken);",
          "  }",
          "  pm.collectionVariables.set('barber_onboarding_token', '');",
          "  pm.environment.set('barber_onboarding_token', '');",
          "  pm.globals.set('shared_barber_pin', '1234');",
          "}",
        ),
      }),
    },
  ],
};

const customerCollection = {
  info: {
    name: 'EverCut - Customer',
    description: 'Customer data, home payload, and nearby service discovery. The final request also captures shared shop/service IDs for later collections.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest(),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
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
        url: '{{base_url}}/{{api_prefix}}/customer/profile',
        description: 'Returns the current customer data.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '2. Update Profile',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/customer/profile',
        description: 'Updates the customer data and reuses the sample image as an optional replacement photo.',
        body: formDataBody([
          textField('firstName', 'Test'),
          textField('lastName', 'Customer'),
          textField('email', 'test.customer@example.com'),
          textField('address', `${customerLocationText}, India`),
          textField('location', customerLocationGeoJson),
          fileField('photo', 'Optional sample replacement photo'),
        ]),
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get Homepage',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/homepage',
        description: 'Returns the compact home-screen payload.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Services By Gender And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/homepage/services?gender=male&coordinates={{coordinates}}',
        description: 'Uses the shared Bengaluru coordinates so the response includes the barber shop created by onboarding. The script captures the first nearby Postman shop and service IDs.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          'const shops = Array.isArray(data.shops) ? data.shops : [];',
          'const services = Array.isArray(data.services) ? data.services : [];',
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (preferredShop && preferredShop._id) { pm.collectionVariables.set('shop_id', preferredShop._id); pm.globals.set('shared_shop_id', preferredShop._id); }",
          "if (preferredService && preferredService._id) { pm.collectionVariables.set('service_id', preferredService._id); pm.globals.set('shared_service_id', preferredService._id); }",
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
      ...accessTokenVariables(),
      textVariable('shop_id', ''),
      textVariable('employee_id', ''),
      textVariable('service_id', ''),
      textVariable('booking_id', ''),
      textVariable('service_to_remove_id', ''),
      textVariable('booking_date', ''),
      textVariable('booking_update_date', ''),
      textVariable('booking_reschedule_date', ''),
      textVariable('booking_reorder_date', ''),
      textVariable('calendar_date', ''),
      textVariable('booking_time', ''),
      textVariable('booking_update_time', ''),
      textVariable('booking_reschedule_time', ''),
      textVariable('booking_reorder_time', ''),
      textVariable('reordered_booking_id', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Upcoming Bookings And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings?type=upcoming',
        description: 'Lists upcoming bookings and captures the first booking ID and first service ID when they already exist.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const bookings = Array.isArray(response.data) ? response.data : [];',
          'const firstBooking = bookings[0];',
          "if (firstBooking && firstBooking._id) { pm.collectionVariables.set('booking_id', firstBooking._id); pm.globals.set('shared_booking_id', firstBooking._id); }",
          'const firstService = firstBooking && Array.isArray(firstBooking.serviceIds) ? firstBooking.serviceIds[0] : null;',
          "const firstServiceId = firstService && firstService._id ? firstService._id : '';",
          "if (firstServiceId) { pm.collectionVariables.set('service_to_remove_id', firstServiceId); }",
        ),
      }),
    },
    {
      name: '2. Get Employee Calendar',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/employees/{{employee_id}}/calendar?date={{calendar_date}}',
        description: 'Checks the captured employee calendar for the generated booking date.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Book Salon',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "serviceId": ["{{service_id}}"],
  "employeeId": "{{employee_id}}",
  "shopId": "{{shop_id}}",
  "date": "{{booking_date}}",
  "time": "{{booking_time}}"
}`),
        description: 'Creates a new future booking using the shared shop, employee, and service IDs. The body matches the real validator shape.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          'const response = pm.response.json();',
          'const bookingId = response.data && response.data.bookingId;',
          "if (bookingId) { pm.collectionVariables.set('booking_id', bookingId); pm.globals.set('shared_booking_id', bookingId); }",
          'const services = response.data && Array.isArray(response.data.services) ? response.data.services : [];',
          'const firstService = services[0];',
          "if (firstService && firstService._id) { pm.collectionVariables.set('service_to_remove_id', firstService._id); }",
        ),
      }),
    },
    {
      name: '4. Get Booking Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}',
        description: 'Reads the full booking detail payload for the captured booking.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const services = response.data && Array.isArray(response.data.services) ? response.data.services : [];',
          'const firstService = services[0];',
          "if (firstService && firstService._id) { pm.collectionVariables.set('service_to_remove_id', firstService._id); }",
        ),
      }),
    },
    {
      name: '5. Get Booking Confirmation',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}/confirmation',
        description: 'Returns the confirmation screen payload for the captured booking.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Toggle Favorite',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}/favorite',
        description: 'Adds or removes the current booking from the customer favourites list.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Update Booking',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "employeeId": "{{employee_id}}",
  "date": "{{booking_update_date}}",
  "time": "{{booking_update_time}}"
}`),
        description: 'Updates the booking using the real validator shape: all three fields are required.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Reschedule Booking',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}/reschedule',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "newDate": "{{booking_reschedule_date}}",
  "newTime": "{{booking_reschedule_time}}"
}`),
        description: 'Reschedules the current booking to a later generated date and time.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9. Reorder Booking',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}/reorder',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "date": "{{booking_reorder_date}}",
  "time": "{{booking_reorder_time}}"
}`),
        description: 'Creates a fresh booking from the current one. The API expects `date` and `time`, not `newDate` and `newTime`.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          'const response = pm.response.json();',
          'const bookingId = response.data && response.data.bookingId;',
          "if (bookingId) { pm.collectionVariables.set('reordered_booking_id', bookingId); }",
        ),
      }),
    },
    {
      name: '10. Delete Service From Booking',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}/services/{{service_to_remove_id}}',
        description: 'Removes the captured service from the booking. There is no placeholder path segment left to edit manually.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '11. Cancel Booking',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/customer/bookings/{{booking_id}}',
        description: 'Cancels the currently captured booking. This stays last because it is destructive.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const customerShopDiscoveryCollection = {
  info: {
    name: 'EverCut - Customer Shop Discovery',
    description: 'Nearby shop discovery and search requests using the same Bengaluru coordinates as the barber onboarding flow.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_shop_id', 'shop_id'],
      ['shared_service_id', 'service_id'],
    ],
  }),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
      textVariable('coordinates', sharedCoordinates),
      textVariable('shop_id', ''),
      textVariable('service_id', ''),
      textVariable('service_search_query', 'Postman'),
      textVariable('shop_search_query', 'Postman'),
    ),
  ],
  item: [
    {
      name: '1. Get Nearby Shops And Capture Shop ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/shops/nearby?coordinates={{coordinates}}',
        description: 'Finds nearby shops and captures the Postman barber shop ID when it is present.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const shops = Array.isArray(response.data) ? response.data : [];',
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "if (preferredShop && preferredShop._id) { pm.collectionVariables.set('shop_id', preferredShop._id); pm.globals.set('shared_shop_id', preferredShop._id); }",
        ),
      }),
    },
    {
      name: '2. Get Shop Info And Capture Service ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/shops/{{shop_id}}',
        description: 'Returns the full customer-facing shop payload and captures the first Postman service ID from the embedded service lists.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          'const single = data.services && Array.isArray(data.services.single) ? data.services.single : [];',
          'const bundled = data.services && Array.isArray(data.services.bundled) ? data.services.bundled : [];',
          'const services = [...single, ...bundled];',
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (data.shop && data.shop._id) { pm.collectionVariables.set('shop_id', data.shop._id); pm.globals.set('shared_shop_id', data.shop._id); }",
          "if (preferredService && preferredService._id) { pm.collectionVariables.set('service_id', preferredService._id); pm.globals.set('shared_service_id', preferredService._id); }",
        ),
      }),
    },
    {
      name: '3. Get Doorstep Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/shops/doorstep',
        description: 'Lists shops with the Door-Step category.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Search Services',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/search/services?query={{service_search_query}}&gender=male',
        description: 'Searches the customer-visible service catalogue for the services created by the barber service collection.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Search Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/search/shops?query={{shop_search_query}}',
        description: 'Searches the customer-visible shop catalogue for the Postman barber shop.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const customerRatingsCollection = {
  info: {
    name: 'EverCut - Customer Ratings',
    description: 'Customer rating flow with a bootstrap request that captures the nearby Postman shop ID before submitting the rating.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('customer_access_token'),
  event: collectionPreRequest({
    syncPairs: [['shared_shop_id', 'shop_id']],
  }),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
      textVariable('coordinates', sharedCoordinates),
      textVariable('shop_id', ''),
      textVariable('customer_email', 'test.customer@example.com'),
    ),
  ],
  item: [
    {
      name: '1. Get Nearby Shops And Capture Shop ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/shops/nearby?coordinates={{coordinates}}',
        description: 'Captures the nearby Postman shop ID so the rest of the rating flow is ready without manual copy-paste.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const shops = Array.isArray(response.data) ? response.data : [];',
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "if (preferredShop && preferredShop._id) { pm.collectionVariables.set('shop_id', preferredShop._id); pm.globals.set('shared_shop_id', preferredShop._id); }",
        ),
      }),
    },
    {
      name: '2. Add Rating',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/customer/ratings',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "shopId": "{{shop_id}}",
  "rating": 5,
  "review": "Postman collection review for the OTP/JWT customer flow."
}`),
        description: 'Creates a new rating for the captured shop. The API allows only one rating per customer per shop, so reruns return 409 instead of 201 after the first success.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
        ),
      }),
    },
    {
      name: '3. Get Shop Ratings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/shops/{{shop_id}}/ratings',
        description: 'Lists all ratings for the captured shop, including barber replies.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Rating Summary',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/customer/shops/{{shop_id}}/ratings/summary',
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
      ...accessTokenVariables(),
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
        url: '{{base_url}}/{{api_prefix}}/barber/profile',
        description: 'Reads the barber profile and stores the current shop ID for the dependent collections.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const shopId = response.data && response.data._id;',
          "if (shopId) { pm.collectionVariables.set('shop_id', shopId); pm.globals.set('shared_shop_id', shopId); }",
        ),
      }),
    },
    {
      name: '2. Update Business Info',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/profile',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "email": "test.barber.updated@example.com",
  "firstName": "Test",
  "lastName": "Barber",
  "shopOwner": "Test Barber",
  "dateOfBirth": "1991-01-12",
  "gender": "Male",
  "shopName": "Postman Test Barber Studio",
  "businessCategory": "Barber",
  "targetCustomers": "male",
  "shopLocation": "${barberLocationText}",
  "location": ${barberLocationGeoJson},
  "amenities": ["Air Conditioning", "Waiting Area", "Parking Area", "Wi-Fi"],
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "workingHours": {
    "opensAt": "09:00",
    "closesAt": "20:00"
  },
  "breakTimings": [
    {
      "startsAt": "13:00",
      "endsAt": "14:00"
    }
  ],
  "accountHolderName": "Test Barber",
  "bankName": "HDFC Bank",
  "upiAddress": "test.barber@upi",
  "bio": "Updated from the automated Postman profile collection."
}`),
        description: 'Updates the barber profile using the onboarding-friendly request shape that the backend validators actually accept.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get UPI Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/upi',
        description: 'Reads the dedicated UPI payload.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Update UPI Details',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/upi',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "accountHolderName": "Test Barber",
  "bankName": "HDFC Bank",
  "upiAddress": "test.barber+verified@upi"
}`),
        description: 'Updates only the dedicated payment fields.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Ensure Shop Is Open',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/toggle-status',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "status": true
}`),
        description: 'Explicitly opens the shop so customer discovery and bookings can run immediately after this collection.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Update Profile Picture',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/picture',
        body: formDataBody([fileField('photo', 'Prewired local sample upload')]),
        description: 'Uploads or replaces the owner profile picture using the local sample image.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Update Cover Image',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/cover',
        body: formDataBody([fileField('cover', 'Prewired local sample upload')]),
        description: 'Uploads or replaces the shop cover image using the same local sample file.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Update PIN',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/pin',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "currentPin": "{{barber_active_pin}}",
  "newPin": "{{barber_next_pin}}",
  "confirmNewPin": "{{barber_next_pin}}"
}`),
        description: 'Flips the barber PIN between 1234 and 5678 so the request stays rerunnable.',
        event: [
          ...preRequestEvent(
            "const currentPin = pm.collectionVariables.get('barber_active_pin') || '1234';",
            "const nextPin = currentPin === '1234' ? '5678' : '1234';",
            "pm.collectionVariables.set('barber_next_pin', nextPin);",
          ),
          ...testEvent(
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "const nextPin = pm.collectionVariables.get('barber_next_pin');",
            "pm.collectionVariables.set('barber_active_pin', nextPin);",
            "pm.globals.set('shared_barber_pin', nextPin);",
          ),
        ],
      }),
    },
    {
      name: '9A. Sign-Out Everywhere (Terminal)',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/barber/profile/sign-out-everywhere',
        description: 'Revokes the JWT refresh token, invalidating all sessions. Run this only when you are finished testing.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9B. Delete Account (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/profile',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "currentPin": "{{barber_active_pin}}"
}`),
        description: 'Soft-deletes the barber account and revokes the JWT refresh token. Run this instead of the sign-out request when you want the account deleted.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const barberEmployeesCollection = {
  info: {
    name: 'EverCut - Barber Employees',
    description: 'Employee CRUD collection with automatic ID capture and a prewired sample image for the optional employee photo.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [['shared_employee_id', 'employee_id']],
  }),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
      textVariable('employee_id', ''),
      textVariable('employee_phone', ''),
    ),
  ],
  item: [
    {
      name: '1. Get Employees And Capture Existing ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/employees',
        description: 'Lists current employees and captures the first Postman employee ID when it already exists.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const employees = Array.isArray(response.data) ? response.data : [];',
          "const preferredEmployee = employees.find((employee) => typeof employee.firstName === 'string' && employee.firstName.includes('Postman')) || employees[0];",
          "if (preferredEmployee && preferredEmployee._id) { pm.collectionVariables.set('employee_id', preferredEmployee._id); pm.globals.set('shared_employee_id', preferredEmployee._id); }",
        ),
      }),
    },
    {
      name: '2. Add Employee',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/barber/employees',
        body: formDataBody([
          textField('firstName', 'Postman'),
          textField('lastName', 'Automation'),
          textField('phoneNumber', '{{employee_phone}}'),
          textField('gender', 'Female'),
          textField('dateOfBirth', '1995-05-15'),
          textField('workingHours', '{"start":"09:00","end":"18:00"}'),
          fileField('photo', 'Optional sample employee photo'),
        ]),
        description: 'Creates a new employee with a generated phone number so the request stays rerunnable.',
        event: [
          ...preRequestEvent(
            "const suffix = Date.now().toString().slice(-7);",
            "pm.collectionVariables.set('employee_phone', `+1555${suffix}`);",
          ),
          ...testEvent(
            "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
            'const response = pm.response.json();',
            'const employeeId = response.data && response.data._id;',
            "if (employeeId) { pm.collectionVariables.set('employee_id', employeeId); pm.globals.set('shared_employee_id', employeeId); }",
          ),
        ],
      }),
    },
    {
      name: '3. Update Employee',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/employees/{{employee_id}}',
        body: formDataBody([
          textField('firstName', 'Postman'),
          textField('lastName', 'Automation Updated'),
          textField('workingHours', '{"start":"10:00","end":"19:00"}'),
          textField('blockedDates', '[]'),
          fileField('photo', 'Optional sample employee photo replacement'),
        ]),
        description: 'Updates the captured employee with only fields that the validator supports.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Delete Employee (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/employees/{{employee_id}}',
        description: 'Soft-deletes the captured employee. Run this last because later collections may still need the shared employee ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('employee_id');",
          "pm.globals.unset('shared_employee_id');",
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
      ...accessTokenVariables(),
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
        url: '{{base_url}}/{{api_prefix}}/barber/services',
        description: 'Lists current services and captures the first Postman service ID when it already exists.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const services = Array.isArray(response.data) ? response.data : [];',
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (preferredService && preferredService._id) { pm.collectionVariables.set('service_id', preferredService._id); pm.globals.set('shared_service_id', preferredService._id); }",
        ),
      }),
    },
    {
      name: '2. Add Single Service',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/barber/services',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "serviceName": "{{single_service_name}}",
  "serviceType": "single",
  "serviceFor": "male",
  "duration": 30,
  "actualPrice": 500,
  "offerPrice": 50
}`),
        description: 'Creates a single service using only fields that the API validator accepts.',
        event: [
          ...preRequestEvent(
            "pm.collectionVariables.set('single_service_name', `Postman Express Cut ${Date.now().toString().slice(-6)}`);",
          ),
          ...testEvent(
            "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
            'const response = pm.response.json();',
            'const serviceId = response.data && response.data._id;',
            "if (serviceId) { pm.collectionVariables.set('service_id', serviceId); pm.globals.set('shared_service_id', serviceId); }",
          ),
        ],
      }),
    },
    {
      name: '3. Add Bundled Service',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/barber/services',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "serviceName": "{{bundled_service_name}}",
  "serviceType": "bundled",
  "serviceFor": "male",
  "actualPrice": 900,
  "offerPrice": 100,
  "bundledServices": ["Haircut", "Beard Trim", "Head Massage"],
  "totalDuration": 75
}`),
        description: 'Creates a bundled service using the fields required by the backend validator.',
        event: [
          ...preRequestEvent(
            "pm.collectionVariables.set('bundled_service_name', `Postman Grooming Combo ${Date.now().toString().slice(-6)}`);",
          ),
          ...testEvent("pm.test('status is 201', function () { pm.response.to.have.status(201); });"),
        ],
      }),
    },
    {
      name: '4. Update Service',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/services/{{service_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "serviceFor": "unisex"
}`),
        description: 'Updates the captured service with a validator-approved field.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Service (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/services/{{service_id}}',
        description: 'Soft-deletes the captured service. Run this last because customer discovery and booking flows depend on the shared service ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('service_id');",
          "pm.globals.unset('shared_service_id');",
        ),
      }),
    },
  ],
};

const barberBookingsCollection = {
  info: {
    name: 'EverCut - Barber Bookings',
    description: 'Barber booking administration collection. It captures separate IDs for status updates and delete-after-payment so the limitations of the public API are explicit.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [
      ['shared_booking_id', 'booking_id_status'],
      ['shared_booking_id', 'booking_id_delete'],
    ],
  }),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
      textVariable('booking_id_status', ''),
      textVariable('booking_id_delete', ''),
    ),
  ],
  item: [
    {
      name: '1. Get All Bookings And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/bookings',
        description: 'Reads the barber booking dashboard payload and captures one ID for status updates plus one paid booking ID for the delete route when available.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const data = response.data || {};',
          'const bookings = Array.isArray(data.bookings) ? data.bookings : [];',
          "const statusBooking = bookings.find((booking) => ['pending', 'confirmed'].includes(booking.status)) || bookings[0];",
          "const deleteBooking = bookings.find((booking) => booking.paymentStatus === 'success') || statusBooking;",
          "const statusBookingId = statusBooking && (statusBooking._id || statusBooking.bookingId);",
          "const deleteBookingId = deleteBooking && (deleteBooking._id || deleteBooking.bookingId);",
          "if (statusBookingId) { pm.collectionVariables.set('booking_id_status', statusBookingId); pm.globals.set('shared_booking_id', statusBookingId); }",
          "if (deleteBookingId) { pm.collectionVariables.set('booking_id_delete', deleteBookingId); }",
        ),
      }),
    },
    {
      name: '2. Get Booking Stats',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/bookings/stats',
        description: 'Returns booking counts grouped by status.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get Confirmed Bookings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/bookings/status?status=confirmed',
        description: 'Lists confirmed bookings. `bookSalon` creates bookings in the confirmed state, so this matches the current backend behaviour.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Update Booking Status',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/bookings/{{booking_id_status}}/status',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "status": "completed"
}`),
        description: 'Updates the captured booking status. Use `booking_id_status`, not the delete-only booking ID.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Paid Booking (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/bookings/{{booking_id_delete}}',
        description: 'Deletes a paid booking only. This succeeds when request 1 captures a booking with `paymentStatus: success`.',
        event: testEvent(
          "pm.test('status is 200 or 400', function () { pm.expect(pm.response.code).to.be.oneOf([200, 400]); });",
          "if (pm.response.code === 200) { pm.collectionVariables.unset('booking_id_delete'); }",
        ),
      }),
    },
  ],
};

const barberPhotosCollection = {
  info: {
    name: 'EverCut - Barber Photos',
    description: 'Shop gallery management collection with ID capture and a prewired local sample upload file.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest({
    syncPairs: [['shared_photo_id', 'photo_id']],
  }),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
      textVariable('photo_id', ''),
    ),
  ],
  item: [
    {
      name: '1. Get All Photos And Capture Existing ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/photos',
        description: 'Lists the current gallery and captures the first photo ID. Barber onboarding already creates three gallery photos.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const photos = Array.isArray(response.data) ? response.data : [];',
          'const firstPhoto = photos[0];',
          "if (firstPhoto && firstPhoto._id) { pm.collectionVariables.set('photo_id', firstPhoto._id); pm.globals.set('shared_photo_id', firstPhoto._id); }",
        ),
      }),
    },
    {
      name: '2. Upload Photos',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/barber/photos',
        body: formDataBody([
          fileField('photos', 'Prewired local sample upload'),
          textField('photoType', 'shop_interior'),
          textField('description', 'Uploaded from the automated Postman photo collection'),
        ]),
        description: 'Uploads one gallery image using the local sample file and captures the new photo ID.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          'const response = pm.response.json();',
          'const photos = Array.isArray(response.data) ? response.data : [];',
          'const firstPhoto = photos[0];',
          "if (firstPhoto && firstPhoto._id) { pm.collectionVariables.set('photo_id', firstPhoto._id); pm.globals.set('shared_photo_id', firstPhoto._id); }",
        ),
      }),
    },
    {
      name: '3. Get Photo Stats',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/photos/stats',
        description: 'Returns photo counts and storage totals.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Photo By ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/photos/{{photo_id}}',
        description: 'Reads the currently captured photo record.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Photo (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/photos/{{photo_id}}',
        description: 'Deletes the captured photo from both MongoDB and Cloudinary. Run this last if later requests still need the shared photo ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('photo_id');",
          "pm.globals.unset('shared_photo_id');",
        ),
      }),
    },
  ],
};

const barberEarningsCollection = {
  info: {
    name: 'EverCut - Barber Earnings',
    description: 'Single-request collection for the barber earnings summary. Completed bookings are required for non-zero values.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest(),
  variable: [
    ...baseVariables(
      ...accessTokenVariables(),
    ),
  ],
  item: [
    {
      name: '1. Get Earnings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/barber/earnings',
        description: 'Returns `totalEarning`, `lastMonthEarning`, and `todayEarning` across the barber shop employees.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
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
      ...accessTokenVariables(),
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
        url: '{{base_url}}/{{api_prefix}}/barber/ratings',
        description: 'Run this first. It captures the three seeded rating IDs created by `node scripts/seed-barber-rating-mock-data.js`.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          'const response = pm.response.json();',
          'const ratings = Array.isArray(response.data) ? response.data : [];',
          'const capture = (variableName, marker) => {',
          "  const match = ratings.find((item) => typeof item.review === 'string' && item.review.includes(marker));",
          "  if (match && match.ratingId) { pm.collectionVariables.set(variableName, match.ratingId); }",
          '};',
          "capture('rating_id_add_reply', '[ADD_REPLY_TARGET]');",
          "capture('rating_id_update_reply', '[UPDATE_REPLY_TARGET]');",
          "capture('rating_id_remove_rating', '[REMOVE_RATING_TARGET]');",
          "if (!pm.collectionVariables.get('rating_id_add_reply') || !pm.collectionVariables.get('rating_id_update_reply') || !pm.collectionVariables.get('rating_id_remove_rating')) {",
          "  console.warn('Seeded rating markers were not found. Run `node scripts/seed-barber-rating-mock-data.js` before using this collection.');",
          "}",
        ),
      }),
    },
    {
      name: '2. Add Reply',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/barber/ratings/{{rating_id_add_reply}}/reply',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "replyText": "Thanks for the feedback. We appreciate your visit."
}`),
        description: 'Adds a reply to the seeded rating that has no reply yet.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Update Reply',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/barber/ratings/{{rating_id_update_reply}}/reply',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{
  "replyText": "Updated reply from Postman for the seeded barber rating flow."
}`),
        description: 'Updates the seeded reply on the dedicated rating fixture.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Delete Reply',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/ratings/{{rating_id_update_reply}}/reply',
        description: 'Deletes the reply from the same seeded rating used by the update step.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Remove Rating',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/barber/ratings/{{rating_id_remove_rating}}',
        description: 'Deletes the seeded rating dedicated to the remove-rating route.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
  ],
};

const environmentTemplate = {
  id: 'evercut-local-environment',
  name: 'EverCut Local',
  values: [
    {
      key: 'base_url',
      value: 'http://localhost:5000',
      enabled: true,
    },
    {
      key: 'api_prefix',
      value: 'api/v1',
      enabled: true,
    },
    {
      key: 'test_customer_mobile',
      value: '9876543210',
      enabled: true,
    },
    {
      key: 'test_barber_mobile',
      value: '9876543211',
      enabled: true,
    },
    {
      key: 'test_otp',
      value: '123456',
      enabled: true,
    },
    {
      key: 'customer_access_token',
      value: '',
      enabled: true,
    },
    {
      key: 'customer_refresh_token',
      value: '',
      enabled: true,
    },
    {
      key: 'customer_onboarding_token',
      value: '',
      enabled: true,
    },
    {
      key: 'barber_access_token',
      value: '',
      enabled: true,
    },
    {
      key: 'barber_refresh_token',
      value: '',
      enabled: true,
    },
    {
      key: 'barber_onboarding_token',
      value: '',
      enabled: true,
    },
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'OpenAI Codex',
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
writeCollection('11-barber-photos.json', barberPhotosCollection);
writeCollection('12-barber-earnings.json', barberEarningsCollection);
writeCollection('13-barber-ratings.json', barberRatingsCollection);
writeFileSync(resolve(COLLECTIONS_DIR, 'EverCut.postman_environment.json'), `${JSON.stringify(environmentTemplate, null, 2)}\n`);
