const assert = require('assert');
const smsEthiopia = require('../server/src/services/smsEthiopia.service');

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING REAL SMSETHIOPIA API v2 GATEWAY SERVICE');
  console.log('====================================================\n');

  // Test 1: Phone Normalization
  console.log('1. Testing Phone Normalization:');
  const n1 = smsEthiopia.normalizeMsisdn('0911234567');
  assert.strictEqual(n1.isValid, true, '0911234567 should be valid');
  assert.strictEqual(n1.msisdn, '251911234567', '0911234567 normalized to 251911234567');
  console.log('  ✓ 0911234567 ->', n1.msisdn);

  const n2 = smsEthiopia.normalizeMsisdn('+251911234567');
  assert.strictEqual(n2.isValid, true, '+251911234567 should be valid');
  assert.strictEqual(n2.msisdn, '251911234567', '+251911234567 normalized to 251911234567');
  console.log('  ✓ +251911234567 ->', n2.msisdn);

  const n3 = smsEthiopia.normalizeMsisdn('911234567');
  assert.strictEqual(n3.isValid, true, '911234567 should be valid');
  assert.strictEqual(n3.msisdn, '251911234567', '911234567 normalized to 251911234567');
  console.log('  ✓ 911234567 ->', n3.msisdn);

  const n4 = smsEthiopia.normalizeMsisdn('12345');
  assert.strictEqual(n4.isValid, false, 'Invalid short number should fail validation');
  console.log('  ✓ Invalid number correctly rejected:', n4.reason);

  // Test 2: Character and Segment Calculation
  console.log('\n2. Testing Segment Calculations:');
  const gsm1 = smsEthiopia.calculateSegments('Lake Side Academy notice');
  assert.strictEqual(gsm1, 1, 'Short GSM should be 1 segment');
  console.log('  ✓ Short GSM (160 max):', gsm1, 'segment');

  const amharic1 = smsEthiopia.calculateSegments('ሌክ ሳይድ አካዳሚ የውጤት መግለጫ');
  assert.strictEqual(amharic1, 1, 'Short Amharic Unicode should be 1 segment');
  console.log('  ✓ Short Amharic (70 max):', amharic1, 'segment');

  // Test 3: Gateway Health Check
  console.log('\n3. Testing Gateway Connection Status:');
  const conn = await smsEthiopia.testGatewayConnection();
  console.log('  ✓ Gateway Connection Info:', JSON.stringify(conn));
  assert.strictEqual(conn.status, 'ONLINE');
  assert.strictEqual(conn.apiKeyConfigured, true);

  // Test 4: Live SMSEthiopia API v2 Send Call
  console.log('\n4. Testing Live SMSEthiopia API v2 Send:');
  const sendRes = await smsEthiopia.sendSms('0911234567', 'Lake Side Academy Test Verification');
  console.log('  ✓ Gateway Send Response:', JSON.stringify(sendRes));
  assert.strictEqual(sendRes.sent, true, 'Live gateway send must return sent: true');
  assert.ok(sendRes.id, 'Live gateway must return unique ULID id');
  assert.strictEqual(sendRes.msisdn, '251911234567');

  // Test 5: Live Status Lookup
  console.log('\n5. Testing Live Status Lookup:');
  const statusRes = await smsEthiopia.getMessageStatus(sendRes.id);
  console.log('  ✓ Gateway Status Response for ID ' + sendRes.id + ':', JSON.stringify(statusRes));
  assert.strictEqual(statusRes.success, true);
  assert.ok(['ACCEPTED', 'SENT', 'DELIVERED'].includes(statusRes.status));

  console.log('\n====================================================');
  console.log('  ALL SMSETHIOPIA LIVE API TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
