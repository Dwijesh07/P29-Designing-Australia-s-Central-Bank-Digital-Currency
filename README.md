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
