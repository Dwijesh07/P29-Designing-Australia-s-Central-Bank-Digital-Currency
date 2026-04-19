const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Create app user identity using existing admin certificate
        console.log('Creating appUser identity...');
        const certPath = path.join(__dirname, '../test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem');
        const keyPath = path.join(__dirname, '../test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/priv_sk');
        
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();
        
        const identity = {
            credentials: {
                certificate: cert,
                privateKey: key
            },
            mspId: 'Org1MSP',
            type: 'X.509'
        };
        
        await wallet.put('appUser', identity);
        console.log('appUser identity created successfully!');
        
        console.log('Setup complete');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
