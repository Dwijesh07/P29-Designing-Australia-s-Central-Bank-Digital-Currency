import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import {
  FaWallet, FaMoneyBillWave, FaBuilding, FaChartLine,
  FaPlus, FaCheckCircle, FaSpinner, FaUsers, FaShieldAlt, FaSignOutAlt,
  FaEye, FaChartBar, FaBell, FaUpload, FaFilePdf, FaCheck
} from 'react-icons/fa';
import { useAuth } from './AuthContext';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const { user, logout, isRBA, isBankA, isBankB, isAUSTRAC, isCustomer } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [kycRecords, setKycRecords] = useState([]);

  const [kycWalletId, setKycWalletId] = useState('');
  const [kycLegalName, setKycLegalName] = useState('');
  const [kycPurpose, setKycPurpose] = useState('');
  const [kycFile, setKycFile] = useState(null);
  const [kycUploaded, setKycUploaded] = useState(false);
  const [kycUploadedWalletId, setKycUploadedWalletId] = useState('');

  const [createWalletId, setCreateWalletId] = useState('');
  const [createLegalName, setCreateLegalName] = useState('');
  const [createPurpose, setCreatePurpose] = useState('');
  const [createBankId, setCreateBankId] = useState(isBankA ? 'BankA' : (isBankB ? 'BankB' : 'BankA'));

  const [amount, setAmount] = useState('');
  const [toWallet, setToWallet] = useState('');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showSuspicious, setShowSuspicious] = useState(false);
  const [showKycForm, setShowKycForm] = useState(true);

  const loadWallets = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/wallets`);
      setWallets(response.data.wallets);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/transactions`);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, []);

  const loadKycRecords = useCallback(async () => {
    if (isAUSTRAC || isRBA) {
      try {
        const response = await axios.get(`${API_URL}/kyc/all`);
        setKycRecords(response.data.kycRecords);
      } catch (error) {
        console.error('Error loading KYC records:', error);
      }
    }
  }, [isAUSTRAC, isRBA]);

  useEffect(() => {
    if (user) {
      loadWallets();
      loadTransactions();
      loadKycRecords();
      const interval = setInterval(() => {
        loadWallets();
        loadTransactions();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user, loadWallets, loadTransactions, loadKycRecords]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const uploadKyc = async () => {
    if (!kycWalletId || !kycLegalName || !kycPurpose || !kycFile) {
      showMessage('Please fill all KYC fields and select a document', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('walletId', kycWalletId);
    formData.append('legalName', kycLegalName);
    formData.append('purpose', kycPurpose);
    formData.append('document', kycFile);

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/kyc/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showMessage(`✅ KYC uploaded for ${kycWalletId}. You can now create the wallet.`, 'success');
      setKycUploaded(true);
      setKycUploadedWalletId(kycWalletId);
      setCreateWalletId(kycWalletId);
      setCreateLegalName(kycLegalName);
      setCreatePurpose(kycPurpose);
      setShowKycForm(false);
      document.getElementById('kyc-file-input').value = '';
    } catch (error) {
      showMessage(`❌ KYC upload failed: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createWallet = async () => {
    if (!createWalletId || !createLegalName || !createPurpose) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/wallet/create`, {
        walletId: createWalletId,
        legalName: createLegalName,
        bankId: createBankId,
        purpose: createPurpose
      });
      showMessage(`✅ Wallet "${createWalletId}" created successfully for ${createLegalName}`, 'success');
      loadWallets();
      setKycWalletId('');
      setKycLegalName('');
      setKycPurpose('');
      setKycFile(null);
      setCreateWalletId('');
      setCreateLegalName('');
      setCreatePurpose('');
      setKycUploaded(false);
      setKycUploadedWalletId('');
      setShowKycForm(true);
    } catch (error) {
      showMessage(`❌ Error: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetKycForm = () => {
    setKycWalletId('');
    setKycLegalName('');
    setKycPurpose('');
    setKycFile(null);
    setKycUploaded(false);
    setKycUploadedWalletId('');
    setCreateWalletId('');
    setCreateLegalName('');
    setCreatePurpose('');
    setShowKycForm(true);
    const fileInput = document.getElementById('kyc-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const addFunds = async () => {
    if (!selectedWallet || !amount || amount <= 0) {
      showMessage('Please select a wallet and enter a valid amount', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/wallet/addfunds`, { walletId: selectedWallet, amount });
      showMessage(`💰 Minted ${amount} eAUD. New balance: ${response.data.result.newBalance} eAUD`, 'success');
      loadWallets();
      setAmount('');
    } catch (error) {
      showMessage(`❌ Error: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const transferFunds = async () => {
    if (!selectedWallet || !toWallet || !amount || amount <= 0) {
      showMessage('Please fill in all transfer fields', 'error');
      return;
    }
    if (selectedWallet === toWallet) {
      showMessage('Cannot transfer to the same wallet', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/transfer`, { fromWallet: selectedWallet, toWallet, amount });
      showMessage(`🔄 Transferred ${amount} eAUD to ${toWallet}`, 'success');
      loadWallets();
      setAmount('');
      setToWallet('');
    } catch (error) {
      showMessage(`❌ Error: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectWallet = (id) => {
    setSelectedWallet(id);
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(balance).replace('AUD', 'eAUD');
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <FaCheckCircle style={{ color: '#00ff88' }} />;
    return <FaSpinner style={{ color: '#888' }} />;
  };

  const totalWallets = wallets.length;
  const totalSupply = wallets.reduce((sum, w) => sum + w.balance, 0);
  const activeBanks = [...new Set(wallets.map(w => w.bankId))].length;
  const suspiciousTransactions = transactions.filter(t => t.suspicious);
  const selectedWalletData = wallets.find(w => w.walletId === selectedWallet);
  const pendingKyc = kycRecords.filter(k => k.status === 'PENDING_VERIFICATION').length;
  const selectedWalletHasKyc = selectedWalletData?.hasKyc || false;

  const getRoleBadge = () => {
    if (isRBA) return { text: 'RBA ADMIN', color: '#00ffff', icon: <FaShieldAlt /> };
    if (isBankA) return { text: 'BANK A ADMIN', color: '#00ff88', icon: <FaBuilding /> };
    if (isBankB) return { text: 'BANK B ADMIN', color: '#ff00ff', icon: <FaBuilding /> };
    if (isAUSTRAC) return { text: 'AUSTRAC REGULATOR', color: '#ffaa00', icon: <FaEye /> };
    if (isCustomer) return { text: 'CUSTOMER', color: '#888', icon: <FaUsers /> };
    return { text: 'UNKNOWN', color: '#888', icon: null };
  };

  const roleBadge = getRoleBadge();

  if (!user) {
    return null;
  }

  const userBankLabel = isBankA ? 'Bank A' : (isBankB ? 'Bank B' : null);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1><span className="logo">🏦</span> eAUD</h1>
          <p>Australia's Central Bank Digital Currency</p>
        </div>
        <div className="header-right">
          <div className="user-badge" style={{ borderColor: roleBadge.color, color: roleBadge.color }}>
            {roleBadge.icon}
            <span>{roleBadge.text}</span>
          </div>
          <div className="user-info">
            <span>{user?.name}</span>
            <button className="logout-btn" onClick={logout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
          <div className="live-badge">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>
      </header>

      {isAUSTRAC && suspiciousTransactions.length > 0 && (
        <div className="alert-banner">
          <FaBell /> ALERT: {suspiciousTransactions.length} suspicious transaction(s) detected requiring review
        </div>
      )}

      {isAUSTRAC && pendingKyc > 0 && (
        <div className="alert-banner" style={{ borderColor: '#ffaa00', color: '#ffaa00' }}>
          <FaFilePdf /> KYC ALERT: {pendingKyc} KYC application(s) pending verification
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><FaWallet /></div>
          <div className="stat-info">
            <h3>Total Wallets</h3>
            <p className="stat-value">{totalWallets}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaMoneyBillWave /></div>
          <div className="stat-info">
            <h3>Total eAUD Supply</h3>
            <p className="stat-value">{formatBalance(totalSupply)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaBuilding /></div>
          <div className="stat-info">
            <h3>Active Banks</h3>
            <p className="stat-value">{activeBanks}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaChartLine /></div>
          <div className="stat-info">
            <h3>Risk Score</h3>
            <p className="stat-value">{Math.round(suspiciousTransactions.length * 10)}%</p>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="left-column">
          {isRBA && (
            <div className="card">
              <h2><FaPlus /> Create New Wallet (RBA)</h2>
              <div className="form-group">
                <label>Wallet ID</label>
                <input type="text" placeholder="e.g., rba-wallet-001" value={createWalletId} onChange={(e) => setCreateWalletId(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Legal Name of Organization</label>
                <input type="text" placeholder="Full legal name" value={createLegalName} onChange={(e) => setCreateLegalName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Purpose of Account</label>
                <input type="text" placeholder="Purpose of this account" value={createPurpose} onChange={(e) => setCreatePurpose(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Issuing Bank</label>
                <select value={createBankId} onChange={(e) => setCreateBankId(e.target.value)}>
                  <option value="BankA">Bank A</option>
                  <option value="BankB">Bank B</option>
                </select>
              </div>
              <button className="btn-primary" onClick={createWallet} disabled={isLoading}>
                {isLoading ? 'Creating...' : '✨ Create Wallet'}
              </button>
            </div>
          )}

          {(isBankA || isBankB) && (
            <div className="card">
              <h2><FaPlus /> Create New Customer Wallet</h2>
              <p className="form-note" style={{ marginBottom: '16px', color: '#00ffff' }}>
                ⚠️ KYC verification is required for each new wallet (AML/CTF compliance)
              </p>

              {showKycForm && (
                <div className="kyc-section" style={{ background: 'rgba(0,255,255,0.05)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#00ffff' }}>📋 Step 1: Upload KYC Document</h3>
                  <div className="form-group">
                    <label>Wallet ID</label>
                    <input type="text" placeholder="e.g., customer-001" value={kycWalletId} onChange={(e) => setKycWalletId(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Legal Name of Organization</label>
                    <input type="text" placeholder="Full legal name as per registration" value={kycLegalName} onChange={(e) => setKycLegalName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Purpose of Account</label>
                    <input type="text" placeholder="e.g., Business operations, Salary payments" value={kycPurpose} onChange={(e) => setKycPurpose(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>KYC Document (Passport / License / Bill)</label>
                    <input id="kyc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setKycFile(e.target.files[0])} />
                  </div>
                  <button className="btn-primary" onClick={uploadKyc} disabled={isLoading}>
                    {isLoading ? 'Uploading...' : '📄 Upload KYC Document'}
                  </button>
                </div>
              )}

              {kycUploaded && (
                <div className="create-wallet-section" style={{ background: 'rgba(0,255,0,0.05)', padding: '16px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#00ff88' }}>✅ Step 2: Create Wallet</h3>
                  <p className="form-note" style={{ marginBottom: '12px', color: '#00ff88' }}>
                    KYC verified for {kycUploadedWalletId}. You can now create the wallet.
                  </p>
                  <div className="form-group">
                    <label>Wallet ID</label>
                    <input type="text" value={createWalletId} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div className="form-group">
                    <label>Legal Name of Organization</label>
                    <input type="text" value={createLegalName} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div className="form-group">
                    <label>Purpose of Account</label>
                    <input type="text" value={createPurpose} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div className="form-group">
                    <label>Issuing Bank</label>
                    <select value={createBankId} onChange={(e) => setCreateBankId(e.target.value)} disabled={isBankA || isBankB} style={{ opacity: 0.7 }}>
                      <option value="BankA">Bank A</option>
                      <option value="BankB">Bank B</option>
                    </select>
                    {(isBankA || isBankB) && (
                      <p className="form-note" style={{ color: '#00ff88', marginTop: '4px' }}>
                        ✅ You are creating a wallet for {userBankLabel}. This cannot be changed.
                      </p>
                    )}
                  </div>
                  <button className="btn-primary" onClick={createWallet} disabled={isLoading}>
                    {isLoading ? 'Creating...' : '✨ Create Wallet'}
                  </button>
                  <button className="btn-secondary" onClick={resetKycForm} style={{ marginTop: '8px', background: 'rgba(255,68,68,0.2)', color: '#ff4444' }}>
                    Start Over (New Customer)
                  </button>
                </div>
              )}
            </div>
          )}

          {isAUSTRAC && (
            <div className="card">
              <h2><FaEye /> AML Monitoring</h2>
              <button className="btn-secondary" onClick={() => setShowSuspicious(!showSuspicious)}>
                <FaChartBar /> {showSuspicious ? 'Hide' : 'Show'} Suspicious Activity
              </button>
              <div className="risk-summary">
                <p>🔴 High Risk: {suspiciousTransactions.filter(t => t.riskScore > 80).length}</p>
                <p>🟡 Medium Risk: {suspiciousTransactions.filter(t => t.riskScore > 50 && t.riskScore <= 80).length}</p>
                <p>🟢 Low Risk: {suspiciousTransactions.filter(t => t.riskScore <= 50).length}</p>
                <p>📄 Pending KYC: {pendingKyc}</p>
              </div>
            </div>
          )}
        </div>

        <div className="right-column">
          <div className="card">
            <h2><FaUsers /> All Wallets <span className="badge">{totalWallets}</span></h2>
            <div className="wallets-list">
              {wallets.length === 0 ? (
                <p className="empty-state">No wallets found.</p>
              ) : (
                wallets.map((wallet) => (
                  <div key={wallet.walletId} className={`wallet-card ${selectedWallet === wallet.walletId ? 'selected' : ''}`} onClick={() => selectWallet(wallet.walletId)}>
                    <div className="wallet-header">
                      <strong>{wallet.walletId}</strong>
                      <span className={`bank-badge ${wallet.bankId === 'BankA' ? 'bank-a' : 'bank-b'}`}>{wallet.bankId}</span>
                      {(isAUSTRAC || isRBA || isBankA || isBankB) && wallet.hasKyc && <FaCheck style={{ color: '#00ff88' }} title="KYC Verified" />}
                    </div>
                    <div className="wallet-details">
                      <span>👤 {wallet.clientName}</span>
                      <span>💰 {formatBalance(wallet.balance)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedWallet && selectedWalletData && (isRBA || isBankA || isBankB || isCustomer) && (
            <div className="card selected-card">
              <h2>🎯 Selected Wallet</h2>
              <div className="selected-wallet-info">
                <div className="info-row">
                  <div className="info-item"><label>Wallet ID</label><span>{selectedWallet}</span></div>
                  <div className="info-item"><label>Client</label><span>{selectedWalletData.clientName}</span></div>
                  <div className="info-item"><label>Bank</label><span>{selectedWalletData.bankId}</span></div>
                  <div className="info-item highlight"><label>Balance</label><span>{formatBalance(selectedWalletData.balance)}</span></div>
                  <div className="info-item"><label>KYC Status</label><span style={{ color: selectedWalletHasKyc ? '#00ff88' : '#ff4444' }}>{selectedWalletHasKyc ? '✅ Verified' : '❌ Not Verified'}</span></div>
                </div>
              </div>

              <div className="action-buttons">
                {isRBA && (
                  <div className="action-card">
                    <h3>💎 Mint New eAUD</h3>
                    <input type="number" placeholder="Amount (eAUD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <button className="btn-mint" onClick={addFunds} disabled={isLoading}>{isLoading ? 'Processing...' : '💰 Add Funds'}</button>
                    <p className="action-note">🔒 Only RBA can mint new eAUD</p>
                  </div>
                )}
                <div className="action-card">
                  <h3>🔄 Transfer eAUD</h3>
                  <input type="text" placeholder="Recipient Wallet ID" value={toWallet} onChange={(e) => setToWallet(e.target.value)} />
                  <input type="number" placeholder="Amount (eAUD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <button className="btn-transfer" onClick={transferFunds} disabled={isLoading}>{isLoading ? 'Processing...' : '💸 Transfer'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="transactions-section">
        <div className="card full-width">
          <h2><FaChartLine /> {isAUSTRAC ? 'AML Transaction Monitoring' : 'Recent Transactions'}</h2>
          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From → To</th>
                  <th>Amount</th>
                  <th>Status</th>
                  {isAUSTRAC && <th>Risk Score</th>}
                  {isAUSTRAC && <th>Alert</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAUSTRAC ? 6 : 4} className="empty-state">No transactions</td>
                  </tr>
                ) : (
                  (showSuspicious ? transactions.filter(t => t.suspicious) : transactions).map((tx) => (
                    <tr key={tx.id} className={tx.suspicious ? 'suspicious-row' : ''}>
                      <td>{format(new Date(tx.timestamp), 'hh:mm a')}</td>
                      <td><strong>{tx.from}</strong> → <strong>{tx.to}</strong></td>
                      <td className="amount">{formatBalance(tx.amount)}</td>
                      <td className="status">{getStatusIcon(tx.status)} {tx.status}</td>
                      {isAUSTRAC && <td className={tx.riskScore > 70 ? 'high-risk' : 'low-risk'}>{tx.riskScore}%</td>}
                      {isAUSTRAC && <td>{tx.suspicious ? <span className="alert">⚠️ FLAGGED</span> : '✓'}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-status">
          <span>📊 System Status: All participants online</span>
          <span>🕐 Last Updated: {formatDistanceToNow(lastUpdated)} ago</span>
        </div>
        <div className="footer-participants">
          <span>🏛️ RBA (Central Bank)</span>
          <span>🏦 BankA (Commercial)</span>
          <span>🏦 BankB (Commercial)</span>
          <span>👁️ AUSTRAC (Regulator)</span>
        </div>
        <div className="footer-copyright">© 2024 eAUD CBDC | Powered by Hyperledger Fabric | RBA Regulated Network</div>
      </footer>

      {message && <div className={`toast-message ${messageType}`}>{message}</div>}
    </div>
  );
}

export default App;
