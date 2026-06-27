const activeUsers = new Map();
let ioInstance = null;

export function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('register-active-user', (user) => {
      if (user && user.id) {
        socket.userId = user.id;
        socket.userRole = user.role;
        activeUsers.set(socket.id, {
          socketId: socket.id,
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          examinerId: user.examinerId,
          connectedAt: new Date().toISOString()
        });
        
        io.emit('active-users-update', getActiveUsersList());
      }
    });

    socket.on('disconnect', () => {
      if (activeUsers.has(socket.id)) {
        activeUsers.delete(socket.id);
        io.emit('active-users-update', getActiveUsersList());
      }
    });
  });
}

export function getActiveUsersList() {
  return Array.from(activeUsers.values());
}

export function broadcastEvent(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}
