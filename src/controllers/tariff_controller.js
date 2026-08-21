import { db } from '../data/mock_db.js';

export class TariffController {
  /**
   * Get all active tariffs with pricing
   * GET /api/v1/tariffs
   */
  static getTariffs(req, res) {
    return res.json({
      success: true,
      tariffs: db.tariffs,
    });
  }
}
