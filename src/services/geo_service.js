export class GeoService {
  /**
   * Calculates distance between two coordinates in kilometers using Haversine formula
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Finds drivers within a given radius (km) sorted by closest first
   */
  static findNearbyDrivers(drivers, lat, lng, radiusKm = 5.0) {
    return drivers
      .filter((d) => d.isOnline)
      .map((d) => {
        const distance = this.calculateDistance(lat, lng, d.currentLat, d.currentLng);
        const etaMinutes = Math.max(1, Math.round((distance / 30) * 60)); // assuming 30 km/h avg city speed
        return { ...d, distanceKm: parseFloat(distance.toFixed(2)), etaMinutes };
      })
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Estimates price and duration for an order given pickup, dropoff and tariff
   */
  static estimateTrip(pickup, dropoff, tariff) {
    const distanceKm = this.calculateDistance(
      pickup.latitude,
      pickup.longitude,
      dropoff.latitude,
      dropoff.longitude
    );
    const estimatedMinutes = Math.max(3, Math.round((distanceKm / 28) * 60));
    const rawPrice =
      tariff.basePrice +
      distanceKm * tariff.pricePerKm +
      estimatedMinutes * tariff.pricePerMinute;

    // Round to nearest 1000 UZS
    const finalPrice = Math.ceil(rawPrice / 1000) * 1000;

    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      estimatedMinutes,
      finalPrice,
    };
  }

  /**
   * Generates intermediate realistic street turn points between two locations
   */
  static generateRoutePolyline(pickup, dropoff) {
    const p1 = { lat: pickup.latitude, lng: pickup.longitude };
    const p2 = { lat: dropoff.latitude, lng: dropoff.longitude };

    const midLat = (p1.lat + p2.lat) / 2;
    const corner1 = { lat: midLat, lng: p1.lng };
    const corner2 = { lat: midLat, lng: p2.lng };

    return [p1, corner1, corner2, p2];
  }
}
