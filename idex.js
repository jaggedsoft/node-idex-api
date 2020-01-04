(async () => {
    const fs = require('fs');
    const request = require('request');
    const axios = require('axios');
    const BigNumber = require('bignumber.js');
    const readFilePromise = async file => await fs.promises.readFile(file);
    const { soliditySha3 } = require('web3-utils');
    const {
        hashPersonalMessage,
        bufferToHex,
        toBuffer,
        ecsign,
        privateToAddress
    } = require('ethereumjs-util');
    const { mapValues } = require('lodash');
    const idexContractAddress = '0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208';
    let apiKey = "", privateKey = "", headers = { "API-Key": apiKey }, contracts = {};

    // Get IDEX contracts
    const currencies = async () => {
        return new Promise((resolve, reject) => {
            axios.post('https://api.idex.market/returnCurrencies', {}, { headers })
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    throw error;
                });
        });
    };

    // Account nonce
    const get_nonce = async (address) => {
        return new Promise((resolve, reject) => {
            axios.post('https://api.idex.market/returnNextNonce', { address }, { headers })
                .then(function (response) {
                    resolve(response.data.nonce);
                })
                .catch(function (error) {
                    throw error;
                });
        });
    };

    // Convert from human amount to BigNumber
    function expand(amount, decimals = 18) {
        const bn = new BigNumber(amount);
        return bn.times(10 ** decimals).toFixed(0);
    }

    // Return bid and ask
    async function spread(market) {
        if (market.indexOf("_") == -1) market = `ETH_${market}`;
        try {
            let book = await orderBook(market, 1);
            return { ask: book.asks[0].price, bid: book.bids[0].price };
        } catch (error) {
            console.warn(error);
            return false;
        }
    }

    // Fill an orderHash using human numbers for amount
    async function trade(orderHash, amount, decimals = 18) {
        let bigamount = expand(amount, decimals);
        return await rawtrade(orderHash, bigamount);
    }

    // Fill an orderHash using BigNumber
    async function rawtrade(orderHash, amount) {
        const nonce = await get_nonce(address);
        const args = {
            orderHash,
            amount,
            nonce,
            address
        };
        const raw = soliditySha3(
            {
                t: 'uint256',
                v: args.orderHash,
            },
            {
                t: 'uint256',
                v: args.amount,
            },
            {
                t: 'address',
                v: args.address,
            },
            {
                t: 'uint256',
                v: args.nonce,
            },
        );
        const salted = hashPersonalMessage(toBuffer(raw));
        const vrs = mapValues(
            ecsign(salted, toBuffer(privateKey)),
            (value, key) => key === 'v' ? value : bufferToHex(value),
        );
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: 'https://api.idex.market/trade',
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'API-Key': apiKey,
                    'User-agent': 'Node IDEX API'
                },
                json: {
                    address: args.address,
                    orderHash: args.orderHash,
                    amount: args.amount,
                    nonce: args.nonce,
                    v: vrs.v,
                    r: vrs.r,
                    s: vrs.s
                }
            }, function (err, resp, body) {
                if (err) return reject(err);
                return resolve(body);
            });
        });
    }

    // Required to call on startup
    async function init() {
        return contracts = await currencies();
    }

    // Limit Buy
    async function buy(tokenBuy, amountBuy, price) {
        let total = price * amountBuy;
        //let buyTokens = total / price;
        return limit(tokenBuy, amountBuy, 'ETH', total);
    }

    // Limit Sell
    async function sell(tokenSell, amountSell, price) {
        let total = price * amountSell;
        return limit('ETH', total, tokenSell, amountSell);
    }

    // Get decimals for symbol
    function get_decimals(symbol) {
        if (typeof contracts[symbol] == "undefined") throw `get_decimals undefined: ${symbol}`;
        return contracts[symbol].decimals;
    }

    // Get BigNumber for human amount, and decimals for symbol
    function get_amount(symbol, amount) {
        return expand(amount, get_decimals(symbol));
    }

    // Limit order
    async function limit(tokenBuy, amountBuy, tokenSell, amountSell, buyDecimals = 18, sellDecimals = 18) {
        if (tokenBuy.length !== 42) {
            if (typeof contracts[tokenBuy] == "undefined") throw `tokenBuy undefined: ${tokenBuy}`;
            buyDecimals = contracts[tokenBuy].decimals;
            tokenBuy = contracts[tokenBuy].address;
        }
        if (tokenSell.length !== 42) {
            if (typeof contracts[tokenSell] == "undefined") throw `tokenSell undefined: ${tokenBuy}`;
            sellDecimals = contracts[tokenSell].decimals;
            tokenSell = contracts[tokenSell].address;
        }
        const nonce = await get_nonce(address);
        const bigBuy = new BigNumber(amountBuy), bigSell = new BigNumber(amountSell);
        amountBuy = bigBuy.times(10 ** buyDecimals).toFixed(0);
        amountSell = bigSell.times(10 ** sellDecimals).toFixed(0);
        return new Promise((resolve, reject) => {
            const args = {
                tokenBuy,
                amountBuy,
                tokenSell,
                amountSell,
                address,
                nonce,
                expires: 100000,
            };
            const raw = soliditySha3(
                {
                    t: 'address',
                    v: idexContractAddress,
                },
                {
                    t: 'address',
                    v: args.tokenBuy,
                },
                {
                    t: 'uint256',
                    v: args.amountBuy,
                },
                {
                    t: 'address',
                    v: args.tokenSell,
                },
                {
                    t: 'uint256',
                    v: args.amountSell,
                },
                {
                    t: 'uint256',
                    v: args.expires,
                },
                {
                    t: 'uint256',
                    v: args.nonce,
                },
                {
                    t: 'address',
                    v: args.address,
                },
            );
            const salted = hashPersonalMessage(toBuffer(raw));
            const vrs = mapValues(
                ecsign(salted, toBuffer(privateKey)),
                (value, key) => key === 'v' ? value : bufferToHex(value),
            );

            request({
                method: 'POST',
                url: 'https://api.idex.market/order',
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'API-Key': apiKey,
                    'User-agent': 'Node IDEX API'
                },
                json: {
                    tokenBuy: args.tokenBuy,
                    amountBuy: args.amountBuy,
                    tokenSell: args.tokenSell,
                    amountSell: args.amountSell,
                    address: args.address,
                    nonce: args.nonce,
                    expires: args.expires,
                    v: vrs.v,
                    r: vrs.r,
                    s: vrs.s
                }
            }, function (err, resp, body) {
                if (err) return reject(err);
                return resolve(body);
            });
        });
    }

    // Cancel All
    async function cancelAll(side = false) {
        let orders = await get_open_orders(false, address, 100);
        for (let order of orders) {
            if (side && order.type != side) continue;
            console.info(`..${order.type} ${Number(order.total).toFixed(2)} ${order.params.sellSymbol} worth of ${order.params.buySymbol} @ ${Number(order.price).toFixed(8)}`);
            await cancel(order.orderHash);
        }
    }

    // Cancel individual orderHash
    async function cancel(orderHash) {
        const nonce = await get_nonce(address);
        const args = {
            orderHash,
            nonce,
            address,
        };
        const raw = soliditySha3(
            {
                t: 'uint256',
                v: orderHash,
            },
            {
                t: 'uint256',
                v: nonce,
            },
        );
        const salted = hashPersonalMessage(toBuffer(raw));
        const vrs = mapValues(
            ecsign(salted, toBuffer(privateKey)),
            (value, key) => key === 'v' ? value : bufferToHex(value),
        );

        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: 'https://api.idex.market/cancel',
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'API-Key': apiKey,
                    'User-agent': 'Node IDEX API'
                },
                json: {
                    orderHash: args.orderHash,
                    nonce: args.nonce,
                    address,
                    v: vrs.v,
                    r: vrs.r,
                    s: vrs.s
                }
            }, function (err, resp, body) {
                if (err) return reject(err);
                return resolve(body);
            });
        });
    }

    // Get IDEX trade history for a symbol
    const get_trade_history = async (address = false, market = false, start = 0, count = 0, sort = "desc") => {
        //if (!start) start = new Date().getTime() - (60 * 60 * 24 * 90); // 90 days default
        return new Promise((resolve, reject) => {
            let params = { sort };
            if (address) params.address = address;
            if (market) params.market = market;
            if (start) params.start = parseInt(start / 1000);
            if (count) params.count = count;
            axios.post('https://api.idex.market/returnTradeHistory', params, { headers })
                .then(function (response) {
                    resolve(response);
                })
                .catch(function (error) {
                    throw error;
                });
        });
    }

    // Get IDEX order book for a market
    const orderBook = (market, count = 20) => {
        if (market.indexOf("_") == -1) market = `ETH_${market}`;
        //if (!start) start = new Date().getTime() - (60 * 60 * 24 * 90); // 90 days default
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: 'https://api.idex.market/returnOrderBook',
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'API-Key': apiKey,
                    'User-agent': 'Node IDEX API'
                },
                json: { market, count }
            }, function (err, resp, body) {
                if (err) return reject(err);
                return resolve(body);
            });
        });
    }

    // Get IDEX balances for an address
    const get_balances = (address = false) => {
        if (!address) address = get_address();
        return new Promise((resolve, reject) => {
            axios.post('https://api.idex.market/returnBalances', { address }, { headers })
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    };

    // Get IDEX ticker
    const ticker = (market = false) => {
        return new Promise((resolve, reject) => {
            let params = market ? { market } : {};
            axios.post('https://api.idex.market/returnTicker', params, { headers })
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    };

    // Get 24h Volume
    const return24Volume = (region = false) => {
        return new Promise((resolve, reject) => {
            let params = region ? { region } : {};
            axios.post('https://api.idex.market/return24Volume', params, { headers })
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    };

    // Get IDEX open orders
    const get_open_orders = (market = false, address = false, count = 10) => {
        return new Promise((resolve, reject) => {
            let params = { count };
            if (market) params.market = market;
            if (address) params.address = address;
            axios.post('https://api.idex.market/returnOpenOrders', params, { headers })
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    throw error;
                });
        });
    };

    // Get Contract Event Logs
    const get_contract_eventlog = (address, contract) => {
        return new Promise((resolve, reject) => {
            axios.post(`https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=${contract}&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&topic2=0x000000000000000000000000${address.substr(2)}`, {})
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    throw error;
                });
        });
    };

    // Random number within range
    const get_random = (min, max) => {
        return Math.random() * (max - min) + min;
    };

    // Withdraw
    async function withdraw(symbol, amount) {
        if (typeof contracts[symbol] == "undefined") throw `withdraw: invalid symbol: ${symbol}`;
        let decimals = contracts[symbol].decimals;
        let token = contracts[symbol].address;
        let bigamount = expand(amount, decimals);
        const nonce = await get_nonce(address);
        const raw = soliditySha3(
            {
                t: 'address',
                v: idexContractAddress,
            },
            {
                t: 'address',
                v: token,
            },
            {
                t: 'uint256',
                v: bigamount,
            },
            {
                t: 'address',
                v: address,
            },
            {
                t: 'uint256',
                v: nonce
            }
        );
        const salted = hashPersonalMessage(toBuffer(raw));
        const vrs = mapValues(
            ecsign(salted, toBuffer(privateKey)),
            (value, key) => key === 'v' ? value : bufferToHex(value),
        );
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: 'https://api.idex.market/withdraw',
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'API-Key': apiKey,
                    'User-agent': 'Node IDEX API'
                },
                json: {
                    address,
                    token,
                    nonce,
                    amount: bigamount,
                    v: vrs.v,
                    r: vrs.r,
                    s: vrs.s
                }
            }, function (err, resp, body) {
                if (err) return reject(err);
                return resolve(body);
            });
        });
    }

    // todo: marketBuy, marketSell: like below but continues until all is sold    
    // Buy amount from cheapest sell order
    async function chomp_buy(market, maxAmount = Infinity) {
        let book = await orderBook(market, 1), obj = book.asks[0];
        let price = obj.price, orderHash = obj.orderHash, amount = obj.amount;
        console.info(`${amount} @ ${price} ${orderHash}`);
        let rawAmount = obj.params.amountBuy;
        if (rawAmount > maxAmount) rawAmount = maxAmount;
        let order = await rawtrade(orderHash, rawAmount);
        console.info(order);
    }

    // Sell amount into best buy order
    async function chomp_sell(symbol, maxAmount = Infinity) {
        let market = `ETH_${symbol}`, book = await orderBook(market, 1), obj = book.bids[0];
        let price = obj.price, orderHash = obj.orderHash, amount = obj.amount;
        console.info(`${amount} @ ${price} ${orderHash}`);
        let rawAmount = obj.params.amountBuy;
        if (Number(amount) > Number(maxAmount)) {
            let order = await trade(orderHash, maxAmount, get_decimals(symbol));
            return console.info(order);
        }
        let order = await rawtrade(orderHash, rawAmount);
        console.info(order);
    }

    // Set API Key
    const set_apikey = (key) => {
        apiKey = key;
        headers = { "API-Key": apiKey };
    };

    // Convert private key to public ethereum address
    const get_address = () => {
        return '0x' + privateToAddress(privateKey).toString('hex');
    };

    // Pass apiKey and privateKey as parameters or from json.
    const auth = (_apiKey, _privateKey = false) => {
        if (_apiKey.endsWith(".json")) {
            let json = JSON.parse(fs.readFileSync(_apiKey, "utf8"));
            _apiKey = json.apiKey;
            privateKey = json.privateKey;
        } else {
            privateKey = _privateKey;
        }
        if (!privateKey) throw "Invalid privateKey";
        if (!_apiKey) console.warn("WARN: apiKey is not set");
        set_apikey(_apiKey);
        return get_address();
    };

    async function api(action, json = {}) {
        const userAgent = 'Mozilla/4.0 (compatible; Node IDEX API)';
        const contentType = 'application/json';
        let headers = {
            'User-Agent': userAgent,
            'Content-type': contentType
        };
        try {
            const response = await axios.request({
                url: action,
                headers: headers,
                method: 'POST',
                baseURL: 'https://api.idex.market/',
                data: json
            });
            if (response && response.status !== 200) return new Error(JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            return new Error(JSON.stringify(error.response.data));
        }
    }

    // So long, and thanks for all the fish!
    module.exports = {
        init,
        buy,
        sell,
        trade,
        rawtrade,
        limit,
        cancel,
        cancelAll,
        expand,
        get_nonce,
        get_decimals,
        currencies,
        ticker,
        get_amount,
        chomp_sell,
        chomp_buy,
        orderBook,
        spread,
        get_balances,
        get_random,
        set_apikey,
        withdraw,
        auth,
        balances: get_balances,
        get_address,
        return24Volume,
        returnTicker: async function returnTicker(ticker) {
            const json = { market: `${ticker}` }
            return await api(`returnTicker`, json)
        },
        returnOpenOrders: async function returnOpenOrders(market, address = null) {
            console.log({ market })
            return await api(`returnOpenOrders`, { market, address })
        },
        returnOrderBook: async function returnOrderBook(market, count = 100) {
            return await api(`returnOrderBook`, { market, count })
        },
        returnOrderStatus: async function returnOrderStatus(orderHash) {
            return await api(`returnOrderStatus`, { orderHash })
        },
        returnTradeHistory: async function returnTradeHistory() {
            return await api(`returnTradeHistory`)
        },
        returnCurrencies: async function returnCurrencies() {
            return await api(`returnCurrencies`)
        },
        returnBalances: async function returnBalances() {
            return await api(`returnBalances`)
        },
        returnCompleteBalances: async function returnCompleteBalances() {
            return await api(`returnCompleteBalances`)
        },
        returnDepositsWithdrawals: async function returnDepositsWithdrawals() {
            return await api(`returnDepositsWithdrawals`)
        },
        returnOrderTrades: async function returnOrderTrades() {
            return await api(`returnOrderTrades`)
        },
        returnNextNonce: async function returnNextNonce(address) {
            return await api(`returnNextNonce`, { address })
        },
        returnContractAddress: async function returnContractAddress() {
            return await api(`returnContractAddress`)
        },
        // Convert to sortable array. {"ETHBTC":{}} to [{symbol:"ETHBTC"}]
        obj_to_array: json => {
            let output = [];
            for (let key in json) {
                let obj = json[key];
                obj.symbol = key;
                output.push(obj);
            }
            return output;
        }
    };
})();
