#!/usr/bin/env node

var OrderBook = require('./order_book/order_book');
var Trend = require('./trend');
var TradeManager = require('./trade_manager/trade_manager');
var socketIO = require('socket.io');
var config = require('../config.json');

module.exports = function() {
  var orderBook = new OrderBook();
  var trend = new Trend();
  var tradeManager = new TradeManager(config);

  // setup socket server
  var io = socketIO.listen(8888);
  var socket = null;
  io.on('connection', function(s) {
    socket = s;
  });

  function socketEmit(name, data) {
    if (socket) {
      socket.emit(name, data);
    }
  }

  tradeManager.init(function() {
    var tickId = null;
    var updates_initialized = false;

    orderBook.on('update', function(moving_averages) {
      updates_initialized = true;
      trend.updateMovingAverages(moving_averages);
    });

    // NOTES:
    // when placing a buy or sell order, we want to cancel match stream
    // and cancel next tick, so no actions can occur while waiting for 
    // order submission
    function stopProcess() {
      clearInterval(tickId);
    }

    // EVENT INIT
    function startProcess() {
      // we only want to take actions at some minimum interval
      tickId = setInterval(nextTick, 1000);
    }

    function placeBuyIfNotExists() {
      if (!tradeManager.hasLastSuccessfulBuy()) {
        if (orderBook.hasLastBuyPrice()) {
          stopProcess();
          tradeManager.placeBuyOrder(orderBook.getLastBuyPrice());
        } else {
          console.log('NO LAST BUY PRICE');
        }
      } else {
        console.log('ACTIVE BUY WAITING -- OR -- WAITING FOR BEARISH');
      }
    }

    function placeSellIfNotExists() {
      if (!tradeManager.hasLastSuccessfulSell()) {
        if (orderBook.hasLastSellPrice()) {
          stopProcess();
          tradeManager.placeSellOrder(orderBook.getLastSellPrice());
        } else {
          console.log('NO LAST SELL PRICE');
        }
      } else {
        console.log('ACTIVE SELL WAITING -- OR -- WAITING FOR BULLISH');
      }
    }

    function logStatus() {
      var last_sell_price = null;
      var last_buy_price = null;
      var is_impish = false;
      var is_admirable = false;

      if (orderBook.hasLastSellPrice()) {
        last_sell_price = orderBook.getLastSellPrice();
      }

      if (orderBook.hasLastBuyPrice()) {
        last_buy_price = orderBook.getLastBuyPrice();
      }

      is_impish = trend.isBearish();
      is_admirable = trend.isBullish();

      console.log('IMPISH: ' + is_impish + ' --- ADMIRABLE: ' + is_admirable);
      console.log('LAST BUY: ' + last_buy_price + ' --- ' + 'LAST SELL: ' + last_sell_price);
    }

    function nextTick() {
      if (updates_initialized) {
        logStatus();

        socketEmit('status', {
          last_sell_price: orderBook.hasLastSellPrice() ? orderBook.getLastSellPrice() : null,
          last_buy_price: orderBook.hasLastBuyPrice() ? orderBook.getLastBuyPrice() : null,
          bearish: trend.isBearish(),
          bullish: trend.isBullish()
        });

        // spread only, successful on >= ~10 cent spread at low volumes ( below .5 BTC )
        // doesn't seem to be enough volume to fill .5 BTC and up all at once
        // if (orderBook.hasLastSellPrice() && orderBook.hasLastBuyPrice()) {
        //   if (tradeManager.hasReachedProfitMargin(orderBook.getLastSellPrice(), orderBook.getLastBuyPrice())) {
        //     if (!tradeManager.hasLastSuccessfulBuy()) {
        //       placeBuyIfNotExists();
        //     } else {
        //       placeSellIfNotExists();
        //     }
        //   } else if (tradeManager.hasLastSuccessfulBuy()) {
        //     placeSellIfNotExists();
        //   }
        // }

        // spread based on trend, mediocre results
        // if (orderBook.hasLastSellPrice() && tradeManager.hasReachedProfitMargin(orderBook.getLastSellPrice())) {
        //   if (tradeManager.hasEverFilledBuy()) {
        //     console.log('*** attempting sell based on margin ***');
        //     placeSellIfNotExists();
        //     return;
        //   }
        // }

        // MACD trend buy/sell
        if (trend.isBullish()) {
          placeBuyIfNotExists();
          return;
        }

        if (trend.isBearish()) {
          if (tradeManager.hasEverFilledBuy()) {
            placeSellIfNotExists();
            return;
          }
        }
      }
    }

    tradeManager.on('buy:settled', function(order_data) {
      startProcess();
      tradeManager.getTradeHistoryStats(function(stats) {
        // console.log('TOTAL BUY VAL: ' + stats.daily_stats.total_buy_value + ' --- TOTAL SELL VAL: ' + stats.daily_stats.total_sell_value);
        socketEmit('buy:settled', { 
          order_data: order_data,
          stats: stats
        });
      });
    });

    tradeManager.on('sell:settled', function(order_data) {
      startProcess();
      tradeManager.getTradeHistoryStats(function(stats) {
        console.log('TOTAL BUY VAL: ' + stats.daily_stats.total_buy_value + ' --- TOTAL SELL VAL: ' + stats.daily_stats.total_sell_value);
        socketEmit('sell:settled', { 
          order_data: order_data,
          stats: stats
        });
      });
    });

    tradeManager.on('buy:cancelled', function(order_data) {
      startProcess();
      socketEmit('buy:cancelled', order_data);
    });

    tradeManager.on('sell:cancelled', function(order_data) {
      startProcess();
      socketEmit('sell:cancelled', order_data);
    });

    // kick start the trader in 60 seconds to allow the order book time to get started
    setTimeout(function() {
      startProcess();
    }, 60000);
  });
};
