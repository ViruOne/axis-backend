import { db } from '../data/mock_db.js';

export class LocationController {
  /**
   * Get popular locations and landmarks
   * GET /api/v1/locations/popular
   */
  static getPopular(req, res) {
    return res.json({
      success: true,
      locations: db.locations,
    });
  }

  /**
   * Search locations by query string
   * GET /api/v1/locations/search?q=...
   */
  static search(req, res) {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) {
      return res.json({ success: true, locations: db.locations });
    }

    const filtered = db.locations.filter(
      (l) => l.title.toLowerCase().includes(q) || l.subtitle.toLowerCase().includes(q)
    );

    return res.json({
      success: true,
      locations: filtered,
    });
  }
}
