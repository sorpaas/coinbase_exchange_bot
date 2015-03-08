var pg = require('pg');

module.exports = function(callback, errCallback) {
  return function(query) {
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      client.query(query, function(err, result) {
        done();
        if (err) {
          console.log(err);
          errCallback(err);
        } else {
          callback(result);
        }
      });
    });
  };
};