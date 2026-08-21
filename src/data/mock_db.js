import { v4 as uuidv4 } from 'uuid';

export const db = {
  // Active Drivers Store (Populated dynamically in real-time by live connected AXIS Driver devices)
  drivers: [],

  // Users Store
  users: [
    {
      id: 'usr-001',
      phone: '+998901234567',
      name: 'Bekzod Rustamov',
      rating: 4.97,
      walletBalance: 125000,
      role: 'passenger',
      createdAt: new Date().toISOString(),
    },
  ],

  // Verification OTP codes store (phone -> { code, expiresAt })
  otpCodes: new Map(),

  // Orders Store
  orders: [],

  // Pre-configured Tariffs
  tariffs: [
    {
      id: 'start',
      name: 'Start',
      description: 'Har kungi qulay va tejamkor safarlar',
      basePrice: 6000,
      pricePerKm: 1800,
      pricePerMinute: 400,
      estimatedArrivalMin: 2,
      carSample: 'Cobalt, Nexia 3',
      icon: 'local_taxi',
      badge: 'Tejamkor',
    },
    {
      id: 'comfort',
      name: 'Comfort',
      description: 'Konditsionerli yangi avtomobillar',
      basePrice: 9000,
      pricePerKm: 2400,
      pricePerMinute: 600,
      estimatedArrivalMin: 3,
      carSample: 'Gentra, Tracker, Onix',
      icon: 'directions_car',
      badge: 'Ommabop',
    },
    {
      id: 'business',
      name: 'Business VIP',
      description: 'Yuqori darajadagi premium xizmat va sokinlik',
      basePrice: 18000,
      pricePerKm: 4200,
      pricePerMinute: 1100,
      estimatedArrivalMin: 4,
      carSample: 'Malibu 2, BYD Song Plus EV, Kia K5',
      icon: 'star',
      badge: 'VIP',
    },
    {
      id: 'delivery',
      name: 'Yetkazish',
      description: 'Hujjat va posilkalarni eshikdan-eshikkacha eltish',
      basePrice: 8000,
      pricePerKm: 2000,
      pricePerMinute: 500,
      estimatedArrivalMin: 3,
      carSample: 'Har qanday avtomobil',
      icon: 'local_shipping',
      badge: 'Tezkor',
    },
    {
      id: 'minivan',
      name: 'Minivan (6+1)',
      description: 'Katta oila yoki jamoa uchun keng sig\'imli avtomobil',
      basePrice: 15000,
      pricePerKm: 3500,
      pricePerMinute: 800,
      estimatedArrivalMin: 5,
      carSample: 'Damas Deluxe, Hyundai Staria',
      icon: 'airport_shuttle',
      badge: 'Katta sig\'im',
    },
  ],

  // Popular Landmarks in Uzbekistan (Fergana & Tashkent)
  locations: [
    {
      id: 'loc-001',
      title: 'Ahmad Al-Farg\'oniy bog\'i',
      subtitle: 'Al-Farg\'oniy ko\'chasi, Farg\'ona',
      latitude: 40.3842,
      longitude: 71.7843,
      category: 'park',
      icon: 'park',
    },
    {
      id: 'loc-002',
      title: 'Farg\'ona Davlat Universiteti (FarDU)',
      subtitle: 'Murabbiylar ko\'chasi, 19-uy, Farg\'ona',
      latitude: 40.3895,
      longitude: 71.7760,
      category: 'education',
      icon: 'school',
    },
    {
      id: 'loc-003',
      title: 'Farg\'ona Markaziy Bozori (Dehqon bozori)',
      subtitle: 'Sayilgoh ko\'chasi, Farg\'ona',
      latitude: 40.3790,
      longitude: 71.7915,
      category: 'market',
      icon: 'shopping_bag',
    },
    {
      id: 'loc-004',
      title: 'Farg\'ona Xalqaro Aeroporti (FEG)',
      subtitle: 'Aeroport ko\'chasi, Farg\'ona',
      latitude: 40.3580,
      longitude: 71.7450,
      category: 'transport',
      icon: 'flight',
    },
    {
      id: 'loc-005',
      title: 'Tashkent City Park & Mall',
      subtitle: 'Navoiy ko\'chasi, Toshkent',
      latitude: 41.3110,
      longitude: 69.2405,
      category: 'park',
      icon: 'park',
    },
    {
      id: 'loc-006',
      title: 'Amir Temur Xiyoboni',
      subtitle: 'Toshkent shahar markazi',
      latitude: 41.3113,
      longitude: 69.2797,
      category: 'landmark',
      icon: 'place',
    },
    {
      id: 'loc-007',
      title: 'Toshkent Xalqaro Aeroporti (TAS)',
      subtitle: 'Qumariq ko\'chasi, 13, Toshkent',
      latitude: 41.2578,
      longitude: 69.2812,
      category: 'transport',
      icon: 'flight',
    },
  ],

  // Saved Payment Cards
  cards: [
    {
      id: 'crd-001',
      userId: 'usr-001',
      cardNumberMasked: '8600 •••• •••• 4589',
      cardType: 'Uzcard',
      bankName: 'Kapitalbank',
      expireDate: '12/28',
      isDefault: true,
      balance: 450000,
    },
    {
      id: 'crd-002',
      userId: 'usr-001',
      cardNumberMasked: '9860 •••• •••• 1122',
      cardType: 'Humo',
      bankName: 'TBC Bank',
      expireDate: '08/27',
      isDefault: false,
      balance: 1200000,
    },
  ],

  // Transactions History
  transactions: [
    {
      id: 'tx-001',
      userId: 'usr-001',
      title: 'Comfort safar to\'lovi',
      amount: -18000,
      type: 'trip_payment',
      date: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'completed',
    },
    {
      id: 'tx-002',
      userId: 'usr-001',
      title: 'Hamyonni to\'ldirish (Payme)',
      amount: 50000,
      type: 'topup',
      date: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: 'completed',
    },
  ],
};
