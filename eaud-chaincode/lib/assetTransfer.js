'use strict';

const { Contract } = require('fabric-contract-api');

class eAUDCBDC extends Contract {

    async CreateWallet(ctx, walletId, clientName, bankId) {
        const wallet = {
            walletId: walletId,
            clientName: clientName,
            bankId: bankId,
            balance: 0,
            createdAt: new Date().toISOString(),
            status: 'ACTIVE'
        };
        await ctx.stub.putState(walletId, Buffer.from(JSON.stringify(wallet)));
        return JSON.stringify(wallet);
    }

    async QueryWallet(ctx, walletId) {
        const walletData = await ctx.stub.getState(walletId);
        if (!walletData || walletData.length === 0) {
            throw new Error(`Wallet ${walletId} does not exist`);
        }
        const wallet = JSON.parse(walletData.toString());
        return JSON.stringify({
            walletId: wallet.walletId,
            balance: wallet.balance,
            status: wallet.status
        });
    }
}

module.exports = eAUDCBDC;
