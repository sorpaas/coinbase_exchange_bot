var EventEmitter = require('events').EventEmitter;
var util = require('util');

// [
//   {
//     "trade_id": 74,
//     "product_id": "BTC-USD",
//     "price": "10.00",
//     "size": "0.01",
//     "order_id": "d50ec984-77a8-460a-b958-66f114b0de9b",
//     "created_at": "2014-11-07 22:19:28.578544+00",
//     "fee": "-0.00100000",
//     "settled": true,
//     "side": "buy"
//   }
// ]
/**
*   Required Options:
*     authedClient
*     price
*     amount
*/
function Order(options) {
  EventEmitter.call(this);

  if (!options.authedClient) {
    throw new Error('Authed client reference required.');
  }

  if (!options.tradeStore) {
    throw new Error('Trade store reference required.');
  }

  if (!options.price) {
    throw new Error('Price required.');
  }

  if (!options.size) {
    throw new Error('Size required.');
  }

  this._authedClient = options.authedClient;
  this._tradeStore = options.tradeStore;
  this._price = options.price;
  this._size = options.size;

  this._product_id = 'BTC-USD';
  this._polling_timeout = options.polling_timeout || 2500;
  this._max_polling_tries = options.max_polling_tries || 7;
  
  this._fufilled = false;
  this._order_data = null;

  this._order_id = null; // set by sub class
}

util.inherits(Order, EventEmitter);

Order.prototype._pollForFill = function(num_tries) {
  var num_tries = num_tries || 0;

  this._authedClient.getOrder(this._order_id, function(err, response, data) {
    if (err) {
      throw new Error(err);
    }

    if (data.settled === true) {
      this._order_data = data;
      this._tradeStore.add(this._order_data);
      this.emit('settled', this._order_data);
      return;
    } else if (num_tries > this._max_polling_tries) {
      this.cancel();
      return;
    }

    ++num_tries;
    setTimeout(function() {
      this._pollForFill(num_tries);
    }.bind(this), this._polling_timeout);
  }.bind(this));
};

Order.prototype.cancel = function() {
  this._authedClient.cancelOrder(this._order_id, function(err, response, data) {
    if (err) {
      throw new Error(err);
    }
    this.emit('cancelled');
  }.bind(this));
};

Order.prototype.getOrderData = function() {
  return this._order_data;
};

Order.prototype.hasBeenFufilled = function() {
  return this._fufilled;
};

// place, set order id, poll for fill
Order.prototype.place = function() {
  throw new Error('Place not implemented.');
};

module.exports = Order;
