import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/app_config.js';

import { AuthController } from './controllers/auth_controller.js';
import { DriverController } from './controllers/driver_controller.js';
import { OrderController } from './controllers/order_controller.js';
import { TariffController } from './controllers/tariff_controller.js';
import { PaymentController } from './controllers/payment_controller.js';
import { LocationController } from './controllers/location_controller.js';
import { AdminController } from './controllers/admin_controller.js';
import { setupTaxiSockets } from './sockets/taxi_socket.js';

const app = express();
const server = http.createServer(app);

// Enable CORS and JSON parsing
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});
setupTaxiSockets(io);

// ----------------------------------------------------
// REST API Routes
// ----------------------------------------------------
const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AXIS Taxi & Driver Backend Gateway',
    brand: 'AXIS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Auth Routes
apiRouter.post('/auth/send-otp', AuthController.sendOtp);
apiRouter.post('/auth/verify-otp', AuthController.verifyOtp);
apiRouter.get('/auth/profile', AuthController.getProfile);

// Drivers Routes
apiRouter.get('/drivers/nearby', DriverController.getNearbyDrivers);
apiRouter.post('/drivers/status', DriverController.updateStatus);
apiRouter.post('/drivers/location', DriverController.updateLocation);
apiRouter.get('/drivers/:id/stats', DriverController.getDriverStats);

// Orders Routes
apiRouter.post('/orders/create', OrderController.createOrder);
apiRouter.get('/orders/active', OrderController.getActiveOrder);
apiRouter.get('/orders/pending', OrderController.getPendingOrders);
apiRouter.get('/orders/:id', OrderController.getOrderById);
apiRouter.post('/orders/:id/accept', OrderController.acceptOrder);
apiRouter.post('/orders/:id/advance-step', OrderController.advanceTripStep);
apiRouter.post('/orders/:id/cancel', OrderController.cancelOrder);
apiRouter.post('/orders/:id/rate', OrderController.rateOrder);
apiRouter.get('/orders/history', OrderController.getHistory);

// Tariffs Routes
apiRouter.get('/tariffs', TariffController.getTariffs);

// Locations Routes
apiRouter.get('/locations/popular', LocationController.getPopular);
apiRouter.get('/locations/search', LocationController.search);

// Payments Routes
apiRouter.get('/payments/wallet', PaymentController.getWallet);
apiRouter.post('/payments/topup', PaymentController.topUp);
apiRouter.post('/payments/cards', PaymentController.addCard);

// Admin & Dispatcher Routes
apiRouter.get('/admin/stats', AdminController.getStats);
apiRouter.get('/admin/drivers', AdminController.getDrivers);
apiRouter.post('/admin/drivers/register', AdminController.registerDriver);
apiRouter.post('/admin/drivers/:id/topup', AdminController.topupDriverBalance);
apiRouter.post('/admin/drivers/:id/toggle-block', AdminController.toggleBlockDriver);
apiRouter.get('/admin/transactions', AdminController.getTransactions);
apiRouter.post('/admin/tariffs/update', AdminController.updateTariff);
apiRouter.get('/admin/orders', AdminController.getOrders);
apiRouter.post('/admin/orders/:id/assign', AdminController.assignOrder);
apiRouter.post('/admin/orders/:id/cancel', AdminController.cancelOrder);

// Register base router
app.use('/api/v1', apiRouter);

// Root route
app.get('/', (req, res) => {
  res.send('🚀 AXIS Taxi & AXIS Driver Real-time Backend Server is running smoothly!');
});

// Start listening
server.listen(config.port, config.host, () => {
  console.log(`\n======================================================`);
  console.log(`🚖 AXIS Backend Hub running on http://${config.host}:${config.port}`);
  console.log(`📡 AXIS WebSocket Gateway ready at ws://${config.host}:${config.port}`);
  console.log(`👑 AXIS Admin API ready at http://localhost:${config.port}/api/v1/admin/stats`);
  console.log(`🔌 Health check: http://localhost:${config.port}/api/v1/health`);
  console.log(`======================================================\n`);
});
