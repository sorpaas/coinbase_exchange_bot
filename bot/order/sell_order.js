var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Order = require('./order');

/**
*   Required Options:
* 
*/
function SellOrder(options) {
  Order.call(this, options);
}

util.inherits(SellOrder, Order);

SellOrder.prototype.place = function() {
  this._authedClient.sell({
    price: this._price,     // USD
    size:  this._size,      // BTC
    product_id: 'BTC-USD',
  }, function(err, response, data) {
    if (err) {
      throw new Error(err);
    }
    if (data.message) {
      throw new Error(data.message);
    }
    this._order_id = data.id;
    this.emit('placed', data);
    this._pollForFill();
  }.bind(this));
};

module.exports = SellOrder;
