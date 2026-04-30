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
const formDataBody = (formdata) => ({ mode: 'formdata', formdata });

const fileField = (key, description) => {
  const field = { key, type: 'file' };
  if (description) field.description = description;
  return field;
};

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

const testEvent = (...exec) => [{ listen: 'test', script: { type: 'text/javascript', exec: [...standardEnvelopeAssertions, ...exec] } }];
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
      "const getWorkingHourTime = (hour) => {",
      "  const clampedHour = Math.max(9, Math.min(20, hour));",
      "  return `${String(clampedHour).padStart(2, '0')}:00`;",
      "};",
      "",
      "// Check if user has manually set dates/times in Collection Variables",
      "const hasManualDate = pm.collectionVariables.get('booking_date');",
      "const hasManualTime = pm.collectionVariables.get('booking_time');",
      "",
      "if (!hasManualDate) {",
      "  pm.collectionVariables.set('booking_date', toIsoDate(getNextAvailableDate(1)));",
      "  pm.collectionVariables.set('booking_update_date', toIsoDate(getNextAvailableDate(2)));",
      "  pm.collectionVariables.set('booking_reschedule_date', toIsoDate(getNextAvailableDate(3)));",
      "  pm.collectionVariables.set('booking_reorder_date', toIsoDate(getNextAvailableDate(4)));",
      "  pm.collectionVariables.set('calendar_date', toIsoDate(getNextAvailableDate(2)));",
      "}",
      "",
      "if (!hasManualTime) {",
      "  pm.collectionVariables.set('booking_time', getWorkingHourTime(11));",
      "  pm.collectionVariables.set('booking_update_time', getWorkingHourTime(12));",
      "  pm.collectionVariables.set('booking_reschedule_time', getWorkingHourTime(13));",
      "  pm.collectionVariables.set('booking_reorder_time', getWorkingHourTime(14));",
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
          "} else {",
          "  pm.environment.unset('customer_onboarding_token');",
          "  if (data.accessToken) pm.environment.set('customer_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('customer_refresh_token', data.refreshToken);",
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
          "} else {",
          "  pm.environment.unset('barber_onboarding_token');",
          "  if (data.accessToken) pm.environment.set('barber_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('barber_refresh_token', data.refreshToken);",
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
          "if (data.refreshToken) pm.environment.set('customer_refresh_token', data.refreshToken);"
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
          "if (data.refreshToken) pm.environment.set('barber_refresh_token', data.refreshToken);"
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
      name: '9. Health Check',
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
        body: formDataBody([
          textField('firstName', 'Test'),
          textField('lastName', 'Customer'),
          textField('phoneNumber', '9876543210'),
          textField('email', 'test.customer@example.com'),
          textField('gender', 'Male'),
          textField('dateOfBirth', '1994-06-15'),
          textField('address', customerLocationText),
          textField('location', customerLocationGeoJson, 'GeoJSON point near the barber test shop'),
          fileField('photo', 'Attach customer photo file manually in Postman'),
        ]),
        description: 'Creates the customer for the OTP-verified customer test user. A rerun returns 409 because onboarding only succeeds once per account.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
          "if (pm.response.code === 201) {",
          "  const data = pm.response.json().data || {};",
          "  if (data.accessToken) pm.environment.set('customer_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('customer_refresh_token', data.refreshToken);",
          "  pm.environment.unset('customer_onboarding_token');",
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
          fileField('shopImages', 'Attach shop image 1 of 3 manually in Postman'),
          fileField('shopImages', 'Attach shop image 2 of 3 manually in Postman'),
          fileField('shopImages', 'Attach shop image 3 of 3 manually in Postman'),
        ]),
        description: 'Creates the barber shop for the OTP-verified barber test user. Shop schedule values can be sent in HH:MM or hh:mm AM/PM format and are normalized by the backend. The three shop image fields already point to the local sample file.',
        event: testEvent(
          "pm.test('status is 201 or 409', function () { pm.expect(pm.response.code).to.be.oneOf([201, 409]); });",
          "if (pm.response.code === 201) {",
          "  const data = pm.response.json().data || {};",
          "  if (data.shop && data.shop._id) pm.globals.set('shared_shop_id', data.shop._id);",
          "  if (data.accessToken) pm.environment.set('barber_access_token', data.accessToken);",
          "  if (data.refreshToken) pm.environment.set('barber_refresh_token', data.refreshToken);",
          "  pm.environment.unset('barber_onboarding_token');",
          "  pm.globals.set('shared_barber_pin', '1234');",
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
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/customers/me',
        description: 'Updates the customer data and reuses the sample image as an optional replacement photo.',
        body: formDataBody([
          textField('firstName', 'Test'),
          textField('lastName', 'Customer'),
          textField('email', 'test.customer@example.com'),
          textField('address', `${customerLocationText}, India`),
          textField('location', customerLocationGeoJson),
          fileField('photo', 'Attach replacement photo file manually in Postman (optional)'),
        ]),
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get Services By Gender And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/nearby/services?gender=male&coordinates={{coordinates}}',
        description: 'Uses the shared Bengaluru coordinates so the response includes the barber shop created by onboarding. The script captures the first nearby Postman shop and service IDs.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const data = pm.response.json().data || {};",
          "const shops = Array.isArray(data.shops) ? data.shops : [];",
          "const services = Array.isArray(data.services) ? data.services : [];",
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (preferredShop && preferredShop._id) { pm.collectionVariables.set('shop_id', preferredShop._id); pm.globals.set('shared_shop_id', preferredShop._id); }",
          "if (preferredService && preferredService._id) { pm.collectionVariables.set('service_id', preferredService._id); pm.globals.set('shared_service_id', preferredService._id); }"
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
        url: '{{base_url}}/{{api_prefix}}/bookings?type=upcoming',
        description: 'Lists upcoming bookings and captures the first booking ID and first service ID when they already exist.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const bookings = Array.isArray(response.data && response.data.items) ? response.data.items : [];",
          "const firstBooking = bookings[0];",
          "if (firstBooking && firstBooking._id) { pm.collectionVariables.set('booking_id', firstBooking._id); pm.globals.set('shared_booking_id', firstBooking._id); }"
        ),
      }),
    },
    {
      name: '2. Get Employee Calendar',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}/calendar?date={{calendar_date}}',
        description: 'Checks the captured employee calendar for the generated booking date.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Book Salon',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "serviceId": ["{{service_id}}"],\n  "employeeId": "{{employee_id}}",\n  "shopId": "{{shop_id}}",\n  "date": "{{booking_date}}",\n  "time": "{{booking_time}}"\n}`),
        description: 'Creates a new future booking using the shared shop, employee, and service IDs. The body matches the real validator shape.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          "const response = pm.response.json();",
          "const bookingId = response.data && response.data.bookingId;",
          "if (bookingId) { pm.collectionVariables.set('booking_id', bookingId); pm.globals.set('shared_booking_id', bookingId); }"
        ),
      }),
    },
    {
      name: '4. Get Booking Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}',
        description: 'Reads the full booking detail payload for the captured booking.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Get Booking Confirmation',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/confirmation',
        description: 'Returns the confirmation screen payload for the captured booking.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Toggle Booking Favorite',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/favorite',
        description: 'Adds or removes the current booking from the customer favorites list through the booking resource.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Get Favorite Bookings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings?type=favorites',
        description: 'Lists the authenticated customer favorite bookings through the booking list flow.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Update Booking',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "employeeId": "{{employee_id}}",\n  "date": "{{booking_update_date}}",\n  "time": "{{booking_update_time}}"\n}`),
        description: 'Updates the booking using the real validator shape: all three fields are required. Note: 7-day advance booking window applies.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9. Reschedule Booking',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/reschedule',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "newDate": "{{booking_reschedule_date}}",\n  "newTime": "{{booking_reschedule_time}}"\n}`),
        description: 'Reschedules the current booking to a later generated date and time. Limited to once per booking. 7-day advance booking window applies.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Reorder Booking',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/reorder',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "date": "{{booking_reorder_date}}",\n  "time": "{{booking_reorder_time}}"\n}`),
        description: 'Creates a fresh booking from the current one. The API expects `date` and `time`, not `newDate` and `newTime`. 7-day advance booking window applies.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          "const response = pm.response.json();",
          "const bookingId = response.data && response.data.bookingId;",
          "if (bookingId) { pm.collectionVariables.set('reordered_booking_id', bookingId); }"
        ),
      }),
    },
    {
      name: '11. Cancel Booking',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id}}/cancel',
        description: 'Cancels the currently captured booking and releases its locked slot markers. This stays last because it is destructive.',
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
        url: '{{base_url}}/{{api_prefix}}/shops/nearby?coordinates={{coordinates}}',
        description: 'Finds nearby shops and captures the Postman barber shop ID when it is present.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const shops = Array.isArray(response.data) ? response.data : [];",
          "const preferredShop = shops.find((shop) => typeof shop.shopName === 'string' && shop.shopName.includes('Postman')) || shops[0];",
          "if (preferredShop && preferredShop._id) { pm.collectionVariables.set('shop_id', preferredShop._id); pm.globals.set('shared_shop_id', preferredShop._id); }"
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
          "if (data.shop && data.shop._id) { pm.collectionVariables.set('shop_id', data.shop._id); pm.globals.set('shared_shop_id', data.shop._id); }",
          "if (preferredService && preferredService._id) { pm.collectionVariables.set('service_id', preferredService._id); pm.globals.set('shared_service_id', preferredService._id); }"
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
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}/available-slots?date={{booking_date}}&serviceId={{service_id}}',
        description: 'Returns available time slots for the employee considering service duration, booked slots, and blocked dates. 7-day advance booking window applies.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes slot information', function () {",
          "  pm.expect(data).to.have.property('slots');",
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
        description: 'Returns availability across all employees for the shop, including first available slot suggestion. 7-day advance booking window applies.',
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
      name: '6. Toggle Favorite Shop',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/shops/{{shop_id}}/favorite',
        description: 'Adds or removes the captured shop from the authenticated customer favorite shops list through the shop discovery flow.',
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
      name: '8. Get Doorstep Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/doorstep',
        description: 'Lists shops with the Door-Step category.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '9. Search Services',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/services/search?query={{service_search_query}}&gender=male',
        description: 'Searches the customer-visible service catalogue for the services created by the barber service collection.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Search Shops',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/search?query={{shop_search_query}}',
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
        url: '{{base_url}}/{{api_prefix}}/bookings?type=past&limit=100',
        description: 'Captures a shop ID from the authenticated customer\'s completed past bookings. This request fails the collection clearly when no eligible booking exists for rating.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const bookings = Array.isArray(response.data && response.data.items) ? response.data.items : [];",
          "const completedBooking = bookings.find((booking) => booking && booking.status === 'completed' && booking.shopId);",
          "const shopId = completedBooking && completedBooking.shopId && (completedBooking.shopId._id || completedBooking.shopId);",
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
        url: '{{base_url}}/{{api_prefix}}/ratings/shop/{{shop_id}}',
        description: 'Lists all ratings for the captured shop, including barber replies.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Rating Summary',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/ratings/shop/{{shop_id}}/summary',
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
          "const shopId = response.data && response.data._id;",
          "if (shopId) { pm.collectionVariables.set('shop_id', shopId); pm.globals.set('shared_shop_id', shopId); }"
        ),
      }),
    },
    {
      name: '2. Update Business Info',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/shops/me',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "email": "test.barber.updated@example.com",\n  "firstName": "Test",\n  "lastName": "Barber",\n  "shopOwner": "Test Barber",\n  "dateOfBirth": "1991-01-12",\n  "gender": "Male",\n  "shopName": "Postman Test Barber Studio",\n  "businessCategory": "Barber",\n  "targetCustomers": "male",\n  "shopLocation": "${barberLocationText}",\n  "location": ${barberLocationGeoJson},\n  "amenities": ["Air Conditioning", "Waiting Area", "Parking Area", "Wi-Fi"],\n  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],\n  "workingHours": {\n    "opensAt": "09:00",\n    "closesAt": "20:00"\n  },\n  "breakTimings": [\n    {\n      "startsAt": "13:00",\n      "endsAt": "14:00"\n    }\n  ],\n  "accountHolderName": "Test Barber",\n  "bankName": "HDFC Bank",\n  "upiAddress": "test.barber@upi",\n  "bio": "Updated from the automated Postman profile collection."\n}`),
        description: 'Updates the barber profile using the onboarding-friendly request shape that the backend validators actually accept.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get UPI Details',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/shops/me/upi',
        description: 'Reads the dedicated UPI payload.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Update UPI Details',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/shops/me/upi',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "accountHolderName": "Test Barber",\n  "bankName": "HDFC Bank",\n  "upiAddress": "test.barber+verified@upi"\n}`),
        description: 'Updates only the dedicated payment fields.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Ensure Shop Is Open',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/shops/me/status',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "status": true\n}`),
        description: 'Explicitly opens the shop so customer discovery and bookings can run immediately after this collection.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Update Profile Picture',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/shops/me/picture',
        body: formDataBody([fileField('photo', 'Attach profile picture file manually in Postman')]),
        description: 'Uploads or replaces the owner profile picture.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Update Cover Image',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/shops/me/cover',
        body: formDataBody([fileField('cover', 'Attach cover image file manually in Postman')]),
        description: 'Uploads or replaces the shop cover image.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Update PIN',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/shops/me/pin',
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
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/shops/me/sign-out-everywhere',
        description: 'Revokes the JWT refresh token, invalidating all sessions. Run this only when you are finished testing.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '10. Delete Account (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/shops/me',
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
          "const employees = Array.isArray(response.data && response.data.items) ? response.data.items : [];",
          "const preferredEmployee = employees.find((employee) => typeof employee.firstName === 'string' && employee.firstName.includes('Postman')) || employees[0];",
          "if (preferredEmployee && preferredEmployee._id) { pm.collectionVariables.set('employee_id', preferredEmployee._id); pm.globals.set('shared_employee_id', preferredEmployee._id); }"
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
        body: formDataBody([
          textField('firstName', 'Postman'),
          textField('lastName', 'Automation'),
          textField('phoneNumber', '{{employee_phone}}'),
          textField('gender', 'Female'),
          textField('dateOfBirth', '1995-05-15'),
          textField('workingHours', '{"start":"09:00","end":"18:00"}'),
          fileField('photo', 'Attach employee photo file manually in Postman (optional)'),
        ]),
        description: 'Creates a new employee with a generated phone number so the request stays rerunnable. Employee working hours remain HH:MM 24-hour values even when the shop was originally created with AM/PM schedule input.',
        event: mergedEvents(
          [
            "const suffix = Date.now().toString().slice(-7);",
            "pm.collectionVariables.set('employee_phone', `+1555${suffix}`);"
          ],
          [
            "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
            "const response = pm.response.json();",
            "const employeeId = response.data && response.data._id;",
            "if (employeeId) { pm.collectionVariables.set('employee_id', employeeId); pm.globals.set('shared_employee_id', employeeId); }"
          ]
        ),
      }),
    },
    {
      name: '4. Update Employee',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/employees/{{employee_id}}',
        body: formDataBody([
          textField('firstName', 'Postman'),
          textField('lastName', 'Automation Updated'),
          textField('workingHours', '{"start":"10:00","end":"19:00"}'),
          textField('blockedDates', '[]'),
          fileField('photo', 'Attach employee photo file manually in Postman (optional)'),
        ]),
        description: 'Updates the captured employee with only fields that the validator supports.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Employee (Terminal)',
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
          "const services = Array.isArray(response.data && response.data.items) ? response.data.items : [];",
          "const preferredService = services.find((service) => typeof service.serviceName === 'string' && service.serviceName.includes('Postman')) || services[0];",
          "if (preferredService && preferredService._id) { pm.collectionVariables.set('service_id', preferredService._id); pm.globals.set('shared_service_id', preferredService._id); }"
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
            "const serviceId = response.data && response.data._id;",
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
        method: 'PUT',
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
    description: 'Barber booking administration collection covering list, status stats, monthly milestone progress, status updates, and explicit booking cancellation.',
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
      textVariable('booking_id_status', ''),
      textVariable('booking_id_delete', ''),
    ),
  ],
  item: [
    {
      name: '1. Get All Bookings And Capture IDs',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings',
        description: 'Reads the barber booking dashboard payload and captures one ID for status updates plus one paid booking ID for the cancellation route when available.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "const bookings = Array.isArray(data.items) ? data.items : [];",
          "const statusBooking = bookings.find((booking) => ['pending', 'confirmed'].includes(booking.status)) || bookings[0];",
          "const deleteBooking = bookings.find((booking) => booking.paymentStatus === 'success') || statusBooking;",
          "const statusBookingId = statusBooking && (statusBooking._id || statusBooking.bookingId);",
          "const deleteBookingId = deleteBooking && (deleteBooking._id || deleteBooking.bookingId);",
          "if (statusBookingId) { pm.collectionVariables.set('booking_id_status', statusBookingId); pm.globals.set('shared_booking_id', statusBookingId); }",
          "if (deleteBookingId) { pm.collectionVariables.set('booking_id_delete', deleteBookingId); }"
        ),
      }),
    },
    {
      name: '2. Get Booking Stats',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/stats',
        description: 'Returns booking counts grouped by status.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Get Booking Milestone Progress',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/progress',
        description: 'Returns the current month completed-booking milestone progress card data, including the active status, completed count, visible targets, and next reward gap.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Pending Confirmations',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/pending-confirmations',
        description: 'Lists all bookings awaiting barber confirmation. These are paid bookings that need explicit barber approval.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Get Confirmed Bookings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/status?status=confirmed',
        description: 'Lists confirmed bookings. Paid bookings move through awaiting_confirmation before barber confirmation.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '6. Confirm Booking',
      ...request({
        method: 'PATCH',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id_status}}/confirm',
        description: 'Barber explicitly confirms a booking, moving it from awaiting_confirmation to confirmed status.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '7. Update Booking Status',
      ...request({
        method: 'PUT',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id_status}}/status',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: jsonBody(`{\n  "status": "completed"\n}`),
        description: 'Updates the captured booking status. Use `booking_id_status`, not the delete-only booking ID.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '8. Cancel Paid Booking (Terminal)',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{booking_id_delete}}/cancel',
        description: 'Cancels a paid booking only when the booking is still awaiting confirmation.',
        event: testEvent(
          "pm.test('status is 200 or 400', function () { pm.expect(pm.response.code).to.be.oneOf([200, 400]); });",
          "if (pm.response.code === 200) { pm.collectionVariables.unset('booking_id_delete'); }"
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
      textVariable('photo_id', ''),
    ),
  ],
  item: [
    {
      name: '1. Get All Photos And Capture Existing ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/photos',
        description: 'Lists the current gallery and captures the first photo ID. Barber onboarding already creates three gallery photos.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const photos = Array.isArray(response.data && response.data.items) ? response.data.items : [];",
          "const firstPhoto = photos[0];",
          "if (firstPhoto && firstPhoto._id) { pm.collectionVariables.set('photo_id', firstPhoto._id); pm.globals.set('shared_photo_id', firstPhoto._id); }"
        ),
      }),
    },
    {
      name: '2. Upload Photos',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/photos',
        body: formDataBody([
          fileField('photos', 'Attach photo file manually in Postman'),
          textField('photoType', 'shop_interior'),
          textField('description', 'Uploaded from the automated Postman photo collection'),
        ]),
        description: 'Uploads one gallery image using the local sample file and captures the new photo ID.',
        event: testEvent(
          "pm.test('status is 201', function () { pm.response.to.have.status(201); });",
          "const response = pm.response.json();",
          "const photos = Array.isArray(response.data) ? response.data : [];",
          "const firstPhoto = photos[0];",
          "if (firstPhoto && firstPhoto._id) { pm.collectionVariables.set('photo_id', firstPhoto._id); pm.globals.set('shared_photo_id', firstPhoto._id); }"
        ),
      }),
    },
    {
      name: '3. Get Photo Stats',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/photos/stats',
        description: 'Returns photo counts and storage totals.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '4. Get Photo By ID',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/photos/{{photo_id}}',
        description: 'Reads the currently captured photo record.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '5. Delete Photo (Terminal)',
      ...request({
        method: 'DELETE',
        url: '{{base_url}}/{{api_prefix}}/photos/{{photo_id}}',
        description: 'Deletes the captured photo from both MongoDB and Cloudinary. Run this last if later requests still need the shared photo ID.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.unset('photo_id');",
          "pm.globals.unset('shared_photo_id');"
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
  variable: [...baseVariables()],
  item: [
    {
      name: '1. Get Earnings',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/earnings',
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
          "const ratings = Array.isArray(response.data && response.data.items) ? response.data.items : [];",
          "const capture = (variableName, marker) => {",
          "  const match = ratings.find((item) => typeof item.review === 'string' && item.review.includes(marker));",
          "  const ratingId = match && (match.ratingId || match._id);",
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
        url: '{{base_url}}/{{api_prefix}}/ratings/summary',
        description: 'Returns aggregate rating metrics for the authenticated barber shop.',
        event: testEvent("pm.test('status is 200', function () { pm.response.to.have.status(200); });"),
      }),
    },
    {
      name: '3. Add Reply',
      ...request({
        method: 'POST',
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
    description: 'Native PhonePe SDK payment initiation/verification, webhook simulation with automatic signature generation, refund processing, and payout retry for the EverCut dual-provider payment system. PhonePe is used for customer collection; Cashfree Payouts is used for barber disbursement. Webhook requests include pre-request scripts that automatically compute cryptographic signatures (SHA256 for PhonePe, HMAC-SHA256 for Cashfree) using environment variables.',
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
      ['payout_transfer_id', 'payout_transfer_id'],
      ['admin_access_token', 'admin_access_token'],
      ['phonepe_webhook_username', 'phonepe_webhook_username'],
      ['phonepe_webhook_password', 'phonepe_webhook_password'],
      ['cashfree_webhook_secret', 'cashfree_webhook_secret'],
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
      textVariable('payout_transfer_id', '', 'Payout transfer ID from MongoDB - required for payout webhook simulation'),
      textVariable('phonepe_webhook_username', 'test-phonepe-webhook-user', 'PhonePe webhook username - must match PHONEPE_WEBHOOK_USERNAME in .env'),
      textVariable('phonepe_webhook_password', 'test-phonepe-webhook-password', 'PhonePe webhook password - must match PHONEPE_WEBHOOK_PASSWORD in .env'),
      textVariable('cashfree_webhook_secret', 'test-cashfree-client-secret', 'Cashfree webhook secret - must match CASHFREE_PAYOUT_CLIENT_SECRET in .env'),
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
        description: 'Creates a PhonePe native SDK checkout order for the authenticated customer\'s pending booking. The response returns orderId, token, merchantId, merchantOrderId, and paymentId for the Flutter PhonePe SDK. No redirect URL is returned.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "pm.test('captures native payment references', function () {",
          "  const response = pm.response.json();",
          "  pm.expect(response.success).to.equal(true);",
          "  pm.expect(response.data).to.have.property('paymentId');",
          "  pm.expect(response.data).to.have.property('merchantOrderId');",
          "  pm.expect(response.data).to.have.property('orderId');",
          "  pm.expect(response.data).to.have.property('token');",
          "  pm.expect(response.data).to.have.property('merchantId');",
          "  pm.expect(response.data).to.not.have.property('redirectUrl');",
          "  pm.collectionVariables.set('payment_id', response.data.paymentId);",
          "  pm.collectionVariables.set('merchant_order_id', response.data.merchantOrderId);",
          "  pm.globals.set('payment_id', response.data.paymentId);",
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
      name: '5. Get Payment By Booking',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{payment_booking_id}}/payment',
        auth: bearerAuth('customer_access_token'),
        description: 'Returns the latest payment transaction for the authenticated customer\'s booking.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "if (data._id) {",
          "  pm.collectionVariables.set('payment_id', data._id);",
          "  pm.globals.set('payment_id', data._id);",
          "}",
          "if (data.merchantOrderId) {",
          "  pm.collectionVariables.set('merchant_order_id', data.merchantOrderId);",
          "  pm.globals.set('merchant_order_id', data.merchantOrderId);",
          "}"
        ),
      }),
    },
    {
      name: '5. Initiate Refund',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/bookings/{{payment_booking_id}}/refund',
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
          "  if (response.data?._id) {",
          "    pm.collectionVariables.set('payout_id', response.data._id);",
          "    pm.globals.set('payout_id', response.data._id);",
          "  }",
          "});"
        ),
      }),
    },
    {
      name: '7. PhonePe Payment Success Webhook',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payments/webhook',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: '{{phonepe_webhook_authorization}}' },
        ],
        body: jsonBody(`{\n  "event": "checkout.order.completed",\n  "payload": {\n    "merchantOrderId": "{{merchant_order_id}}",\n    "orderId": "PO{{$timestamp}}",\n    "state": "COMPLETED",\n    "amount": 30300,\n    "paymentDetails": [\n      {\n        "paymentMode": "UPI",\n        "transactionId": "TXN{{$timestamp}}",\n        "amount": 30300,\n        "state": "COMPLETED"\n      }\n    ]\n  }\n}`),
        description: 'Simulates a PhonePe payment success webhook. The pre-request script computes the SHA256 signature using webhook credentials from environment variables. Backend verifies signature, then calls PhonePe Order Status API for double verification.',
        event: mergedEvents(
          [
            "// Compute PhonePe webhook authorization signature",
            "const username = pm.collectionVariables.get('phonepe_webhook_username') || pm.environment.get('phonepe_webhook_username') || 'test-phonepe-webhook-user';",
            "const password = pm.collectionVariables.get('phonepe_webhook_password') || pm.environment.get('phonepe_webhook_password') || 'test-phonepe-webhook-password';",
            "const authString = username + ':' + password;",
            "const authSignature = CryptoJS.SHA256(authString).toString(CryptoJS.enc.Hex);",
            "pm.collectionVariables.set('phonepe_webhook_authorization', authSignature);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('webhook acknowledged', function () {",
            "  const response = pm.response.json();",
            "  pm.expect(response).to.have.property('received');",
            "  pm.expect(response.received).to.equal(true);",
            "});"
          ]
        ),
      }),
    },
    {
      name: '8. PhonePe Payment Failure Webhook',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payments/webhook',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: '{{phonepe_webhook_authorization}}' },
        ],
        body: jsonBody(`{\n  "event": "checkout.order.failed",\n  "payload": {\n    "merchantOrderId": "{{merchant_order_id}}",\n    "orderId": "PO{{$timestamp}}",\n    "state": "FAILED",\n    "amount": 30300,\n    "paymentDetails": [\n      {\n        "paymentMode": "UPI",\n        "state": "FAILED",\n        "errorCode": "PAYMENT_DECLINED",\n        "detailedErrorCode": "INSUFFICIENT_FUNDS"\n      }\n    ]\n  }\n}`),
        description: 'Simulates a PhonePe payment failure webhook. Use this to test payment failure handling and booking cancellation logic.',
        event: mergedEvents(
          [
            "// Compute PhonePe webhook authorization signature",
            "const username = pm.collectionVariables.get('phonepe_webhook_username') || pm.environment.get('phonepe_webhook_username') || 'test-phonepe-webhook-user';",
            "const password = pm.collectionVariables.get('phonepe_webhook_password') || pm.environment.get('phonepe_webhook_password') || 'test-phonepe-webhook-password';",
            "const authString = username + ':' + password;",
            "const authSignature = CryptoJS.SHA256(authString).toString(CryptoJS.enc.Hex);",
            "pm.collectionVariables.set('phonepe_webhook_authorization', authSignature);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('webhook acknowledged', function () {",
            "  const response = pm.response.json();",
            "  pm.expect(response).to.have.property('received');",
            "  pm.expect(response.received).to.equal(true);",
            "});"
          ]
        ),
      }),
    },
    {
      name: '9. PhonePe Refund Completed Webhook',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payments/webhook',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: '{{phonepe_webhook_authorization}}' },
        ],
        body: jsonBody(`{\n  "event": "pg.refund.completed",\n  "payload": {\n    "merchantRefundId": "{{merchant_refund_id}}",\n    "refundId": "{{refund_id}}",\n    "originalMerchantOrderId": "{{merchant_order_id}}",\n    "state": "COMPLETED",\n    "amount": 29000\n  }\n}`),
        description: 'Simulates a PhonePe refund completion webhook. Use this after initiating a refund to test refund success handling.',
        event: mergedEvents(
          [
            "// Compute PhonePe webhook authorization signature",
            "const username = pm.collectionVariables.get('phonepe_webhook_username') || pm.environment.get('phonepe_webhook_username') || 'test-phonepe-webhook-user';",
            "const password = pm.collectionVariables.get('phonepe_webhook_password') || pm.environment.get('phonepe_webhook_password') || 'test-phonepe-webhook-password';",
            "const authString = username + ':' + password;",
            "const authSignature = CryptoJS.SHA256(authString).toString(CryptoJS.enc.Hex);",
            "pm.collectionVariables.set('phonepe_webhook_authorization', authSignature);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('webhook acknowledged', function () {",
            "  const response = pm.response.json();",
            "  pm.expect(response).to.have.property('received');",
            "  pm.expect(response.received).to.equal(true);",
            "});"
          ]
        ),
      }),
    },
    {
      name: '10. Cashfree Transfer Success Webhook',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payouts/webhook',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'x-webhook-timestamp', value: '{{cashfree_webhook_timestamp}}' },
          { key: 'x-webhook-signature', value: '{{cashfree_webhook_signature}}' },
        ],
        body: jsonBody(`{\n  "event": "TRANSFER_SUCCESS",\n  "data": {\n    "transfer": {\n      "transfer_id": "{{payout_transfer_id}}",\n      "cf_transfer_id": "CF{{$timestamp}}",\n      "status": "SUCCESS",\n      "transfer_utr": "UTR{{$timestamp}}",\n      "transfer_amount": 450,\n      "transfer_mode": "upi",\n      "acknowledged": 1,\n      "processed_on": "{{$isoTimestamp}}"\n    }\n  }\n}`),
        description: 'Simulates a Cashfree payout success webhook. The pre-request script computes the HMAC-SHA256 signature using timestamp + body + secret. Backend verifies signature, then updates payout and booking status.',
        event: mergedEvents(
          [
            "// Compute Cashfree webhook HMAC signature",
            "const secret = pm.collectionVariables.get('cashfree_webhook_secret') || pm.environment.get('cashfree_webhook_secret') || 'test-cashfree-client-secret';",
            "const timestamp = Math.floor(Date.now() / 1000).toString();",
            "pm.collectionVariables.set('cashfree_webhook_timestamp', timestamp);",
            "",
            "// Get the transfer ID",
            "const transferId = pm.collectionVariables.get('payout_transfer_id') || pm.environment.get('payout_transfer_id') || 'PAYOUT_test_' + Date.now();",
            "",
            "// Build the raw body",
            "const bodyObj = {",
            "  event: 'TRANSFER_SUCCESS',",
            "  data: {",
            "    transfer: {",
            "      transfer_id: transferId,",
            "      cf_transfer_id: 'CF' + Date.now(),",
            "      status: 'SUCCESS',",
            "      transfer_utr: 'UTR' + Date.now(),",
            "      transfer_amount: 450,",
            "      transfer_mode: 'upi',",
            "      acknowledged: 1,",
            "      processed_on: new Date().toISOString()",
            "    }",
            "  }",
            "};",
            "const rawBody = JSON.stringify(bodyObj);",
            "",
            "// Compute HMAC signature: HMAC-SHA256(timestamp + rawBody, secret)",
            "const signaturePayload = timestamp + rawBody;",
            "const signature = CryptoJS.HmacSHA256(signaturePayload, secret).toString(CryptoJS.enc.Base64);",
            "pm.collectionVariables.set('cashfree_webhook_signature', signature);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('webhook acknowledged', function () {",
            "  const response = pm.response.json();",
            "  pm.expect(response).to.have.property('received');",
            "  pm.expect(response.received).to.equal(true);",
            "});"
          ]
        ),
      }),
    },
    {
      name: '11. Cashfree Transfer Failed Webhook',
      ...request({
        method: 'POST',
        url: '{{base_url}}/{{api_prefix}}/payouts/webhook',
        auth: { type: 'noauth' },
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'x-webhook-timestamp', value: '{{cashfree_webhook_timestamp}}' },
          { key: 'x-webhook-signature', value: '{{cashfree_webhook_signature}}' },
        ],
        body: jsonBody(`{\n  "event": "TRANSFER_FAILED",\n  "data": {\n    "transfer": {\n      "transfer_id": "{{payout_transfer_id}}",\n      "cf_transfer_id": "CF{{$timestamp}}",\n      "status": "FAILED",\n      "failure_reason": "INVALID_VPA",\n      "transfer_amount": 450,\n      "transfer_mode": "upi",\n      "acknowledged": 1\n    }\n  }\n}`),
        description: 'Simulates a Cashfree payout failure webhook. Use this to test payout failure handling and retry logic.',
        event: mergedEvents(
          [
            "// Compute Cashfree webhook HMAC signature",
            "const secret = pm.collectionVariables.get('cashfree_webhook_secret') || pm.environment.get('cashfree_webhook_secret') || 'test-cashfree-client-secret';",
            "const timestamp = Math.floor(Date.now() / 1000).toString();",
            "pm.collectionVariables.set('cashfree_webhook_timestamp', timestamp);",
            "",
            "const transferId = pm.collectionVariables.get('payout_transfer_id') || pm.environment.get('payout_transfer_id') || 'PAYOUT_test_' + Date.now();",
            "",
            "const bodyObj = {",
            "  event: 'TRANSFER_FAILED',",
            "  data: {",
            "    transfer: {",
            "      transfer_id: transferId,",
            "      cf_transfer_id: 'CF' + Date.now(),",
            "      status: 'FAILED',",
            "      failure_reason: 'INVALID_VPA',",
            "      transfer_amount: 450,",
            "      transfer_mode: 'upi',",
            "      acknowledged: 1",
            "    }",
            "  }",
            "};",
            "const rawBody = JSON.stringify(bodyObj);",
            "",
            "const signaturePayload = timestamp + rawBody;",
            "const signature = CryptoJS.HmacSHA256(signaturePayload, secret).toString(CryptoJS.enc.Base64);",
            "pm.collectionVariables.set('cashfree_webhook_signature', signature);"
          ],
          [
            "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
            "pm.test('webhook acknowledged', function () {",
            "  const response = pm.response.json();",
            "  pm.expect(response).to.have.property('received');",
            "  pm.expect(response.received).to.equal(true);",
            "});"
          ]
        ),
      }),
    },
  ],
};

const dashboardCollection = {
  info: {
    name: 'EverCut - Dashboard Analytics',
    description: 'Dashboard analytics collection for barber shop owners. Provides real-time occupancy metrics, staff availability, and today\'s queue through resource-based endpoints. All endpoints require BARBER role authentication. NOTE: Endpoints have been refactored from /dashboard/* to resource-based routes.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearerAuth('barber_access_token'),
  event: collectionPreRequest(),
  variable: [...baseVariables()],
  item: [
    {
      name: '1. Get Dashboard Overview (Aggregated)',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/earnings/overview',
        description: 'Returns all dashboard sections in a single response: pulse metrics, staff availability, and today\'s queue. Optimized for efficient dashboard loading. NEW ENDPOINT: Moved from /dashboard/overview to /earnings/overview.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes pulse', function () { pm.expect(data).to.have.property('pulse'); });",
          "pm.test('response includes staff', function () { pm.expect(data).to.have.property('staff'); });",
          "pm.test('response includes queue', function () { pm.expect(data).to.have.property('queue'); });"
        ),
      }),
    },
    {
      name: '2. Get Today\'s Pulse (Bookings)',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/stats/today',
        description: 'Returns real-time occupancy metrics and booking status breakdown for today. Shows booked vs total capacity and counts for All, Pending, Done, and Cancelled bookings. NEW ENDPOINT: Moved from /dashboard/pulse to /bookings/stats/today.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes occupancy', function () { pm.expect(data).to.have.property('occupancy'); });",
          "pm.test('response includes statusBreakdown', function () { pm.expect(data).to.have.property('statusBreakdown'); });",
          "if (data.occupancy) {",
          "  pm.test('occupancy has required fields', function () {",
          "    pm.expect(data.occupancy).to.have.property('booked');",
          "    pm.expect(data.occupancy).to.have.property('total');",
          "    pm.expect(data.occupancy).to.have.property('percentage');",
          "  });",
          "}"
        ),
      }),
    },
    {
      name: '3. Get Staff Availability (Employees)',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/employees/availability',
        description: 'Returns staff availability and progress tracking for today. Shows each employee\'s completed vs total appointments with progress percentage. NEW ENDPOINT: Moved from /dashboard/staff to /employees/availability.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes staff array', function () { pm.expect(data).to.have.property('staff'); });",
          "pm.test('response includes totalStaff', function () { pm.expect(data).to.have.property('totalStaff'); });",
          "if (Array.isArray(data.staff) && data.staff.length > 0) {",
          "  const firstStaff = data.staff[0];",
          "  pm.test('staff item has required fields', function () {",
          "    pm.expect(firstStaff).to.have.property('employeeId');",
          "    pm.expect(firstStaff).to.have.property('name');",
          "    pm.expect(firstStaff).to.have.property('progress');",
          "  });",
          "}"
        ),
      }),
    },
    {
      name: '4. Get Today\'s Queue - Active (Bookings)',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/queue?filter=active',
        description: 'Returns today\'s active appointments (within ±30 minutes of current time). Shows customer name, employee name, time, and services. NEW ENDPOINT: Moved from /dashboard/queue to /bookings/queue.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes filter', function () { pm.expect(data).to.have.property('filter'); });",
          "pm.test('response includes active', function () { pm.expect(data).to.have.property('active'); });",
          "pm.test('response includes upcoming', function () { pm.expect(data).to.have.property('upcoming'); });",
          "pm.test('filter is active', function () { pm.expect(data.filter).to.equal('active'); });"
        ),
      }),
    },
    {
      name: '5. Get Today\'s Queue - Upcoming (Bookings)',
      ...request({
        method: 'GET',
        url: '{{base_url}}/{{api_prefix}}/bookings/queue?filter=upcoming',
        description: 'Returns today\'s upcoming appointments (more than 30 minutes in the future). Shows customer name, employee name, time, and services. NEW ENDPOINT: Moved from /dashboard/queue to /bookings/queue.',
        event: testEvent(
          "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
          "const response = pm.response.json();",
          "const data = response.data || {};",
          "pm.test('response includes filter', function () { pm.expect(data).to.have.property('filter'); });",
          "pm.test('response includes active', function () { pm.expect(data).to.have.property('active'); });",
          "pm.test('response includes upcoming', function () { pm.expect(data).to.have.property('upcoming'); });",
          "pm.test('filter is upcoming', function () { pm.expect(data.filter).to.equal('upcoming'); });"
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
    { key: 'phonepe_webhook_username', value: 'test-phonepe-webhook-user', enabled: true },
    { key: 'phonepe_webhook_password', value: 'test-phonepe-webhook-password', enabled: true },
    { key: 'cashfree_webhook_secret', value: 'test-cashfree-client-secret', enabled: true },
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
writeCollection('11-barber-photos.json', barberPhotosCollection);
writeCollection('12-barber-earnings.json', barberEarningsCollection);
writeCollection('13-barber-ratings.json', barberRatingsCollection);
writeCollection('14-dashboard.json', dashboardCollection);
writeCollection('15-payments-payouts.json', paymentsPayoutsCollection);
writeFileSync(resolve(COLLECTIONS_DIR, 'EverCut.postman_environment.json'), `${JSON.stringify(environmentTemplate, null, 2)}\n`);
