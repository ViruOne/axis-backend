import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mock_db.js';
import { GeoService } from '../services/geo_service.js';

export class OrderController {
  /**
   * Create a new taxi order
   * POST /api/v1/orders/create
   */
  static createOrder(req, res) {
    const {
      pickup,
      dropoff,
      tariffId = 'comfort',
      paymentMethod = 'cash',
      comment = '',
      promoCode = '',
      isChildSeat = false,
      isPetFriendly = false,
      userId = 'usr-001',
    } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        message: 'Jo\'nash va borish manzili talab qilinadi',
      });
    }

    const tariff = db.tariffs.find((t) => t.id === tariffId) || db.tariffs[1];
    const estimate = GeoService.estimateTrip(pickup, dropoff, tariff);
    const polyline = GeoService.generateRoutePolyline(pickup, dropoff);

    // Apply promo discount if any
    let discount = 0;
    if (promoCode && promoCode.toUpperCase() === 'VIP2026') {
      discount = 10000;
    }
    const finalPrice = Math.max(tariff.basePrice, estimate.finalPrice - discount);

    const order = {
      id: `ord-${uuidv4().substring(0, 8)}`,
      userId,
      pickup,
      dropoff,
      tariffId,
      tariffName: tariff.name,
      paymentMethod,
      comment,
      promoCode,
      discount,
      distanceKm: estimate.distanceKm,
      estimatedMinutes: estimate.estimatedMinutes,
      finalPrice,
      polyline,
      status: 'searching_driver', // searching_driver | driver_accepted | driver_arrived | in_trip | completed | cancelled
      driver: null,
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(order);

    // If there is an active socket server, broadcast incoming order to nearby online drivers
    if (global.io) {
      global.io.emit('order:incoming', {
        order,
        timerSeconds: 15,
      });
    }

    return res.json({
      success: true,
      message: 'Buyurtma yaratildi, haydovchi qidirilmoqda',
      order,
    });
  }

  /**
   * Driver accepts incoming order
   * POST /api/v1/orders/:id/accept
   */
  static acceptOrder(req, res) {
    const orderId = req.params.id;
    const { driverId = 'drv-001' } = req.body;

    const order = db.orders.find((o) => o.id === orderId) || db.orders[0];
    const driver = db.drivers.find((d) => d.id === driverId) || db.drivers[0];

    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    order.status = 'driver_accepted';
    order.driver = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      carModel: driver.carModel,
      carColor: driver.carColor,
      licensePlate: driver.licensePlate,
      rating: driver.rating,
      currentLat: driver.currentLat,
      currentLng: driver.currentLng,
      etaMinutes: 3,
    };

    if (global.io) {
      global.io.emit('order:driver_assigned', { order });
    }

    return res.json({
      success: true,
      message: 'Buyurtma qabul qilindi',
      order,
    });
  }

  /**
   * Driver advances trip step: arrived -> in_trip -> completed
   * POST /api/v1/orders/:id/advance-step
   */
  static advanceTripStep(req, res) {
    const orderId = req.params.id;
    const { nextStep } = req.body; // arrived | in_trip | completed

    const order = db.orders.find((o) => o.id === orderId) || db.orders[0];
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    if (nextStep === 'arrived') {
      order.status = 'driver_arrived';
    } else if (nextStep === 'in_trip') {
      order.status = 'in_trip';
    } else if (nextStep === 'completed') {
      order.status = 'completed';
      order.completedAt = new Date().toISOString();

      // Deduct or process transaction
      if (order.paymentMethod === 'wallet') {
        const user = db.users.find((u) => u.id === order.userId);
        if (user) user.walletBalance -= order.finalPrice;
      }

      // Add to driver earnings
      const driver = db.drivers.find((d) => d.id === order.driver?.id);
      if (driver) {
        driver.todayEarnings += order.finalPrice * 0.85; // 15% commission
        driver.todayTrips += 1;
      }
    }

    if (global.io) {
      global.io.emit('order:status_updated', {
        orderId: order.id,
        status: order.status,
        order,
      });
    }

    return res.json({
      success: true,
      message: `Buyurtma holati yangilandi: ${order.status}`,
      order,
    });
  }

  /**
   * Cancel an active order
   * POST /api/v1/orders/:id/cancel
   */
  static cancelOrder(req, res) {
    const orderId = req.params.id;
    const { reason = 'Mijoz bekor qildi' } = req.body;

    const order = db.orders.find((o) => o.id === orderId) || db.orders[0];
    if (order) {
      order.status = 'cancelled';
      order.cancelReason = reason;

      if (global.io) {
        global.io.emit('order:cancelled', { orderId: order.id, reason });
      }
    }

    return res.json({
      success: true,
      message: 'Buyurtma bekor qilindi',
    });
  }

  /**
   * Rate a completed order
   * POST /api/v1/orders/:id/rate
   */
  static rateOrder(req, res) {
    const orderId = req.params.id;
    const { rating = 5, comment = '', tags = [] } = req.body;

    const order = db.orders.find((o) => o.id === orderId);
    if (order) {
      order.rating = rating;
      order.ratingComment = comment;
      order.ratingTags = tags;
    }

    return res.json({
      success: true,
      message: 'Bahoyingiz uchun tashakkur!',
    });
  }

  /**
   * Get past trip history
   * GET /api/v1/orders/history
   */
  static getHistory(req, res) {
    const userId = req.query.userId || 'usr-001';
    const history = db.orders.filter((o) => o.userId === userId || o.status === 'completed');

    return res.json({
      success: true,
      orders: history,
    });
  }

  /**
   * Get active searching orders for online drivers
   * GET /api/v1/orders/pending
   */
  static getPendingOrders(req, res) {
    const pending = db.orders.filter((o) => o.status === 'searching_driver');
    return res.json({
      success: true,
      orders: pending,
    });
  }
}
