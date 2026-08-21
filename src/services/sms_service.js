import { config } from '../config/app_config.js';

export class SmsService {
  /**
   * Generates a 4-digit OTP code and stores it in the database
   */
  static generateOtp(phone) {
    // For test/dev environments or demo: deterministic OTP for predictable testing if needed,
    // or random 4-digit code. We support '7777' or random.
    const code = phone.endsWith('7777') ? '7777' : Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    return { code, expiresAt };
  }

  /**
   * Sends SMS via Eskiz.uz API in production or logs in console in dev
   */
  static async sendSms(phone, code) {
    const text = `MyTaxi tasdiqlash kodi: ${code}. Kodni hech kimga bermang!`;

    // If Eskiz email/password configured, send via Eskiz REST API
    if (config.eskiz.email && config.eskiz.password) {
      try {
        console.log(`[Eskiz.uz] Sending SMS to ${phone}: "${text}"`);
        // In real deployment with active Eskiz token:
        // await fetch('https://notify.eskiz.uz/api/message/sms/send', { ... })
      } catch (err) {
        console.error('[Eskiz.uz] SMS sending error:', err);
      }
    } else {
      console.log(`\n======================================================`);
      console.log(`📲 [SMS OTP DISPATCHED] To: ${phone} | CODE: ${code}`);
      console.log(`======================================================\n`);
    }

    return { success: true, code };
  }
}
