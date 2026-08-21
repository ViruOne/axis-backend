import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/app_config.js';
import { db } from '../data/mock_db.js';
import { SmsService } from '../services/sms_service.js';

export class AuthController {
  /**
   * Send SMS OTP to phone number
   * POST /api/v1/auth/send-otp
   */
  static async sendOtp(req, res) {
    const { phone } = req.body;
    if (!phone || phone.length < 9) {
      return res.status(400).json({ success: false, message: 'Telefon raqam noto\'g\'ri kiritildi' });
    }

    const { code, expiresAt } = SmsService.generateOtp(phone);
    db.otpCodes.set(phone, { code, expiresAt });

    await SmsService.sendSms(phone, code);

    return res.json({
      success: true,
      message: 'Tasdiqlash kodi yuborildi',
      devOtpCode: code, // Convenient for automated testing/demo
    });
  }

  /**
   * Verify SMS OTP and return JWT token + user profile
   * POST /api/v1/auth/verify-otp
   */
  static async verifyOtp(req, res) {
    const { phone, code, role = 'passenger', name = 'Foydalanuvchi' } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Telefon raqam va kod talab qilinadi' });
    }

    const record = db.otpCodes.get(phone);
    // Allow master test code '7777' or valid OTP
    const isValid = code === '7777' || (record && record.code === code && record.expiresAt > Date.now());

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Tasdiqlash kodi noto\'g\'ri yoki muddati o\'tgan' });
    }

    // Clear used OTP
    db.otpCodes.delete(phone);

    // Find or create user
    let user = db.users.find((u) => u.phone === phone);
    if (!user) {
      user = {
        id: `usr-${uuidv4().substring(0, 8)}`,
        phone,
        name,
        rating: 5.0,
        walletBalance: 50000, // Welcome bonus 50,000 UZS
        role,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Muvaffaqiyatli tizimga kirildi',
      token,
      user,
    });
  }

  /**
   * Get authenticated user profile
   * GET /api/v1/auth/profile
   */
  static async getProfile(req, res) {
    const userId = req.userId || 'usr-001';
    const user = db.users.find((u) => u.id === userId) || db.users[0];

    return res.json({
      success: true,
      user,
    });
  }
}
