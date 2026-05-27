const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { jwtDecode } = require('jwt-decode');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Session for Keycloak
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'eaud-cbdc-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Helper to decode and validate Keycloak token
function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    let groups = decoded.groups || [];
    if (typeof groups === 'string') groups = [groups];
    groups = groups.map(g => g.replace(/^\//, ''));

    let role = 'customer';
    let bank = null;

    if (groups.includes('rba_admin')) role = 'rba_admin';
    else if (groups.includes('banka_admin')) {
      role = 'banka_admin';
      bank = 'BankA';
    } else if (groups.includes('bankb_admin')) {
      role = 'bankb_admin';
      bank = 'BankB';
    } else if (groups.includes('austrac_admin')) role = 'austrac_admin';

    return {
      username: decoded.preferred_username,
      role: role,
      bank: bank
    };
  } catch (err) {
    return null;
  }
}

function authenticate(req, res, next) {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  req.user = user;
  next();
}

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/kyc/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'kyc-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF, JPEG, PNG files are allowed'));
    }
});

// Data stores
let kycRecords = [];
const KYC_FILE = path.join(__dirname, 'kyc-records.json');
if (fs.existsSync(KYC_FILE)) kycRecords = JSON.parse(fs.readFileSync(KYC_FILE, 'utf8'));
function saveKycRecords() { fs.writeFileSync(KYC_FILE, JSON.stringify(kycRecords, null, 2)); }

let transactionHistory = [];
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');
if (fs.existsSync(TRANSACTIONS_FILE)) transactionHistory = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
function saveTransactions() { fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactionHistory, null, 2)); }

let flaggedAccounts = [];
const FLAGGED_ACCOUNTS_FILE = path.join(__dirname, 'flagged-accounts.json');
if (fs.existsSync(FLAGGED_ACCOUNTS_FILE)) flaggedAccounts = JSON.parse(fs.readFileSync(FLAGGED_ACCOUNTS_FILE, 'utf8'));
function saveFlaggedAccounts() { fs.writeFileSync(FLAGGED_ACCOUNTS_FILE, JSON.stringify(flaggedAccounts, null, 2)); }

// Suspicious detection - FIXED to accept wallet objects
function detectSuspicious(amount, fromWallet, toWallet, history, fromWalletObj, toWalletObj) {
    const flags = [];
    
    // Rule 1: Large transaction > 1000 eAUD
    if (amount > 1000) flags.push('LARGE_TRANSACTION (>1000 eAUD)');
    
    // Rule 2: Very large transaction > 5000 eAUD
    if (amount > 5000) flags.push('VERY_LARGE_TRANSACTION (>5000 eAUD)');
    
    // Rule 3: Round number patterns (ends with 000)
    if (amount % 1000 === 0 && amount > 1000) flags.push('ROUND_NUMBER_PATTERN');
    
    // Rule 4: Rapid transactions (more than 3 in last minute)
    const recentTx = history.filter(t => new Date(t.timestamp) > new Date(Date.now() - 60000));
    if (recentTx.length > 3) flags.push('RAPID_TRANSACTIONS (3+ per minute)');
    
    // Rule 5: Time anomaly (outside banking hours 9am-5pm)
    const txHour = new Date().getHours();
    if (txHour < 9 || txHour >= 17) flags.push('OUTSIDE_BANKING_HOURS');
    
    // Rule 6: Historical pattern deviation (amount > 2x average of last 10 transactions)
    const userTransactions = history.filter(t => t.from === fromWallet || t.to === fromWallet);
    if (userTransactions.length >= 5) {
        const recentAmounts = userTransactions.slice(0, 10).map(t => t.amount);
        const avgAmount = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;
        if (amount > avgAmount * 2 && avgAmount > 0) {
            flags.push(`HISTORICAL_DEVIATION (${Math.round(amount / avgAmount)}x normal)`);
        }
    }
    
    // Rule 7: Flagged account check
    if (flaggedAccounts.includes(fromWallet) || flaggedAccounts.includes(toWallet)) {
        flags.push('FLAGGED_ACCOUNT_ON_WATCHLIST');
    }

    const isSuspicious = flags.length > 0;
    const riskScore = Math.min(flags.length * 20 + Math.floor(amount / 2000), 100);

    return { isSuspicious, flags, riskScore };
}

// Connection profile
const connectionProfile = {
    name: 'eaud-network',
    version: '1.0.0',
    client: { organization: 'Org1', connection: { timeout: { peer: { endorser: '300' } } } },
    organizations: {
        Org1: { mspid: 'Org1MSP', peers: ['peer0.org1.example.com'], certificateAuthorities: ['ca.org1.example.com'] },
        Org2: { mspid: 'Org2MSP', peers: ['peer0.org2.example.com'], certificateAuthorities: ['ca.org2.example.com'] }
    },
    peers: {
        'peer0.org1.example.com': {
            url: 'grpcs://localhost:7051',
            tlsCACerts: { path: '../test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem' },
            grpcOptions: { 'ssl-target-name-override': 'peer0.org1.example.com', 'hostnameOverride': 'peer0.org1.example.com' }
        },
        'peer0.org2.example.com': {
            url: 'grpcs://localhost:9051',
            tlsCACerts: { path: '../test-network/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem' },
            grpcOptions: { 'ssl-target-name-override': 'peer0.org2.example.com', 'hostnameOverride': 'peer0.org2.example.com' }
        }
    },
    certificateAuthorities: {
        'ca.org1.example.com': {
            url: 'https://localhost:7054',
            caName: 'ca-org1',
            tlsCACerts: { path: '../test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem' },
            httpOptions: { verify: false }
        }
    }
};

const walletPath = path.join(process.cwd(), 'wallet');

async function getGateway() {
    const gateway = new Gateway();
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('appUser');
    if (!identity) throw new Error('appUser identity not found');
    await gateway.connect(connectionProfile, { identity: 'appUser', wallet, discovery: { enabled: true, asLocalhost: true } });
    return gateway;
}

// ============ KYC ENDPOINTS ============

app.post('/api/kyc/upload', authenticate, upload.single('document'), (req, res) => {
    try {
        const { walletId, legalName, purpose } = req.body;
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const kycRecord = {
            walletId, legalName, purpose,
            documentPath: req.file.path,
            documentName: req.file.originalname,
            documentType: req.file.mimetype,
            uploadedBy: req.user.username,
            uploadedAt: new Date().toISOString(),
            status: 'PENDING_VERIFICATION'
        };

        const existingIndex = kycRecords.findIndex(k => k.walletId === walletId);
        if (existingIndex !== -1) kycRecords[existingIndex] = kycRecord;
        else kycRecords.push(kycRecord);
        saveKycRecords();

        res.json({ success: true, message: 'KYC uploaded successfully', kyc: kycRecord });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/kyc/status/:walletId', authenticate, (req, res) => {
    const kyc = kycRecords.find(k => k.walletId === req.params.walletId);
    res.json({ success: true, hasKyc: !!kyc, verified: kyc?.status === 'VERIFIED', kyc });
});

app.get('/api/kyc/all', authenticate, (req, res) => {
    if (req.user.role !== 'rba_admin' && req.user.role !== 'austrac_admin') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.json({ success: true, kycRecords });
});

// ============ FLAGGED ACCOUNTS ============

app.post('/api/flagged/add', authenticate, (req, res) => {
    if (req.user.role !== 'austrac_admin' && req.user.role !== 'rba_admin') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const { walletId } = req.body;
    if (!flaggedAccounts.includes(walletId)) {
        flaggedAccounts.push(walletId);
        saveFlaggedAccounts();
    }
    res.json({ success: true, message: `Wallet ${walletId} added to watchlist` });
});

app.get('/api/flagged/list', authenticate, (req, res) => {
    if (req.user.role !== 'austrac_admin' && req.user.role !== 'rba_admin') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.json({ success: true, flaggedAccounts });
});

// ============ WALLET ENDPOINTS ============

app.get('/api/wallets', authenticate, async (req, res) => {
    try {
        const gateway = await getGateway();
        const network = await gateway.getNetwork('eaudchannel');
        const contract = network.getContract('eaud');
        const result = await contract.evaluateTransaction('GetAllWallets');
        await gateway.disconnect();
        let wallets = JSON.parse(result.toString());

        const role = req.user.role;
        if (role === 'banka_admin') wallets = wallets.filter(w => w.bankId === 'BankA');
        else if (role === 'bankb_admin') wallets = wallets.filter(w => w.bankId === 'BankB');

        wallets = wallets.map(w => ({
            ...w,
            hasKyc: kycRecords.some(k => k.walletId === w.walletId),
            kycVerified: kycRecords.some(k => k.walletId === w.walletId && k.status === 'VERIFIED')
        }));

        res.json({ success: true, wallets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/wallet/create', authenticate, async (req, res) => {
    try {
        const { walletId, legalName, bankId, purpose } = req.body;

        const hasKyc = kycRecords.some(k => k.walletId === walletId);
        if (!hasKyc) {
            return res.status(400).json({ success: false, error: 'KYC document required before wallet creation. Please upload KYC first.' });
        }

        const gateway = await getGateway();
        const network = await gateway.getNetwork('eaudchannel');
        const contract = network.getContract('eaud');
        const result = await contract.submitTransaction('CreateWallet', walletId, legalName, bankId);
        await gateway.disconnect();

        const kyc = kycRecords.find(k => k.walletId === walletId);
        if (kyc) {
            kyc.status = 'VERIFIED';
            saveKycRecords();
        }

        res.json({ success: true, wallet: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/wallet/addfunds', authenticate, async (req, res) => {
    if (req.user.role !== 'rba_admin') return res.status(403).json({ success: false, error: 'Only RBA can mint' });
    try {
        const { walletId, amount } = req.body;
        const gateway = await getGateway();
        const network = await gateway.getNetwork('eaudchannel');
        const contract = network.getContract('eaud');
        const result = await contract.submitTransaction('AddFunds', walletId, amount.toString());
        await gateway.disconnect();
        res.json({ success: true, result: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ TRANSFER ENDPOINT WITH SUSPICIOUS DETECTION ============

app.post('/api/transfer', authenticate, async (req, res) => {
    try {
        const { fromWallet, toWallet, amount } = req.body;
        const amountNum = Number(amount);
        
        const gateway = await getGateway();
        const network = await gateway.getNetwork('eaudchannel');
        const contract = network.getContract('eaud');
        
        // Get wallet details for detection
        const fromResult = await contract.evaluateTransaction('QueryWallet', fromWallet);
        const fromWalletObj = JSON.parse(fromResult.toString());
        
        const toResult = await contract.evaluateTransaction('QueryWallet', toWallet);
        const toWalletObj = JSON.parse(toResult.toString());
        
        // Execute transfer
        const result = await contract.submitTransaction('TransferEAUD', fromWallet, toWallet, amountNum.toString());
        
        // Run suspicious detection
        const suspiciousCheck = detectSuspicious(amountNum, fromWallet, toWallet, transactionHistory, fromWalletObj, toWalletObj);
        
        // Add to transaction history WITH suspicious info
        const transaction = {
            id: `tx-${Date.now()}`,
            timestamp: new Date().toISOString(),
            from: fromWallet,
            to: toWallet,
            amount: amountNum,
            type: 'transfer',
            status: 'completed',
            fromBank: fromWalletObj.bankId,
            toBank: toWalletObj.bankId,
            suspicious: suspiciousCheck.isSuspicious,
            flags: suspiciousCheck.flags,
            riskScore: suspiciousCheck.riskScore
        };
        
        transactionHistory.unshift(transaction);
        
        if (transactionHistory.length > 200) {
            transactionHistory = transactionHistory.slice(0, 200);
        }
        saveTransactions();
        
        await gateway.disconnect();
        
        res.json({ success: true, transfer: JSON.parse(result.toString()), suspicious: suspiciousCheck });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/transactions', authenticate, async (req, res) => {
    const role = req.user.role;
    let filtered = [...transactionHistory];
    
    if (role === 'banka_admin') {
        filtered = filtered.filter(t => t.fromBank === 'BankA');
    } else if (role === 'bankb_admin') {
        filtered = filtered.filter(t => t.fromBank === 'BankB');
    }
    
    res.json({ success: true, transactions: filtered });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`eAUD API server running on http://localhost:${PORT}`));
