import { db } from '../data/mock_db.js';

export function setupTaxiSockets(io) {
  global.io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] New client connected: ${socket.id}`);

    // Send active real online drivers immediately to new connecting client
    socket.emit('drivers:nearby_stream', {
      drivers: db.drivers.filter((d) => d.isOnline && !d.isBlocked),
    });

    // 1. Client joins a specific room
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      console.log(`📡 [Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
    });

    // 2. Real Driver Online / Offline Status
    socket.on('driver:status_update', (data) => {
      const { driverId, isOnline, lat, lng, heading, speed } = data;
      let driver = db.drivers.find((d) => d.id === driverId);
      if (!driver && isOnline) {
        // Register active connected driver
        driver = {
          id: driverId,
          name: data.name || 'Haydovchi',
          phone: data.phone || '',
          carModel: data.carModel || 'Chevrolet Cobalt',
          carColor: data.carColor || 'Oq',
          licensePlate: data.licensePlate || '40 A 777 AA',
          rating: 5.0,
          totalTrips: 0,
          todayTrips: 0,
          todayEarnings: 0,
          balance: 100000,
          isOnline: true,
          isBlocked: false,
          currentLat: lat || 40.3842,
          currentLng: lng || 71.7843,
          heading: heading || 0.0,
          speed: speed || 0.0,
        };
        db.drivers.unshift(driver);
      } else if (driver) {
        driver.isOnline = isOnline;
        if (lat && lng) {
          driver.currentLat = lat;
          driver.currentLng = lng;
          driver.heading = heading || driver.heading;
          driver.speed = speed || driver.speed;
        }
      }

      // Broadcast real online drivers to all passenger apps
      io.emit('drivers:nearby_stream', {
        drivers: db.drivers.filter((d) => d.isOnline && !d.isBlocked),
      });
    });

    // 3. Real Driver live GPS location stream
    socket.on('driver:location_update', (data) => {
      const { driverId, lat, lng, heading, speed } = data;
      let driver = db.drivers.find((d) => d.id === driverId);
      const liveSpeed = typeof speed === 'number' ? speed : 0.0;
      const liveHeading = typeof heading === 'number' ? heading : 0.0;

      if (driver) {
        driver.isOnline = true;
        driver.currentLat = lat;
        driver.currentLng = lng;
        driver.heading = liveHeading;
        driver.speed = liveSpeed;
      } else {
        driver = {
          id: driverId || 'drv-001',
          name: data.name || data.driverName || 'Javohir Toshmatov',
          phone: data.phone || '+998 90 123 45 67',
          carModel: data.carModel || 'Chevrolet Cobalt',
          carColor: data.carColor || 'Oq',
          licensePlate: data.licensePlate || '40 A 777 AA',
          rating: 5.0,
          totalTrips: 100,
          todayTrips: 5,
          todayEarnings: 150000,
          balance: 100000,
          isOnline: true,
          isBlocked: false,
          currentLat: lat,
          currentLng: lng,
          heading: liveHeading,
          speed: liveSpeed,
        };
        db.drivers.unshift(driver);
      }

      // Sync active orders
      for (const order of db.orders) {
        if (order.driver && (order.driver.id === driverId || order.driver.driverId === driverId || !order.driver.id)) {
          order.driver.currentLat = lat;
          order.driver.currentLng = lng;
          order.driver.lat = lat;
          order.driver.lng = lng;
          order.driver.heading = liveHeading;
          order.driver.speed = liveSpeed;
        }
      }

      // Broadcast real-time location and speed to all passenger apps
      io.emit('driver:location_changed', {
        driverId: driver.id,
        lat,
        lng,
        heading: liveHeading,
        speed: liveSpeed,
      });

      io.emit('drivers:nearby_stream', {
        drivers: db.drivers.filter((d) => d.isOnline && !d.isBlocked),
      });
    });

    // 4. Order Created (from passenger app)
    socket.on('order:create', (data) => {
      console.log('📦 [Socket.IO] New order created via socket:', data);
      const order = data.order || data;
      io.emit('order:incoming', {
        order,
        timerSeconds: 30,
      });
    });

    // 5. Real Driver accepts incoming order
    socket.on('order:driver_assigned', (data) => {
      console.log(`🚖 [Socket.IO] Order accepted by driver:`, data);
      io.emit('order:driver_assigned', data);
    });

    // 5. Real Order Status Lifecycle (arrived, in_trip, completed, cancelled)
    socket.on('order:status_updated', (data) => {
      console.log(`📍 [Socket.IO] Order status updated:`, data);
      io.emit('order:status_updated', data);
    });

    socket.on('order:cancelled', (data) => {
      console.log(`🛑 [Socket.IO] Order cancelled:`, data);
      io.emit('order:cancelled', data);
    });

    // 6. In-trip Live Chat
    socket.on('chat:send_message', (data) => {
      const { orderId, senderId, senderName, text, isDriver } = data;
      const message = {
        id: `msg-${Date.now()}`,
        orderId,
        senderId,
        senderName,
        text,
        isDriver,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
      };

      io.emit(`chat:message:${orderId}`, message);
      io.emit('chat:incoming', message);
    });

    // 7. Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ [Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}
