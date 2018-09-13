module.exports = function () {
    'use strict';
    const WebSocket = require('ws');
    const axios = require('axios');
    const socket = new WebSocket('wss://api-cluster.idex.market');

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
                method: 'POST',
                headers: headers,
                baseURL: 'https://api.idex.market/'
            }, json);
            if (response && response.status !== 200) return new Error(JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            return new Error(JSON.stringify(error.response.data));
        }
    };

    return {
        returnTicker: async function returnTicker(ticker) {
            const json = { market: `${ticker}` }
            return await api(`returnTicker`, json)
        },
        returnTickers: async function returnTickers(ticker) {
            return await returnTicker()
        },
        return24Volume: async function return24Volume() {
            return await api(`return24Volume`)
        },
        returnOpenOrders: async function returnOpenOrders(market, address = null) {
            console.log({ market })
            return await api(`returnOpenOrders`, { market, address })
        },
        returnOrderBook: async function returnOrderBook(market) {
            return await api(`returnOrderBook`, { market })
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
        returnNextNonce: async function returnNextNonce() {
            return await api(`returnNextNonce`)
        },
        returnContractAddress: async function returnContractAddress() {
            return await api(`returnContractAddress`)
        },
        order: async function order() {
            return await api(`order`)
        },
        trade: async function trade() {
            return await api(`trade`)
        },
        cancel: async function cancel() {
            return await api(`cancel`)
        },
        withdraw: async function withdraw() {
            return await api(`withdraw`)
        },
        websockets: function websockets(ticker) {
            socket.on('message', message => console.log(message));

            //ws.on('pong', handleSocketHeartbeat); // Update timer. Reconnect if it stops updating

            socket.on('error', error => {
                console.error('WebSocket error: ', error);
                socket.close();
            });

            socket.on('open', () => {
                setInterval(() => socket.ping(), 10000);
                socket.send(JSON.stringify({ subscribe: ticker }), error => {
                    if ( error ) {
                        console.error('WebSocket send error: ', error);
                        socket.close();
                    }
                });
            });
        }
    }
}();
