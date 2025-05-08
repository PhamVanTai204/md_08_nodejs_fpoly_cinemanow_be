// src/utils/socket.js
const { Server } = require('socket.io');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  console.log('✅ Socket.IO setup completed');

  io.on('connection', (socket) => {
    console.log('🧩 New client connected');

    socket.on('join-room', ({ roomId }) => {
      socket.join(`room-${roomId}`);
      console.log(`✅ Joined room: room-${roomId}`);
    });

    socket.on('leave-room', ({ roomId }) => {
      socket.leave(`room-${roomId}`);
      console.log(`🚪 Left room: room-${roomId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected');
    });
  });

  return io;
}

module.exports = { setupSocket };
