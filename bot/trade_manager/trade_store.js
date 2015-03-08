var pg = require('pg');
var _ = require('lodash');
var async = require('async');
var moment = require('moment');

var dbQuery = require('../util/query');
var definitions = require('../util/definitions');
var tradeDef = definitions.trade;

function TradeStore() {}

TradeStore.prototype.init = function(callback) {
  var query = tradeDef.create().ifNotExists().toQuery();
  dbQuery(function(result) {
    if (callback) {
      callback();
    }
  }, function(err) {
    throw new Error(err);
  })(query);
};

TradeStore.prototype._createTradeObject = function(trade) {
  return  {
    trade_id: trade.id,
    size: trade.size,
    price: trade.price,
    done_reason: trade.done_reason,
    status: trade.status,
    settled: trade.settled,
    filled_size: trade.filled_size,
    product_id: trade.product_id,
    fill_fees: trade.fill_fees,
    side: trade.side,
    trade_created_at: trade.created_at,
    trade_done_at: trade.done_at
  };
};

TradeStore.prototype.add = function(trade, callback) {
  var query = tradeDef.insert(this._createTradeObject(trade)).toQuery();
  dbQuery(function(result) {
    if (callback) {
      callback();
    }
  }, function(err) {
    throw new Error(err);
  })(query);
};

TradeStore.prototype.getDailyTradeStats = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(1, 'hour').toISOString();
  var query = tradeDef
    .select(tradeDef.star())
    .where(
      tradeDef.trade_done_at.between(start_timestamp, end_timestamp)
    )
    .toQuery();

  dbQuery(function(result) {
    var rows = result.rows;
    // console.log(result.rows);
    var buys = _.filter(rows, function(trade) {
      return trade.side === 'buy';
    });
    var sells = _.filter(rows, function(trade) {
      return trade.side === 'sell';
    });
    var total_buy_value = buys.reduce(function(sum, buy_trade) {
      return sum + (parseFloat(buy_trade.size) * parseFloat(buy_trade.price));
    }, 0);
    var total_sell_value = sells.reduce(function(sum, sell_trade) {
      return sum + (parseFloat(sell_trade.size) * parseFloat(sell_trade.price));
    }, 0);

    if (callback) {
      callback({
        total_buy_value: total_buy_value,
        total_sell_value: total_sell_value
      });
    }
  }, function(err) {
    throw new Error(err);
  })(query);
};

TradeStore.prototype.getWeeklyTradeStats = function(callback) {
  var end_timestamp = moment().toISOString();
  var start_timestamp = moment().subtract(1, 'week').toISOString();
  var query = tradeDef
    .select(tradeDef.star())
    .where(
      tradeDef.trade_done_at.between(start_timestamp, end_timestamp)
    )
    .toQuery();

  dbQuery(function(result) {
    var rows = result.rows;
    var buys = _.filter(rows, function(trade) {
      return trade.side === 'buy';
    });
    var sells = _.filter(rows, function(trade) {
      return trade.side === 'sell';
    });
    var total_buy_value = buys.reduce(function(sum, buy_trade) {
      return sum + (parseFloat(buy_trade.size) * parseFloat(buy_trade.price));
    }, 0);
    var total_sell_value = sells.reduce(function(sum, sell_trade) {
      return sum + (parseFloat(sell_trade.size) * parseFloat(sell_trade.price));
    }, 0);

    if (callback) {
      callback({
        total_buy_value: total_buy_value,
        total_sell_value: total_sell_value
      });
    }
  }, function(err) {
    throw new Error(err);
  })(query);
};

module.exports = TradeStore;