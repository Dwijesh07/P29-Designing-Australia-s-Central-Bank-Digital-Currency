# eAUD Central Bank Digital Currency Platform

## P29 – Designing Australia's Central Bank Digital Currency

**COS40006 / EAT40006 – Computing/Engineering Technology Project B**  
**Swinburne University of Technology | 2026**

---

## Overview

The eAUD CBDC platform is a prototype central bank digital currency system built on Hyperledger Fabric. The platform demonstrates a four-organisation blockchain network consisting of the Reserve Bank of Australia (RBA), two commercial banks (BankA and BankB), and AUSTRAC as a regulatory observer node.

### Core Features

- **Four-organisation Hyperledger Fabric network** with RBA, BankA, BankB, and AUSTRAC on `eaudchannel`
- **Custom eAUD chaincode** with wallet creation, minting (AddFunds), transfers, and balance queries
- **Keycloak SSO authentication** with role-based access for five user types
- **KYC document upload** with verified tick status visible to bank admins
- **AML detection engine** with real-time risk scoring and suspicious activity alerts
- **AUSTRAC monitoring dashboard** with transaction filtering, export (PDF/CSV), and analytics charts
- **Role-specific dashboards** for RBA Admin, BankA Admin, BankB Admin, AUSTRAC Admin, and Customer

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Hyperledger Fabric v2.5.x |
| Chaincode | JavaScript (Node.js) |
| Backend API | Node.js / Express |
| Frontend | React.js |
| Authentication | Keycloak (OpenID Connect / OAuth2) |
| Database | CouchDB (state database) |
| Containerisation | Docker / Docker Compose (in progress) |

---

## Prerequisites

Before installing the eAUD platform, ensure you have the following:

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Docker Desktop | v4.0+ | Must be running. Enable WSL2 integration. |
| WSL2 with Ubuntu | Ubuntu 22.04+ | Required for Hyperledger Fabric. |
| Node.js | v22.0+ | Required for API and React frontend. |
| npm | v10.0+ | Installed with Node.js. |
| Git | Any | Required to clone the repository. |
| Hyperledger Fabric Binaries | v2.5.x | Located in `~/fabric-samples/bin` |

---

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Dwijesh07/P29-Designing-Australia-s-Central-Bank-Digital-Currency
cd P29-Designing-Australia-s-Central-Bank-Digital-Currency

2. Start Hyperledger Fabric Network (WSL Ubuntu)
bash
cd ~/fabric-samples/test-network
./network.sh up createChannel -c eaudchannel -s couchdb
3. Deploy eAUD Chaincode
bash
./network.sh deployCC -ccn eaud -ccp ../eaud-chaincode -ccl javascript -c eaudchannel
4. Start Keycloak Container
bash
docker run -d -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
5. Import eAUD Realm
Open http://localhost:8080 in your browser

Log in with admin / admin

Go to Realm Settings → Import

Select eaud-realm.json from the repository root

Click Import — this creates all groups, users, and role mappings

6. Start Backend API
bash
cd eaud-api
npm install
node server.js
7. Start React Frontend
bash
cd eaud-ui
npm install
npm start
8. Access the Application
Open http://localhost:3000 in your browser. The Keycloak login page will load.

Default Login Credentials
Username	Password	Role	Dashboard Access
rba_admin	admin123	RBA Admin	Full system — all wallets, minting, transfers
banka_admin	bankA123	BankA Admin	BankA wallets and KYC only
bankb_admin	bankB123	BankB Admin	BankB wallets and KYC only
austrac_admin	austrac123	AUSTRAC Admin	AML monitoring, all transactions, exports
customer1	pass123	Customer	Own wallet and transaction history only
Verifying Installation
Check	How to Verify	Expected Result
Fabric network	docker ps in WSL Ubuntu	Containers for peer0.org1, peer0.org2, orderer, couchdb0, couchdb1 all Up
Keycloak	Open localhost:8080	Admin console loads, eAUD realm visible
API	Open localhost:3001	API responds with connection confirmation
Frontend	Open localhost:3000	Keycloak login page loads
Role switching	Log out and log in as different role	Correct dashboard loads for each role
Repository Structure

P29-Designing-Australia-s-Central-Bank-Digital-Currency/
├── eaud-chaincode/              # Hyperledger Fabric chaincode (JavaScript)
│   ├── lib/
│   │   ├── wallet.js            # CreateWallet, GetWallet, GetAllWallets
│   │   ├── transfer.js          # TransferEAUD function
│   │   └── admin.js             # AddFunds (minting) function
│   └── index.js                 # Chaincode entry point
│
├── eaud-api/                    # Node.js/Express backend API
│   ├── routes/
│   │   ├── auth.js              # Keycloak token validation
│   │   ├── wallets.js           # Wallet creation, queries, transfers
│   │   ├── kyc.js               # KYC document upload and status
│   │   └── aml.js               # AUSTRAC monitoring and risk scoring
│   ├── uploads/kyc/             # KYC document storage directory
│   ├── server.js                # Main server with middleware
│   └── package.json
│
├── eaud-ui/                     # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/       # Role-specific dashboards
│   │   │   ├── Auth/            # Keycloak login integration
│   │   │   └── Common/          # Shared components
│   │   ├── contexts/
│   │   │   └── AuthContext.js   # Keycloak authentication state
│   │   └── App.js
│   ├── public/
│   └── package.json
│
├── fabric-samples/              # Hyperledger Fabric test network
│   └── test-network/            # Network configuration and scripts
│
├── eaud-realm.json              # Keycloak realm export (users, groups, roles)
├── docker-compose.yml           # Docker orchestration (in progress)
├── README.md                    # This file
└── LICENSE
Troubleshooting
Issue	Solution
Docker ps shows no containers	Docker Desktop is not running. Open Docker Desktop and wait for it to fully start.
Fabric network fails to start	Run ./network.sh down first to clear previous state, then re-run the up command.
Chaincode deployment fails	Ensure Node.js is installed inside WSL Ubuntu. Run node --version inside WSL to confirm.
Keycloak login page does not load	Wait 30–60 seconds for Keycloak container to initialise, then try again.
Wallets not showing after login	Confirm Fabric network is up and node server.js is running in the eaud-api directory.
Role shows as undefined after login	Re-import eaud-realm.json into Keycloak and ensure the group mapper is present.
KYC upload fails	Ensure file is PDF, JPG, or PNG under 5MB. The uploads/kyc/ folder must exist.
User Roles Guide
RBA Admin
Create wallets for any organisation (no KYC required)

Mint eAUD using AddFunds function

Transfer funds between any wallets

View full transaction history across all organisations

Statistics cards show total wallets, total eAUD supply, active banks, and system risk score

BankA / BankB Admin
Upload KYC documents before wallet creation (wallet creation blocked without KYC)

Enter Legal Name of Organisation and Purpose of Account when creating wallets

Transfers restricted to wallets within the same bank

KYC verified tick appears on wallet card once verification is complete

AUSTRAC Admin
View all transactions across all organisations with real-time risk scores

View suspicious activity flags and AML alerts

Filter transactions by date, bank, and risk level

Export transaction data as PDF or CSV

View transaction analytics charts (volume over time, transactions by bank, high-risk ratio)

Add wallets to flagged accounts watchlist

Customer
View own wallet balance and transaction history

Initiate transfers to other wallets

View KYC verification status

Dockerization Status
Full Docker Compose orchestration is in progress. Once complete, a single command will start all services:

bash
docker-compose up
This will replace Steps 2–7 of the installation process. Check the repository for updates.

Security & Compliance
The eAUD platform aligns with the following Australian regulatory frameworks:

APRA CPS 234 – Information security requirements for financial institutions

APRA CPS 230 – Operational risk management

AML/CTF Act 2006 – Suspicious matter reporting (ss41–43)

Privacy Act 1988 – Australian Privacy Principles (APP 8 for data transfers)

ACSC Essential Eight – MFA-capable infrastructure

ACSC ISM-1139 – TLS 1.2 minimum requirement

Contributors
Name	Role	Responsibilities
Isar Ujoodah	Scrum Master / Lead Developer	Keycloak integration, Dockerization, KYC tick fix, API, chaincode, documentation
Luvish Rajnath	Team Member	PDF export for AML reports
Lasith Perera	Team Member	Pagination, search, Keycloak documentation
Farzana Moietry	Team Member	Email notifications for suspicious transactions
Ashikur Rahman	Team Member	Transaction charts for AUSTRAC dashboard
Al Hamid Arath	Team Member	CSV export for AML reports
License
This project is for academic purposes as part of Swinburne University of Technology's Engineering Technology Project B (EAT40006 / COS40006).

Contact
GitHub: https://github.com/Dwijesh07/P29-Designing-Australia-s-Central-Bank-Digital-Currency

Client: Sameen Chishti

Supervisor: Swinburne University of Technology

For any issues not covered in the troubleshooting section, please refer to the GitHub repository or contact the Scrum Master.



