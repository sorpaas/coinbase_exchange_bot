# Coinbase Exchange Trade Bot

##### Disclaimer: This is an experimental / prototype project. Use with careful consideration.

### About
A Coinbase exchange trade bot that uses the [Websocket Feed](https://docs.exchange.coinbase.com/#websocket-feed) and [Authenticated API](https://docs.exchange.coinbase.com/#private) to make trades based on market spread or moving average trends. Utilizes the [coinbase-exchange-node](https://github.com/coinbase/coinbase-exchange-node) official node library.

### The bot
##### Please read the overview and the source before running the bot

Bot Overview:
- API Access configured through config.json
- intitializes the current USD and BTC account balance
- attempts to keep an up to date order book based on the websocket feed
- attempts to track the highest buy order price and lowest sell order price
- stores match orders in a "order" postgres table as defined in /bot/util/definitions.js
- stores settled buys and sells made by the bot in a "trade" postgres table also 
defined in /bot/util/definitions.js
- uses stored match data to calculate moving averages over 1, 3, 5, 10, and 15 minute
time intervals
- differences in moving averages defined in /bot/trend.js
- primary app logic defined in /bot/macd.js
- buy and sell order wrappers are defined in /bot/order/buy_order.js and /bot/order/sell_order.js
- the primary logic for deciding trade price margins, trade amounts, and tracking active and last active orders is located in /bot/trade_manager/trade_manager.js
- when a buy or sell order is placed, the api will be polled at an interval as defined
in /bot/order/order.js until the order is settled or hits a max try count and is cancelled, at which point a trend shift is identified or the order is retried at a new price

To run the bot:
    ./bot/run.js -a macd

Note: most bot status info and debugging done through the console 

### The dash server
An unfinished dash server is also included. If started after the bot it will connect to the websocket feed exposed by the bot which emits successful buy and sell order data. Order data will then be emitted in turn to a dash which is simply appended to the page.
