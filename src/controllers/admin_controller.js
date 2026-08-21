import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mock_db.js';

export class AdminController {
  /**
   * Get overall system stats & financial summary
   * GET /api/v1/admin/stats
   */
  static getStats(req, res) {
    const totalDrivers = db.drivers.length;
    const onlineDrivers = db.drivers.filter((d) => d.isOnline).length;
    const totalOrders = db.orders.length;
    const completedOrders = db.orders.filter((o) => o.status === 'completed').length;

    // Total revenue & commission
    const totalRevenue = db.orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + (o.finalPrice || 0), 0);
    const totalCommissionEarned = Math.round(totalRevenue * 0.12);

    const totalDriverBalance = db.drivers.reduce((sum, d) => sum + (d.balance || 0), 0);

    return res.json({
      success: true,
      stats: {
        totalDrivers,
        onlineDrivers,
        totalOrders,
        completedOrders,
        totalRevenue,
        totalCommissionEarned,
        totalDriverBalance,
        commissionRate: 0.12, // 12%
        minBalanceToWork: 10000, // 10,000 UZS
      },
    });
  }

  /**
   * Get all registered drivers (with search & filters)
   * GET /api/v1/admin/drivers
   */
  static getDrivers(req, res) {
    const { search = '', tariff = '', isOnline } = req.query;

    let filtered = [...db.drivers];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.licensePlate.toLowerCase().includes(q) ||
          d.carModel.toLowerCase().includes(q)
      );
    }

    if (tariff) {
      filtered = filtered.filter((d) => d.tariffId === tariff);
    }

    if (isOnline !== undefined) {
      const onlineBool = isOnline === 'true';
      filtered = filtered.filter((d) => d.isOnline === onlineBool);
    }

    return res.json({
      success: true,
      count: filtered.length,
      drivers: filtered,
    });
  }

  /**
   * Register a new driver from Admin Panel
   * POST /api/v1/admin/drivers/register
   */
  static registerDriver(req, res) {
    const {
      name,
      phone,
      carModel,
      carColor = 'Oq (White)',
      licensePlate,
      tariffId = 'comfort',
      initialBalance = 100000,
      commissionRate = 0.12,
      photoUrl = '',
    } = req.body;

    if (!name || !phone || !carModel || !licensePlate) {
      return res.status(400).json({
        success: false,
        message: 'Haydovchi ismi, telefon, mashina rusumi va davlat raqami talab qilinadi',
      });
    }

    // Check duplicate phone or license plate
    const exists = db.drivers.find(
      (d) => d.phone === phone || d.licensePlate.toLowerCase() === licensePlate.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Ushbu telefon raqam yoki davlat raqamli haydovchi allaqachon ro\'yxatdan o\'tgan',
      });
    }

    const newDriver = {
      id: `drv-${uuidv4().substring(0, 8)}`,
      name: name.trim(),
      phone: phone.trim(),
      carModel: carModel.trim(),
      carColor: carColor.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      rating: 5.0,
      totalTrips: 0,
      todayTrips: 0,
      todayEarnings: 0,
      balance: parseFloat(initialBalance) || 0,
      commissionRate: parseFloat(commissionRate) || 0.12,
      isOnline: true,
      isBlocked: false,
      currentLat: 40.3842 + (Math.random() - 0.5) * 0.015,
      currentLng: 71.7843 + (Math.random() - 0.5) * 0.015,
      heading: Math.floor(Math.random() * 360),
      speed: 0.0,
      tariffId,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      registeredAt: new Date().toISOString(),
    };

    db.drivers.unshift(newDriver);

    // Record initial deposit transaction if any
    if (newDriver.balance > 0) {
      db.transactions.unshift({
        id: `tx-${uuidv4().substring(0, 8)}`,
        userId: newDriver.id,
        title: 'Boshlang\'ich depozit (Admin ro\'yxatdan o\'tkazdi)',
        amount: newDriver.balance,
        type: 'admin_deposit',
        date: new Date().toISOString(),
        status: 'completed',
      });
    }

    // Broadcast updated drivers list
    if (global.io) {
      global.io.emit('drivers:nearby_stream', {
        drivers: db.drivers.filter((d) => d.isOnline),
      });
    }

    return res.json({
      success: true,
      message: 'Yangi haydovchi muvaffaqiyatli ro\'yxatdan o\'tkazildi',
      driver: newDriver,
    });
  }

  /**
   * Top up driver's personal deposit balance from Admin
   * POST /api/v1/admin/drivers/:id/topup
   */
  static topupDriverBalance(req, res) {
    const driverId = req.params.id;
    const { amount, method = 'kassa_naqd', receiptNote = '', adminName = 'Admin' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Miqdor noto\'g\'ri' });
    }

    const driver = db.drivers.find((d) => d.id === driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });
    }

    const addedAmount = parseFloat(amount);
    driver.balance = (driver.balance || 0) + addedAmount;

    const tx = {
      id: `tx-${uuidv4().substring(0, 8)}`,
      driverId: driver.id,
      driverName: driver.name,
      title: `Balans to'ldirildi (${method.toUpperCase()})`,
      amount: addedAmount,
      type: 'admin_topup',
      receiptNote: receiptNote || 'Kassa orqali qabul qilindi',
      adminName,
      date: new Date().toISOString(),
      status: 'completed',
    };
    db.transactions.unshift(tx);

    // Emit live WebSocket event to update the driver's device instantly
    if (global.io) {
      global.io.emit(`driver:balance_updated:${driver.id}`, {
        driverId: driver.id,
        newBalance: driver.balance,
        addedAmount,
        receiptNote,
      });
      global.io.emit('driver:balance_updated', {
        driverId: driver.id,
        newBalance: driver.balance,
        addedAmount,
      });
    }

    return res.json({
      success: true,
      message: `Haydovchi balansi ${addedAmount.toLocaleString()} so'mga to'ldirildi`,
      currentBalance: driver.balance,
      transaction: tx,
    });
  }

  /**
   * Block / Unblock a driver
   * POST /api/v1/admin/drivers/:id/toggle-block
   */
  static toggleBlockDriver(req, res) {
    const driverId = req.params.id;
    const driver = db.drivers.find((d) => d.id === driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });
    }

    driver.isBlocked = !driver.isBlocked;
    if (driver.isBlocked) {
      driver.isOnline = false;
    }

    return res.json({
      success: true,
      message: driver.isBlocked ? 'Haydovchi bloklandi' : 'Haydovchi blokdan chiqarildi',
      isBlocked: driver.isBlocked,
      driver,
    });
  }

  /**
   * Get all transactions audit log
   * GET /api/v1/admin/transactions
   */
  static getTransactions(req, res) {
    return res.json({
      success: true,
      count: db.transactions.length,
      transactions: db.transactions,
    });
  }

  /**
   * Update tariff pricing & commission
   * POST /api/v1/admin/tariffs/update
   */
  static updateTariff(req, res) {
    const { tariffId, basePrice, pricePerKm, pricePerMinute } = req.body;
    const tariff = db.tariffs.find((t) => t.id === tariffId);

    if (!tariff) {
      return res.status(404).json({ success: false, message: 'Tarif topilmadi' });
    }

    if (basePrice !== undefined) tariff.basePrice = parseFloat(basePrice);
    if (pricePerKm !== undefined) tariff.pricePerKm = parseFloat(pricePerKm);
    if (pricePerMinute !== undefined) tariff.pricePerMinute = parseFloat(pricePerMinute);

    return res.json({
      success: true,
      message: `${tariff.name} tarifi narxlari yangilandi`,
      tariff,
    });
  }

  /**
   * Get all live orders for Dispatcher Monitor
   * GET /api/v1/admin/orders
   */
  static getOrders(req, res) {
    const { status, search = '' } = req.query;
    let list = [...db.orders];

    if (status && status !== 'all') {
      list = list.filter((o) => o.status === status);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          (o.userName && o.userName.toLowerCase().includes(q)) ||
          (o.userPhone && o.userPhone.includes(q)) ||
          (o.pickup && o.pickup.title && o.pickup.title.toLowerCase().includes(q)) ||
          (o.dropoff && o.dropoff.title && o.dropoff.title.toLowerCase().includes(q)) ||
          (o.id && o.id.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: list.length,
      orders: list,
    });
  }

  /**
   * Manually dispatch / assign an order to a specific driver
   * POST /api/v1/admin/orders/:id/assign
   */
  static assignOrder(req, res) {
    const orderId = req.params.id;
    const { driverId } = req.body;

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    const driver = db.drivers.find((d) => d.id === driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });
    }

    order.driver = {
      id: driver.id,
      driverId: driver.id,
      name: driver.name,
      phone: driver.phone,
      carModel: driver.carModel,
      carColor: driver.carColor,
      licensePlate: driver.licensePlate,
      rating: driver.rating,
      lat: driver.currentLat,
      lng: driver.currentLng,
      currentLat: driver.currentLat,
      currentLng: driver.currentLng,
    };
    order.status = 'driver_assigned';
    order.updatedAt = new Date().toISOString();

    if (global.io) {
      global.io.emit('order:driver_assigned', {
        orderId: order.id,
        order,
        driver: order.driver,
      });
      global.io.emit('order:status_updated', {
        orderId: order.id,
        status: 'driver_assigned',
      });
    }

    return res.json({
      success: true,
      message: `Buyurtma haydovchi ${driver.name} ga biriktirildi`,
      order,
    });
  }

  /**
   * Cancel an order by Admin / Dispatcher
   * POST /api/v1/admin/orders/:id/cancel
   */
  static cancelOrder(req, res) {
    const orderId = req.params.id;
    const { reason = 'Dispetcher tomonidan bekor qilindi' } = req.body;

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    order.status = 'cancelled';
    order.cancelReason = reason;
    order.updatedAt = new Date().toISOString();

    if (global.io) {
      global.io.emit('order:status_updated', {
        orderId: order.id,
        status: 'cancelled',
        reason,
      });
    }

    return res.json({
      success: true,
      message: 'Buyurtma bekor qilindi',
      order,
    });
  }
}
