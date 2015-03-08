
function Trend() {
  this._moving_averages = null;
}

Trend.prototype.updateMovingAverages = function(moving_averages) {
  this._moving_averages = moving_averages;
};

Trend.prototype.isBearish = function() {
  return this._moving_averages.one_minute < this._moving_averages.three_minute;
};

Trend.prototype.isBullish = function() {
  return this._moving_averages.three_minute > this._moving_averages.five_minute;
};

module.exports = Trend;
