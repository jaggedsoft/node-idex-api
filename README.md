[![Latest Version](https://img.shields.io/github/release/jaggedsoft/node-idex-api.svg?style=flat-square)](https://github.com/jaggedsoft/node-idex-api/releases) 
[![GitHub last commit](https://img.shields.io/github/last-commit/jaggedsoft/node-idex-api.svg?maxAge=2400)](#)
[![npm downloads](https://img.shields.io/npm/dt/node-idex-api.svg?maxAge=7200)](https://www.npmjs.com/package/node-idex-api)

[![NPM](https://nodei.co/npm/node-idex-api.png?compact=true)](https://npmjs.org/package/node-idex-api)

#### Installation
```
npm install node-idex-api
```

This project is designed to help you make your own projects that interact with the [IDEX API](https://docs.idex.market/) in node.js.

#### Getting Started
```js
( async () => {
    const idex = require( "node-idex-api" );
    await idex.init(); // Required

    // Load credentials from json: (apiKey and privateKey)
    let address = idex.auth( 'options.json' );
    // Or manually: await idex.auth( apiKey, privateKey );

    console.info( `ETH Address: ${address}` );
    console.log( await idex.balances() );
} )();
```

#### Examples
```js
// Get ticker
console.log( await idex.ticker() );

// Get 24h volume/price change statistics
console.log( await idex.return24Volume() );

// List all currencies
console.log( await idex.currencies() );

// Get your balances
console.log( await idex.balances() );

// Get someone else's balance
console.log( await idex.balances('0x7daf74408598eca4adf81445d21bcb3e2899f6f7') );

// Get spread
console.log( await idex.spread('QNT') );

// Get order book
console.log( await idex.orderBook('IDEX') );

// Cancel all orders
console.log( await idex.cancelAll() );

// Cancel just buy or sell orders
console.log( await idex.cancelAll('sell') );

// Limit buy
console.log( await idex.buy(symbol, amount, price) );

// Limit sell
console.log( await idex.sell(symbol, amount, price) );

// Fill an order
console.log( await idex.trade(orderHash, amount, decimals) );

// Cancel individual orderHash
console.log( await idex.cancel(orderHash) );

// Withdraw
console.log( await idex.withdraw(symbol, amount) );
```

> #### Example: Get Top 10 highest volume symbols
```js
let ticker = await idex.returnTicker(); //last high low lowestAsk highestBid percentChange baseVolume quoteVolume
let sorted = idex.obj_to_array(ticker).sort(function(a, b) {
    return b.baseVolume - a.baseVolume;
});
console.log(sorted.slice(0, 10));
```

```js
returnTicker(symbol)
returnOpenOrders(address)
returnOrderBook(symbol)
returnOrderStatus(orderHash)
returnTradeHistory()
returnCurrencies()
returnBalances()
returnCompleteBalances()
returnDepositsWithdrawals()
returnOrderTrades()
returnNextNonce()
returnContractAddress()
```

## Troubleshooting
Automatically 'throw' errors to reveal more information:
```js
process.on( 'unhandledRejection', up => { throw up } );
```
<!-- ## Stargazers over time

[![Stargazers over time](https://starcharts.herokuapp.com/jaggedsoft/node-idex-api.svg)](https://starcharts.herokuapp.com/jaggedsoft/node-idex-api)
-->

[![Views](http://hits.dwyl.io/jaggedsoft/node-idex-api.svg)](http://hits.dwyl.io/jaggedsoft/node-idex-api)
[![jaggedsoft on Twitter](https://img.shields.io/twitter/follow/jaggedsoft.svg?style=social)](https://twitter.com/jaggedsoft)

