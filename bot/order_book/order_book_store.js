var pg = require('pg');
var _ = require('lodash');
var async = require('async');

var dbQuery = require('../util/query');
var definitions = require('../util/definitions');
var orderDef = definitions.order;

function OrderStore() {}

OrderStore.prototype.init = function(callback) {
  var query = orderDef.create().ifNotExists().toQuery();
  dbQuery(function(result) {
    callback();
  }, function(err) {
    throw new Error(err);
  })(query);
};

OrderStore.prototype.add = function(orders, callback) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    async.eachSeries(orders, function(order, asyncCallback) {
      var query = orderDef.insert(order).toQuery();
      client.query(query, function(err, result) {
        if (err) {
          asyncCallback(err);
        } else {
          asyncCallback();
        }
      });
    }, function(err) {
      done();
      if (err) {
        throw new Error(err);
      } else {
        callback(null); 
      }
    });
  });
};

OrderStore.prototype.get = function(start_timestamp, end_timestamp, callback) {
  var query = orderDef
    .select(orderDef.star())
    .from(orderDef)
    .where(orderDef.time.between(start_timestamp, end_timestamp))
    .toQuery();
  
  dbQuery(function(result) {
    callback(result.rows);
  }, function(err) {
    throw new Error(err);
  })(query);
};

OrderStore.prototype.getBySide = function(side, start_timestamp, end_timestamp, callback) {
  var query = orderDef
    .select('*')
    .from(orderDef)
    .where(
      orderDef.side.equals(side)
      .and(orderDef.time.between(start_timestamp, end_timestamp))
    )
    .toQuery();
  
  dbQuery(function(result) {
    callback(result.rows);
  }, function(err) {
    throw new Error(err);
  })(query);
};

module.exports = OrderStore;
