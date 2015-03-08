var sql = require('sql');

// *   sequence: 18767915,
// *   trade_id: 443081,
// *   maker_order_id: '04c582b5-8d39-499c-afc3-59f72bcb5007',
// *   taker_order_id: 'fb041d1c-066b-47c9-bd31-7b2dd3cf7fe6',
// *   side: 'sell',
// *   size: '0.30000000',
// *   price: '252.79000000',
// *   time: '2015-02-28T04:05:06.050645Z'

var order = sql.define({
  name: 'order',
  columns: [
    {
      name: 'id',
      dataType: 'serial',
      primaryKey: true
    },
    {
      name: 'type',
      dataType: 'varchar(10)'
    },
    {
      name: 'side',
      dataType: 'varchar(10)'
    },
    {
      name: 'sequence',
      dataType: 'int'
    },
    {
      name: 'trade_id',
      dataType: 'int'
    },
    {
      name: 'maker_order_id',
      dataType: 'varchar(36)'
    },
    {
      name: 'taker_order_id',
      dataType: 'varchar(36)'
    },
    {
      name: 'size',
      dataType: 'decimal'
    },
    {
      name: 'price',
      dataType: 'decimal'
    },
    {
      name: 'time',
      dataType: 'timestamptz'
    },
    {
      name: 'created_at',
      dataType: 'timestamptz'
    },
    {
      name: 'last_updated',
      dataType: 'timestamptz'
    }
  ]
});

// {
//     "id": "d50ec984-77a8-460a-b958-66f114b0de9b",
//     "size": "3.0",
//     "price": "100.23",
//     "done_reason": "canceled",
//     "status": "done",
//     "settled": true,
//     "filled_size": "1.3",
//     "product_id": "BTC-USD"
//     "fill_fees": "0.001",
//     "side": "buy",
//     "created_at": "2014-11-14 06:39:55.189376+00",
//     "done_at": "2014-11-14 06:39:57.605998+00"
// }
var trade = sql.define({
  name: 'trade',
  columns: [
    {
      name: 'id',
      dataType: 'serial',
      primaryKey: true
    },
    {
      name: 'trade_id',
      dataType: 'varchar(36)'
    },
    {
      name: 'product_id',
      dataType: 'varchar(10)'
    },
    {
      name: 'done_reason',
      dataType: 'varchar(15)'
    },
    {
      name: 'filled_size',
      dataType: 'decimal'
    },
    {
      name: 'status',
      dataType: 'varchar(15)'
    },
    {
      name: 'price',
      dataType: 'decimal'
    },
    {
      name: 'size',
      dataType: 'decimal'
    },
    {
      name: 'trade_done_at',
      dataType: 'timestamptz'
    },
    {
      name: 'trade_created_at',
      dataType: 'timestamptz'
    },
    {
      name: 'fill_fees',
      dataType: 'decimal'
    },
    {
      name: 'settled',
      dataType: 'boolean'
    },
    {
      name: 'side',
      dataType: 'varchar(10)'
    },
    {
      name: 'created_at',
      dataType: 'timestamptz'
    },
    {
      name: 'last_updated',
      dataType: 'timestamptz'
    }
  ]
});

module.exports = {
  order: order,
  trade: trade
};
