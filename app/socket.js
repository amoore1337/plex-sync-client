const socketIo = require('socket.io');

let socket;
exports.initIo = function(server) {
  socket = socketIo(server);
  return socket;
}

exports.io = function() {
  return socket;
}
