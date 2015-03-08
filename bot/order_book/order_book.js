var EventEmitter = require('events').EventEmitter;
var util = require('util');

var _ = require('lodash');
var moment = require('moment');
var async = require('async');
var quickSort = require('quick-sort');
var CoinbaseExchange = require('coinbase-exchange');

var OrderStore = require('./order_book_store');

function OrderBook() {
  EventEmitter.call(this);

  this._queue = [];
  this._last_sell_price = null;
  this._last_buy_price = null;

  this._openSellOrders = [];
  this._openBuyOrders = [];

  this._orderBookInitialized = false;
  this._initialMatchQueue = [];
  this._initialOpenQueue = [];
  this._initialDoneQueue = [];
  this._initialChangeQueue = [];

  this.coinbasePublicClient = new CoinbaseExchange.PublicClient();
  this.coinbaseOrderBoook = new CoinbaseExchange.OrderBook();

  this.store = new OrderStore();
  this.store.init(function() {
    this.coinbaseOrderBoook.on('match', this._onMatch.bind(this));
    this.coinbaseOrderBoook.on('open', this._onOpen.bind(this));
    this.coinbaseOrderBoook.on('done', this._onDone.bind(this));
    this.coinbaseOrderBoook.on('change', this._onChange.bind(this));
    console.log('---------- WEBSOCKET FEED INITIALIZED ----------');

    this._initOrderBook(function() {
      console.log('---------- ORDER BOOK INITIALIZED ----------');
    });
  }.bind(this));
}

util.inherits(OrderBook, EventEmitter);

OrderBook.prototype._sortByPrice = function(collection) {
  collection.sort(function(a, b) {
    if (a.price < b.price) {
      return -1;
    }
    if (a.price > b.price) {
      return 1;
    }

    // a must be equal to b
    return 0;
  });
};

OrderBook.prototype._updateMatchOrder = function(order) {
  var order_id = order.maker_order_id;

  if (order.side === 'buy') {
    var buy_index = _.findIndex(this._openBuyOrders, function(order) {
      return order.order_id === order_id;
    });
    if (buy_index !== -1) {
      var orderOnBook = this._openBuyOrders[buy_index];
      if (order.size >= orderOnBook.remaining_size) {
        this._openBuyOrders.splice(buy_index, 1);
      } else {
        _.extend(orderOnBook, { remaining_size: (orderOnBook.remaining_size - order.size), price: order.price });
        this._sortByPrice(this._openBuyOrders);
      }
      this._last_buy_price = this._openBuyOrders[this._openBuyOrders.length - 1].price;
    } else {
      if (order.price > this._openBuyOrders[this._openBuyOrders.length - 1].price) {
        this._last_buy_price = order.price;
      }
    }
  } else {
    var sell_index = _.findIndex(this._openSellOrders, function(order) {
      return order.order_id === order_id;
    });
    if (sell_index !== -1) {
      var orderOnBook = this._openSellOrders[sell_index];
      if (order.size >= orderOnBook.remaining_size) {
        this._openSellOrders.splice(sell_index, 1);
      } else {
        _.extend(orderOnBook, { remaining_size: (orderOnBook.remaining_size - order.size), price: order.price });
        this._sortByPrice(this._openSellOrders);
      }
      this._last_sell_price = this._openSellOrders[0].price;
    } else {
      if (order.price < this._openSellOrders[0].price) {
        this._last_sell_price = order.price;
      }
    }
  }
};

OrderBook.prototype._removeDoneOrder = function(toBeRemoved) {
  var order_id = toBeRemoved.order_id;

  if (toBeRemoved.side === 'buy') {
    var buy_index = _.findIndex(this._openBuyOrders, function(order) {
      return order.order_id === order_id;
    });
    if (buy_index !== -1) {
      this._openBuyOrders.splice(buy_index, 1);
      this._last_buy_price = this._openBuyOrders[this._openBuyOrders.length - 1].price;
    }
  } else {
    var sell_index = _.findIndex(this._openSellOrders, function(order) {
      return order.order_id === order_id;
    });
    if (sell_index !== -1) {
      this._openSellOrders.splice(sell_index, 1);
      this._last_sell_price = this._openSellOrders[0].price;
    }
  }
};

OrderBook.prototype._addOpenOrder = function(order) {
  if (order.side === 'buy') {
    this._openBuyOrders.push(order);
    this._sortByPrice(this._openBuyOrders);
    this._last_buy_price = this._openBuyOrders[this._openBuyOrders.length - 1].price;
  } else {
    this._openSellOrders.push(order);
    this._sortByPrice(this._openSellOrders);
    this._last_sell_price = this._openSellOrders[0].price;
  }
};

OrderBook.prototype._updateChangeOrder = function(order) {
  if (order.side === 'buy') {
    var found_order = _.find(this._openBuyOrders, function(buy_order) {
      return buy_order.order_id === order.order_id;
    });
    if (found_order) {
      _.extend(found_order, { price: order.price, remaining_size: order.remaining_size });
      this._last_buy_price = this._openBuyOrders[this._openBuyOrders.length - 1].price;
    }
  } else {
    var found_order = _.find(this._openSellOrders, function(sell_order) {
      return sell_order.order_id === order.order_id;
    });
    if (found_order) {
      _.extend(found_order, { price: order.price, remaining_size: order.remaining_size });
      this._last_sell_price = this._openSellOrders[0].price;
    }
  }
};

OrderBook.prototype._mapByOrderSequence = function(order_book_sequence_num, orders) {
  return orders.map(function(order) {
    if (parseInt(order.sequence) > order_book_sequence_num) {
      return order;
    }
  });
};

OrderBook.prototype._initOrderBook = function(callback) {
  this.coinbasePublicClient.getProductOrderBook('BTC-USD', 3, function(err, response) {
    var buy_orders = response.body.bids;
    var sell_orders = response.body.asks;
    var order_book_sequence_num = parseInt(response.body.sequence);

    // add orders to split and sort
    buy_orders.forEach(function(order) {
      this._openBuyOrders.push({
        price: parseFloat(order[0]),
        remaining_size: parseFloat(order[1]),
        order_id: order[2]
      });
    }.bind(this));
    this._sortByPrice(this._openBuyOrders);

    sell_orders.forEach(function(order) {
      this._openSellOrders.push({
        price: parseFloat(order[0]),
        remaining_size: parseFloat(order[1]),
        order_id: order[2]
      });
    }.bind(this));
    this._sortByPrice(this._openSellOrders);

    var matches_to_be_applied = this._mapByOrderSequence(order_book_sequence_num, this._initialMatchQueue);
    var dones_to_be_applied = this._mapByOrderSequence(order_book_sequence_num, this._initialDoneQueue);
    var opens_to_be_applied = this._mapByOrderSequence(order_book_sequence_num, this._initialOpenQueue);
    var changes_to_be_applied = this._mapByOrderSequence(order_book_sequence_num, this._initialChangeQueue);

    // remove matches and dones
    // removes do not need to be sorted, arrays are already sorted
    matches_to_be_applied.forEach(this._updateMatchOrder.bind(this));
    dones_to_be_applied.forEach(this._removeDoneOrder.bind(this));

    // sort is applied to each open 
    opens_to_be_applied.forEach(this._addOpenOrder.bind(this));
    changes_to_be_applied.forEach(this._updateChangeOrder.bind(this));

    // cleanup
    this._initialOpenQueue = null;
    this._initialMatchQueue = null;
    this._initialDoneQueue = null;
    this._initialChangeQueue = null;

    // set flag for future feed messages
    this._orderBookInitialized = true;
    callback();
  }.bind(this));
};

/**
*  Match Example
* { 
*   type: 'match',
*   sequence: 18767915,
*   trade_id: 443081,
*   maker_order_id: '04c582b5-8d39-499c-afc3-59f72bcb5007',
*   taker_order_id: 'fb041d1c-066b-47c9-bd31-7b2dd3cf7fe6',
*   side: 'sell',
*   size: '0.30000000',
*   price: '252.79000000',
*   time: '2015-02-28T04:05:06.050645Z'
* }
*/
OrderBook.prototype._onMatch = function(order) {
  if (order.type === 'error') {
    console.log('ERROR: ' + order.message);
  } else {
    order.size = parseFloat(order.size);
    order.price = parseFloat(order.price);

    // winston.log('info', 'match', { price: match_data.price });
    if (!this._orderBookInitialized) {
      this._initialMatchQueue.push(order);
    } else {
      // find and remove from openOrders
      this._updateMatchOrder(order);
      this._queue.push(order);
      this.emit('match', order);
      this._processQueue(1);
    }
  }
};

// open example
// {
//     "type": "open",
//     "time": "2014-11-07T08:19:27.028459Z",
//     "sequence": 10,
//     "order_id": "d50ec984-77a8-460a-b958-66f114b0de9b",
//     "price": "200.2",
//     "remaining_size": "1.00",
//     "side": "sell"
// }
OrderBook.prototype._onOpen = function(order) {
  order.price = parseFloat(order.price);
  order.remaining_size = parseFloat(order.remaining_size);

  if (!this._orderBookInitialized) {
    this._initialOpenQueue.push(order);
  } else {
    this._addOpenOrder(order);
  }
};

OrderBook.prototype._onDone = function(order) {
  // find and remove from openOrders
  if (!this._orderBookInitialized) {
    this._initialDoneQueue.push(order);  
  } else {
    this._removeDoneOrder(order);
  }
};

OrderBook.prototype._onChange = function(order) {
  order.price = parseFloat(order.price);
  order.remaining_size = parseFloat(order.new_size);

  if (!this._orderBookInitialized) {
    this._initialChangeQueue.push(order);
  } else {
    this._updateChangeOrder(order);
  }
};
  
OrderBook.prototype._processQueue = function(process_num) {
  var match_data = this._queue.splice(0, process_num);

  // separate buys from sells
  var sells = this._filterSells(match_data);
  var buys = this._filterBuys(match_data);

  var sorted_sells = this._sortMatchesBySequence(sells);
  var sorted_buys = this._sortMatchesBySequence(buys);

  this.store.add(buys, function() {
    this.store.add(sells, function() {
      this._getMovingAverages(function(moving_averages) {
        this.emit('update', moving_averages);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

OrderBook.prototype._sortMatchesBySequence = function(matches) {
  return _.sortBy(matches, 'sequence');
};

OrderBook.prototype._convertTimestamps = function(match_data) {
  // convert timestamps to UTC
  var converted_match_data = _.map(match_data, function(match) {
    match.time = moment(match.time, moment.ISO_8601).valueOf();
    return match;
  });
  return converted_match_data;
};

OrderBook.prototype._filterBuys = function(match_data) {
  return _.filter(match_data, function(match) {
    return match.side === 'buy';
  });
};

OrderBook.prototype._filterSells = function(match_data) {
  return _.filter(match_data, function(match) {
    return match.side === 'sell';
  });
};

OrderBook.prototype._getMovingAverages = function(all_done_callback) {
  var _this = this;

  async.series({
    one_minute: function(callback) {
      _this._getOneMinuteMovingAverage(function(moving_average) {
        callback(null, moving_average);
      });
    },
    three_minute: function(callback) {
      _this._getThreeMinuteMovingAverage(function(moving_average) {
        callback(null, moving_average);
      });
    },
    five_minute: function(callback) {
      _this._getFiveMinuteMovingAverage(function(moving_average) {
        callback(null, moving_average);
      });
    },
    ten_minute: function(callback) {
      _this._getTenMinuteMovingAverage(function(moving_average) {
        callback(null, moving_average);
      });
    },
    fifteen_minute: function(callback) {
      _this._getFifteenMinuteMovingAverage(function(moving_average) {
        callback(null, moving_average);
      });
    }
  }, function(err, moving_averages) {
    all_done_callback(moving_averages);
  });
};

OrderBook.prototype._getOneMinuteMovingAverage = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(1, 'minutes').toISOString();
  
  this.store.get(start_timestamp, end_timestamp, function(orders) {
    callback(this._calculateOrderAverage(orders));
  }.bind(this));
};

OrderBook.prototype._getThreeMinuteMovingAverage = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(3, 'minutes').toISOString();

  this.store.get(start_timestamp, end_timestamp, function(orders) {
    callback(this._calculateOrderAverage(orders));
  }.bind(this));
};

OrderBook.prototype._getFiveMinuteMovingAverage = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(5, 'minutes').toISOString();

  this.store.get(start_timestamp, end_timestamp, function(orders) {
    callback(this._calculateOrderAverage(orders));
  }.bind(this));
};

OrderBook.prototype._getTenMinuteMovingAverage = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(10, 'minutes').toISOString();

  this.store.get(start_timestamp, end_timestamp, function(orders) {
    callback(this._calculateOrderAverage(orders));
  }.bind(this));
};

OrderBook.prototype._getFifteenMinuteMovingAverage = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(15, 'minutes').toISOString();

  this.store.get(start_timestamp, end_timestamp, function(orders) {
    callback(this._calculateOrderAverage(orders));
  }.bind(this));
};

OrderBook.prototype._calculateOrderAverage = function(orders) {
  var count = orders.length;
  var sum;

  if (count) {
    sum = _.reduce(orders, function(sum, order) {
      return sum + parseFloat(order.price);
    }, 0);
    return sum / count;
  }

  return 0;
};

OrderBook.prototype.hasLastSellPrice = function() {
  return this._last_sell_price !== null;
};

OrderBook.prototype.hasLastBuyPrice = function() {
  return this._last_buy_price !== null;
};

OrderBook.prototype.getLastSellPrice = function() {
  return this._last_sell_price
};

OrderBook.prototype.getLastBuyPrice = function() {
  return this._last_buy_price;
};

module.exports = OrderBook;
