import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { FaChartLine, FaFilter, FaBuilding, FaShieldAlt, FaChartPie } from 'react-icons/fa';

const COLORS = ['#ff4d6d', '#00ff88'];
const HIGH_RISK_LIMIT = 70;

const getDate = (value) => {
  const d = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
};

const money = (value) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(value || 0).replace('AUD', 'eAUD');

function EmptyChart({ text }) {
  return (
    <div className="aa-empty-chart">
      <div className="aa-empty-icon">📊</div>
      <p>{text}</p>
      <span>Create wallets and transactions to populate this chart.</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="aa-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <p key={item.name}>{item.name}: {item.value}</p>
      ))}
    </div>
  );
}

function AustracAnalytics({ transactions = [], wallets = [], setShowSuspicious }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const walletBankMap = useMemo(() => {
    const map = {};
    wallets.forEach((wallet) => {
      map[wallet.walletId] = wallet.bankId || 'Unknown';
    });
    return map;
  }, [wallets]);

  const banks = useMemo(() => {
    return [...new Set(wallets.map((wallet) => wallet.bankId).filter(Boolean))];
  }, [wallets]);

  const preparedTransactions = useMemo(() => {
    return transactions
      .map((tx) => {
        const date = getDate(tx.timestamp);
        const amount = Number(tx.amount || 0);
        const riskScore =
          typeof tx.riskScore === 'number'
            ? tx.riskScore
            : tx.suspicious
              ? 85
              : amount > 1000
                ? 60
                : 25;

        return {
          ...tx,
          date,
          amount,
          fromBank: walletBankMap[tx.from] || 'Unknown',
          toBank: walletBankMap[tx.to] || 'Unknown',
          riskScore,
          highRisk: tx.suspicious || riskScore >= HIGH_RISK_LIMIT
        };
      })
      .filter((tx) => tx.date);
  }, [transactions, walletBankMap]);

  const filteredTransactions = useMemo(() => {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return preparedTransactions.filter((tx) => {
      if (start && tx.date < start) return false;
      if (end && tx.date > end) return false;

      if (bankFilter !== 'all' && tx.fromBank !== bankFilter && tx.toBank !== bankFilter) {
        return false;
      }

      if (riskFilter === 'high' && !tx.highRisk) return false;
      if (riskFilter === 'low' && tx.highRisk) return false;

      return true;
    });
  }, [preparedTransactions, fromDate, toDate, bankFilter, riskFilter]);

  const volumeOverTime = useMemo(() => {
    const grouped = {};

    filteredTransactions.forEach((tx) => {
      const day = format(tx.date, 'dd MMM');
      if (!grouped[day]) grouped[day] = { date: day, transactions: 0, amount: 0 };
      grouped[day].transactions += 1;
      grouped[day].amount += tx.amount;
    });

    return Object.values(grouped);
  }, [filteredTransactions]);

  const transactionsByBank = useMemo(() => {
    const grouped = {};

    filteredTransactions.forEach((tx) => {
      const relatedBanks = new Set([tx.fromBank, tx.toBank]);
      relatedBanks.forEach((bank) => {
        if (!grouped[bank]) grouped[bank] = { bank, transactions: 0 };
        grouped[bank].transactions += 1;
      });
    });

    return Object.values(grouped);
  }, [filteredTransactions]);

  const riskRatio = useMemo(() => {
    const high = filteredTransactions.filter((tx) => tx.highRisk).length;
    const low = filteredTransactions.length - high;

    return [
      { name: 'High Risk', value: high },
      { name: 'Low Risk', value: low }
    ].filter((item) => item.value > 0);
  }, [filteredTransactions]);

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const highRiskCount = filteredTransactions.filter((tx) => tx.highRisk).length;
  const lowRiskCount = filteredTransactions.length - highRiskCount;

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setBankFilter('all');
    setRiskFilter('all');
    if (setShowSuspicious) setShowSuspicious(false);
  };

  
  const highRiskOnly = () => {
    setRiskFilter('high');
    if (setShowSuspicious) setShowSuspicious(true);
  };

  return (
    <section className="aa-section">
      <div className="aa-header">
        <div>
          <span className="aa-badge">AUSTRAC ANALYTICS</span>
          <h2><FaChartLine /> Transaction Intelligence Dashboard</h2>
          <p>Advanced visual analytics for monitoring transaction volume, bank activity and AML risk exposure.</p>
        </div>

        <div className="aa-actions">
          <button onClick={highRiskOnly}><FaShieldAlt /> High Risk Only</button>
          <button onClick={resetFilters}><FaFilter /> Reset Filters</button>
        </div>
      </div>

      <div className="aa-filters">
        <div>
          <label>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div>
          <label>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div>
          <label>Bank</label>
          <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
            <option value="all">All Banks</option>
            {banks.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
            <option value="Unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label>Risk Level</label>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>
      </div>

      <div className="aa-kpis">
        <div className="aa-kpi">
          <span>Total Transactions</span>
          <strong>{filteredTransactions.length}</strong>
        </div>

        <div className="aa-kpi">
          <span>Filtered Value</span>
          <strong>{money(totalAmount)}</strong>
        </div>

        <div className="aa-kpi danger">
          <span>High Risk</span>
          <strong>{highRiskCount}</strong>
        </div>

        <div className="aa-kpi success">
          <span>Low Risk</span>
          <strong>{lowRiskCount}</strong>
        </div>
      </div>

      <div className="aa-grid">
        <div className="aa-card aa-wide">
          <div className="aa-card-title">
            <h3><FaChartLine /> Transaction Volume Over Time</h3>
            <span>Line Chart</span>
          </div>

          {volumeOverTime.length === 0 ? (
            <EmptyChart text="No transaction volume data available." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={volumeOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis allowDecimals={false} stroke="#9ca3af" />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  name="Transactions"
                  stroke="#00ffff"
                  strokeWidth={4}
                  dot={{ r: 5, fill: '#00ffff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="aa-card">
          <div className="aa-card-title">
            <h3><FaBuilding /> Transactions by Bank</h3>
            <span>Bar Chart</span>
          </div>

          {transactionsByBank.length === 0 ? (
            <EmptyChart text="No bank transaction data available." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={transactionsByBank}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="bank" stroke="#9ca3af" />
                <YAxis allowDecimals={false} stroke="#9ca3af" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="transactions" name="Transactions" fill="#00ffff" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="aa-card">
          <div className="aa-card-title">
            <h3><FaChartPie /> High-Risk vs Low-Risk Ratio</h3>
            <span>Donut Chart</span>
          </div>

          {riskRatio.length === 0 ? (
            <EmptyChart text="No risk ratio data available." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={riskRatio}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={75}
                  outerRadius={115}
                  paddingAngle={5}
                  label
                >
                  {riskRatio.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

export default AustracAnalytics;