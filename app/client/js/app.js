(function() {
  'use strict';
  var statusEl = document.getElementById('status');
  var statsEl = document.getElementById('stats');
  var buysEl = document.getElementById('buys');
  var sellsEl = document.getElementById('sells');
  var socket = io();

  // status, stats, buys, sells
  socket.on('status', function(data) {
    var p = document.createElement('p');
    p.textContent = JSON.stringify(data);
    statusEl.appendChild(p);
  });

  socket.on('buy:settled', function(data) {
    var order_data = data.order_data;
    var stats = data.stats;

    var p = document.createElement('p');
    p.textContent = JSON.stringify(order_data);
    buysEl.appendChild(p);
  });
  
  socket.on('sell:settled', function(data) {
    var order_data = data.order_data;
    var stats = data.stats;

    var p = document.createElement('p');
    p.textContent = JSON.stringify(order_data);
    sellsEl.appendChild(p);
  });
})();
