var EventEmitter = require('events').EventEmitter;
var util = require('util');

var CoinbaseExchange = require('coinbase-exchange');
var _ = require('lodash');

var BuyOrder = require('../order/buy_order');
var SellOrder = require('../order/sell_order');
var TradeStore = require('./trade_store');

function TradeManager(config) {
  EventEmitter.call(this);

  if (!config.key) {
    throw new Error('AUTH KEY REQUIRED');
  }
  if (!config.secret) {
    throw new Error('AUTH SECRET REQUIRED');
  }
  if (!config.passphrase) {
    throw new Error('AUTH PASSPHRASE REQUIRED');
  }
  
  this._authedClient = new CoinbaseExchange.AuthenticatedClient(
    config.key, config.secret, config.passphrase
  );

  this._tradeStore = new TradeStore();

  this._buy_order_ever_filled = false;

  this._lastSuccessfulBuyOrder = null;
  this._lastSuccessfulSellOrder = null;
  this._activeBuyOrder = null;
  this._activeSellOrder = null;

  this._usdAccount = null;
  this._btcAccount = null;
}

util.inherits(TradeManager, EventEmitter);

TradeManager.prototype.init = function(callback) {
  //'[
  // {"id":"77443e3e-1944-4572-8bf6-7cc16be7e1e7","currency":"USD","balance":"0.0000000000000000","hold":"0.0000000000000000","available":"0.0000000000000000","profile_id":"a24bfd16-48e1-4394-9aff-e5a47eb3b3d8"},
  // {"id":"f7e10e8f-16f1-4dea-8827-18ff4a5a6800","currency":"BTC","balance":"0.0000000000000000","hold":"0.0000000000000000","available":"0.0000000000000000","profile_id":"a24bfd16-48e1-4394-9aff-e5a47eb3b3d8"}
  // ]'
  this._tradeStore.init(function() {
    this._authedClient.getAccounts(function(err, response, data) {
      this._usdAccount = _.find(data, function(account) {
        return account.currency === 'USD';
      });

      this._btcAccount = _.find(data, function(account) {
        return account.currency === 'BTC';
      });

      callback();
    }.bind(this));
  }.bind(this));
};

TradeManager.prototype._getMinimumTradeAmount = function(price) {
  // the minimum trade amount of BTC is 0.01
  return 0.01; // change this
};

// sell margin should try to make 10 cents on the last buy
TradeManager.prototype._getSellMarginPercentage = function(last_price) {
  return parseFloat((0.01 / last_price).toFixed(6));
};

// buy margin should try to buy at 0.05 cents lower than last buy
TradeManager.prototype._getBuyMarginPercentage = function(last_price) {
  return parseFloat((0.01 / last_price).toFixed(6));
};

// margin price = price * margin percentage
TradeManager.prototype._getSellMarginPrice = function(last_price) {
  return parseFloat((this._getSellMarginPercentage(last_price) * last_price).toFixed(2));
};

TradeManager.prototype._getBuyMarginPrice = function(last_price) {
  return parseFloat((this._getBuyMarginPercentage(last_price) * last_price).toFixed(2));
};

// sell = price - margin price
TradeManager.prototype._getSellPrice = function(last_price) {
  return parseFloat((last_price - this._getSellMarginPrice(last_price)).toFixed(2));
};

// buy = price + margin price
TradeManager.prototype._getBuyPrice = function(last_price) {
  return parseFloat((last_price + this._getBuyMarginPrice(last_price)).toFixed(2));
};

TradeManager.prototype.getUSDAvailableBalance = function() {
  return this._usdAccount.available;
};

TradeManager.prototype.getBTCAvailableBalance = function() {
  return this._btcAccount.available;
};

TradeManager.prototype.hasLastSuccessfulSell = function() {
  return this._lastSuccessfulSellOrder !== null;
};

TradeManager.prototype.hasLastSuccessfulBuy = function() {
  return this._lastSuccessfulBuyOrder !== null;
};

TradeManager.prototype.hasEverFilledBuy = function() {
  return this._buy_order_ever_filled;
};

TradeManager.prototype.hasReachedProfitMargin = function(last_sell_price, last_buy_price) {
  var margin = 0.12;
  var margin_price = last_buy_price + margin;
  return last_sell_price >= margin_price;
};

TradeManager.prototype.placeBuyOrder = function(last_price, callback) {
  var buyOrder = new BuyOrder({
    authedClient: this._authedClient,
    tradeStore: this._tradeStore,
    price: this._getBuyPrice(last_price),
    size: this._getMinimumTradeAmount(last_price)
  });

  buyOrder.on('placed', this._onBuyOrderPlaced.bind(this));
  buyOrder.on('settled', this._onBuyOrderSettled.bind(this));
  buyOrder.on('cancelled', this._onBuyOrderCancelled.bind(this));
  this._activeBuyOrder = buyOrder;
  buyOrder.place();
};

TradeManager.prototype._onBuyOrderPlaced = function(placed_order_data) {
  this.emit('buy:placed', placed_order_data);
  console.log('---------- buy order placed ----------');
};

TradeManager.prototype._onBuyOrderSettled = function(order_data) {
  this._activeBuyOrder = null;
  this._lastSuccessfulBuyOrder = order_data;
  this._lastSuccessfulSellOrder = null;
  this._buy_order_ever_filled = true;
  this.emit('buy:settled', order_data);
  console.log('---------- buy order settled ----------');
};

TradeManager.prototype._onBuyOrderCancelled = function() {
  this._activeBuyOrder = null;
  this._lastSuccessfulBuyOrder = null;
  this.emit('buy:cancelled');
  console.log('---------- buy order cancelled ----------');
};

TradeManager.prototype.placeSellOrder = function(last_price, callback) {
  var sellOrder = new SellOrder({
    authedClient: this._authedClient,
    tradeStore: this._tradeStore,
    price: this._getSellPrice(last_price),
    size: this._getMinimumTradeAmount(last_price)
  });

  sellOrder.on('placed', this._onSellOrderPlaced.bind(this));
  sellOrder.on('settled', this._onSellOrderSettled.bind(this));
  sellOrder.on('cancelled', this._onSellOrderCancelled.bind(this));
  this._activeSellOrder = sellOrder;
  sellOrder.place();
};

TradeManager.prototype._onSellOrderPlaced = function(placed_order_data) {
  this.emit('sell:placed', placed_order_data);
  console.log('---------- sell order placed ----------');
};

TradeManager.prototype._onSellOrderSettled = function(order_data) {
  this._activeBuyOrder = null;
  this._lastSuccessfulSellOrder = order_data;
  this._lastSuccessfulBuyOrder = null;
  this.emit('sell:settled', order_data);
  console.log('---------- sell order settled ----------');
};

TradeManager.prototype._onSellOrderCancelled = function() {
  this._activeSellOrder = null;
  this._lastSuccessfulSellOrder = null;
  this.emit('sell:cancelled');
  console.log('---------- sell order cancelled ----------');
};

// only to be called if active sell order exists
TradeManager.prototype.cancelActiveSellOrder = function(callback) {
  this._activeSellOrder.cancel();
};

// only to be called if active buy order exists
TradeManager.prototype.cancelActiveBuyOrder = function(callback) {
  this._activeBuyOrder.cancel();
};

TradeManager.prototype.getTradeHistoryStats = function(callback) {
  this._tradeStore.getDailyTradeStats(function(daily_stats) {
    callback({ daily_stats: daily_stats });
  }.bind(this));
};

module.exports = TradeManager;
