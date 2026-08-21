import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'mytaxi_jwt_secret_key_2026',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  eskiz: {
    email: process.env.ESKIZ_EMAIL || '',
    password: process.env.ESKIZ_PASSWORD || '',
  },
  defaultCoords: {
    lat: 40.3842, // Fergana / Tashkent center default
    lng: 71.7843,
  },
};
