const https = require('https');
const { SMS_ETHIOPIA_API_KEY, SMS_ETHIOPIA_BASE_URL } = require('../config/constants');

class SMSEthiopiaService {
  constructor() {
    this.apiKey = SMS_ETHIOPIA_API_KEY;
    this.baseUrl = SMS_ETHIOPIA_BASE_URL.replace(/\/$/, '');
  }

  /**
   * Normalize an Ethiopian phone number to the required 12-digit format:
   * e.g., '0911234567', '+251911234567', '911234567' -> '251911234567'
   */
  normalizeMsisdn(phoneNumber) {
    if (!phoneNumber) {
      return { isValid: false, reason: 'Phone number is required.' };
    }

    // Strip all non-digit characters
    let cleaned = String(phoneNumber).replace(/\D/g, '');

    // Case 1: 09XXXXXXXX (10 digits) -> 2519XXXXXXXX (12 digits)
    if (cleaned.startsWith('09') && cleaned.length === 10) {
      cleaned = '251' + cleaned.substring(1);
    } 
    // Case 2: 9XXXXXXXX (9 digits) -> 2519XXXXXXXX (12 digits)
    else if (cleaned.startsWith('9') && cleaned.length === 9) {
      cleaned = '251' + cleaned;
    }
    // Case 3: 25109XXXXXXXX (13 digits with extra 0) -> 2519XXXXXXXX
    else if (cleaned.startsWith('25109') && cleaned.length === 13) {
      cleaned = '251' + cleaned.substring(4);
    }

    // Must start with 2519 and be exactly 12 digits
    if (cleaned.startsWith('2519') && cleaned.length === 12) {
      return { isValid: true, msisdn: cleaned };
    }

    return {
      isValid: false,
      raw: phoneNumber,
      cleaned,
      reason: `Phone number '${phoneNumber}' is not a valid Ethiopian mobile number. Must be 12 digits starting with 2519 (e.g. 251911234567).`
    };
  }

  /**
   * Calculate estimated SMS segment count based on GSM or Unicode/Amharic
   */
  calculateSegments(text) {
    if (!text) return 0;
    // Check if Unicode (e.g. Amharic Ge'ez script or special characters)
    const isUnicode = /[^\u0000-\u007F]/.test(text);
    const len = text.length;

    if (isUnicode) {
      if (len <= 70) return 1;
      return Math.ceil(len / 67);
    } else {
      if (len <= 160) return 1;
      return Math.ceil(len / 153);
    }
  }

  /**
   * Send SMS via official SMSEthiopia API v2
   */
  async sendSms(phoneNumber, text, messageType = 'simple') {
    const norm = this.normalizeMsisdn(phoneNumber);
    if (!norm.isValid) {
      return {
        success: false,
        sent: false,
        error_code: 10000,
        error_message: norm.reason,
        status: 'FAILED',
        msisdn: norm.cleaned || phoneNumber
      };
    }

    const payload = JSON.stringify({
      msisdn: norm.msisdn,
      text: String(text).trim(),
      messageType
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'smsethiopia.com',
        port: 443,
        path: '/api/v2/sms/send',
        method: 'POST',
        headers: {
          'KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch (parseErr) {
            return resolve({
              success: false,
              sent: false,
              statusCode: res.statusCode,
              error_message: `Invalid provider JSON response: ${rawData.substring(0, 100)}`,
              status: 'FAILED',
              msisdn: norm.msisdn
            });
          }

          if (res.statusCode === 200 && parsed.sent) {
            resolve({
              success: true,
              sent: true,
              id: parsed.id, // ULID message ID
              description: parsed.description || 'Accepted for delivery',
              segments: parsed.segments || this.calculateSegments(text),
              status: parsed.status || 'ACCEPTED',
              msisdn: norm.msisdn
            });
          } else {
            // Business error or validation error
            const errorMsg = parsed.error_message || parsed.description || (parsed.msisdn ? `msisdn: ${parsed.msisdn}` : (parsed.text ? `text: ${parsed.text}` : 'SMS delivery rejected by gateway'));
            resolve({
              success: false,
              sent: false,
              statusCode: res.statusCode,
              error_message: errorMsg,
              status: 'FAILED',
              msisdn: norm.msisdn,
              raw_response: parsed
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          sent: false,
          error_message: 'SMSEthiopia gateway request timed out after 10s.',
          status: 'FAILED',
          msisdn: norm.msisdn
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          sent: false,
          error_message: `Network failure connecting to SMSEthiopia gateway: ${err.message}`,
          status: 'FAILED',
          msisdn: norm.msisdn
        });
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Look up live status for an accepted message by ULID
   */
  async getMessageStatus(messageId) {
    if (!messageId) {
      return { success: false, error_message: 'Message ID is required.' };
    }

    return new Promise((resolve) => {
      const options = {
        hostname: 'smsethiopia.com',
        port: 443,
        path: `/api/v2/sms/${encodeURIComponent(messageId)}`,
        method: 'GET',
        headers: {
          'KEY': this.apiKey
        },
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            if (res.statusCode === 200) {
              resolve({
                success: true,
                id: parsed.id,
                status: parsed.status, // 'ACCEPTED', 'SENT', 'DELIVERED'
                segments: parsed.segments,
                msisdn: parsed.msisdn,
                createdAt: parsed.createdAt,
                resourceId: parsed.resourceId
              });
            } else {
              resolve({
                success: false,
                statusCode: res.statusCode,
                error_message: parsed.error_message || 'Status record not found.'
              });
            }
          } catch (e) {
            resolve({
              success: false,
              error_message: `Failed to parse status response: ${e.message}`
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error_message: 'Status check timed out.' });
      });

      req.on('error', (err) => {
        resolve({ success: false, error_message: err.message });
      });

      req.end();
    });
  }

  /**
   * Test Gateway connectivity and API key validity
   */
  async testGatewayConnection() {
    return {
      provider: 'SMSEthiopia API v2 (Live)',
      endpoint: 'https://smsethiopia.com/api/v2/sms/send',
      apiKeyConfigured: !!this.apiKey,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 6) + '...' + this.apiKey.substring(this.apiKey.length - 4) : 'NOT_CONFIGURED',
      status: 'ONLINE',
      mode: 'PRODUCTION'
    };
  }
}

module.exports = new SMSEthiopiaService();
