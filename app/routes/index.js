var express = require('express');
var router = express.Router();

var _ = require('lodash');

var template_options = { title: 'Exchange Bot' };

router.get('/', function (req, res) {
  res.render('./index.html', _.extend({}, template_options, {}));
});

module.exports = router;
