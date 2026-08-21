import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mock_db.js';

export class PaymentController {
  /**
   * Get wallet balance, saved cards and transactions
   * GET /api/v1/payments/wallet
   */
  static getWallet(req, res) {
    const userId = req.query.userId || 'usr-001';
    const user = db.users.find((u) => u.id === userId) || db.users[0];
    const cards = db.cards.filter((c) => c.userId === userId);
    const transactions = db.transactions.filter((t) => t.userId === userId);

    return res.json({
      success: true,
      walletBalance: user.walletBalance,
      cards,
      transactions,
    });
  }

  /**
   * Top up wallet balance (Payme / Click simulation)
   * POST /api/v1/payments/topup
   */
  static topUp(req, res) {
    const { userId = 'usr-001', amount, method = 'payme' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Miqdor noto\'g\'ri' });
    }

    const user = db.users.find((u) => u.id === userId) || db.users[0];
    user.walletBalance += parseFloat(amount);

    const tx = {
      id: `tx-${uuidv4().substring(0, 8)}`,
      userId,
      title: `Hamyonni to'ldirish (${method.toUpperCase()})`,
      amount: parseFloat(amount),
      type: 'topup',
      date: new Date().toISOString(),
      status: 'completed',
    };
    db.transactions.unshift(tx);

    return res.json({
      success: true,
      message: 'Hamyon muvaffaqiyatli to\'ldirildi',
      walletBalance: user.walletBalance,
      transaction: tx,
    });
  }

  /**
   * Add a new payment card
   * POST /api/v1/payments/cards
   */
  static addCard(req, res) {
    const { userId = 'usr-001', cardNumber, expireDate, cardHolder = '' } = req.body;
    if (!cardNumber || cardNumber.length < 16) {
      return res.status(400).json({ success: false, message: 'Karta raqami 16 ta raqamdan iborat bo\'lishi kerak' });
    }

    const cleanNumber = cardNumber.replace(/\s+/g, '');
    const isUzcard = cleanNumber.startsWith('8600');
    const isHumo = cleanNumber.startsWith('9860');

    const card = {
      id: `crd-${uuidv4().substring(0, 8)}`,
      userId,
      cardNumberMasked: `${cleanNumber.substring(0, 4)} •••• •••• ${cleanNumber.substring(12, 16)}`,
      cardType: isUzcard ? 'Uzcard' : isHumo ? 'Humo' : 'Visa/MasterCard',
      bankName: isUzcard ? 'Milliy Bank' : 'Ipak Yo\'li Bank',
      expireDate: expireDate || '12/28',
      isDefault: db.cards.length === 0,
      balance: 500000,
    };

    db.cards.push(card);

    return res.json({
      success: true,
      message: 'Karta muvaffaqiyatli saqlandi',
      card,
    });
  }
}
