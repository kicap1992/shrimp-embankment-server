const socketio = require('socket.io');
// const socketio_client = require('socket.io-client');
const dotenv = require('dotenv');

dotenv.config();

// const socket_client = socketio_client("http://localhost:"+process.env.PORT);

let io;

function init(server) {
  io = socketio(server);
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}



module.exports = {
  init,
  getIO,
  // socket_client
};