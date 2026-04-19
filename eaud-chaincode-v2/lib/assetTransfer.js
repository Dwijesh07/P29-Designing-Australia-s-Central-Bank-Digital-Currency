'use strict';

const { Contract } = require('fabric-contract-api');

class eAUDCBDC extends Contract {

    async Init(ctx) {
        console.info('eAUD CBDC Chaincode initialized');
    }

    async CreateWallet(ctx, walletId, clientName, bankId) {
        const exists = await this.WalletExists(ctx, walletId);
        if (exists) {
            throw new Error(`Wallet ${walletId} already exists`);
        }

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

    async TransferEAUD(ctx, fromWallet, toWallet, amount) {
        const fromWalletData = await ctx.stub.getState(fromWallet);
        if (!fromWalletData || fromWalletData.length === 0) {
            throw new Error(`Wallet ${fromWallet} does not exist`);
        }
        
        const toWalletData = await ctx.stub.getState(toWallet);
        if (!toWalletData || toWalletData.length === 0) {
            throw new Error(`Wallet ${toWallet} does not exist`);
        }

        const fromWalletObj = JSON.parse(fromWalletData.toString());
        const toWalletObj = JSON.parse(toWalletData.toString());

        const amountNum = Number(amount);
        if (fromWalletObj.balance < amountNum) {
            throw new Error(`Insufficient balance`);
        }

        fromWalletObj.balance -= amountNum;
        toWalletObj.balance += amountNum;

        await ctx.stub.putState(fromWallet, Buffer.from(JSON.stringify(fromWalletObj)));
        await ctx.stub.putState(toWallet, Buffer.from(JSON.stringify(toWalletObj)));

        return JSON.stringify({ fromWallet, toWallet, amount: amountNum, status: 'success' });
    }

    async QueryWallet(ctx, walletId) {
        const walletData = await ctx.stub.getState(walletId);
        if (!walletData || walletData.length === 0) {
            throw new Error(`Wallet ${walletId} does not exist`);
        }
        const wallet = JSON.parse(walletData.toString());
        return JSON.stringify({
            walletId: wallet.walletId,
            clientName: wallet.clientName,
            bankId: wallet.bankId,
            balance: wallet.balance,
            status: wallet.status
        });
    }

    async WalletExists(ctx, walletId) {
        const walletData = await ctx.stub.getState(walletId);
        return walletData && walletData.length > 0;
    }

    async GetAllWallets(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async AddFunds(ctx, walletId, amount) {
        const walletData = await ctx.stub.getState(walletId);
        if (!walletData || walletData.length === 0) {
            throw new Error(`Wallet ${walletId} does not exist`);
        }
        const wallet = JSON.parse(walletData.toString());
        wallet.balance += Number(amount);
        await ctx.stub.putState(walletId, Buffer.from(JSON.stringify(wallet)));
        return JSON.stringify({ walletId, newBalance: wallet.balance });
    }
}

module.exports = eAUDCBDC;