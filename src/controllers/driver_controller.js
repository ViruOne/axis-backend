import { db } from '../data/mock_db.js';
import { GeoService } from '../services/geo_service.js';

export class DriverController {
  /**
   * Get all active nearby drivers around coordinates
   * GET /api/v1/drivers/nearby?lat=...&lng=...&radius=...
   */
  static getNearbyDrivers(req, res) {
    const lat = parseFloat(req.query.lat) || 40.3842;
    const lng = parseFloat(req.query.lng) || 71.7843;
    const radius = parseFloat(req.query.radius) || 5.0;

    const nearby = GeoService.findNearbyDrivers(db.drivers, lat, lng, radius);

    return res.json({
      success: true,
      count: nearby.length,
      drivers: nearby,
    });
  }

  /**
   * Update driver online/offline status
   * POST /api/v1/drivers/status
   */
  static updateStatus(req, res) {
    const { driverId = 'drv-001', isOnline } = req.body;
    const driver = db.drivers.find((d) => d.id === driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });
    }

    driver.isOnline = isOnline;

    return res.json({
      success: true,
      message: isOnline ? 'Liniyadasiz (Online)' : 'Offline rejimga o\'tildi',
      driver,
    });
  }

  /**
   * Update driver GPS coordinates
   * POST /api/v1/drivers/location
   */
  static updateLocation(req, res) {
    const { driverId = 'drv-001', lat, lng, heading = 0, speed = 0 } = req.body;
    const driver = db.drivers.find((d) => d.id === driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Haydovchi topilmadi' });
    }

    if (lat && lng) {
      driver.currentLat = parseFloat(lat);
      driver.currentLng = parseFloat(lng);
      driver.heading = parseFloat(heading);
      driver.speed = parseFloat(speed);
    }

    return res.json({
      success: true,
      driver,
    });
  }

  /**
   * Get driver stats dashboard
   * GET /api/v1/drivers/:id/stats
   */
  static getDriverStats(req, res) {
    const driverId = req.params.id || 'drv-001';
    const driver = db.drivers.find((d) => d.id === driverId) || db.drivers[0];

    return res.json({
      success: true,
      stats: {
        todayEarnings: driver.todayEarnings,
        todayTrips: driver.todayTrips,
        rating: driver.rating,
        balance: driver.balance,
        isOnline: driver.isOnline,
      },
    });
  }
}
