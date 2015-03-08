var socketIOClient = require('socket.io-client');

module.exports = function(dashIO) {
  var botFeed = socketIOClient('http://localhost:8888');

  dashIO.on('connection', function(dashSocket){
    console.log('connected dash socket');
    
    botFeed.on('status', function(data) {
      console.log('got feed status');
      dashSocket.emit('status', data);
    });

    botFeed.on('buy:settled', function(data) {
      console.log('got buy settled message');
      dashSocket.emit('buy:settled', data);
    });
    
    botFeed.on('sell:settled', function(data) {
      console.log('got sell settled message');
      dashSocket.emit('sell:settled', data);
    });
  });
};