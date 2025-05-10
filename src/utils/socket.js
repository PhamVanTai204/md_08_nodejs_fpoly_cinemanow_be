let ioInstance = null;

function setupSocket(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

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

  ioInstance = io; // gán lại instance
  return io;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.IO chưa được khởi tạo!');
  return ioInstance;
}

module.exports = { setupSocket, getIO };
