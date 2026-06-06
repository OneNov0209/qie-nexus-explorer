# 🚀 QIE Explorer — The Gateway to QIE Blockchain

<div align="center">
  <img src="https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png" alt="QIE Explorer" width="120" />
  
  **A Comprehensive Hybrid Block Explorer for the QIE Mainnet**
  
  [![Website](https://img.shields.io/badge/Explorer-qie.explorer.onenov.xyz-violet?style=for-the-badge)](https://qie.explorer.onenov.xyz)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
  [![Powered by](https://img.shields.io/badge/Powered_by-OneNov-8B5CF6?style=for-the-badge)](https://onenov.xyz)

</div>

---

## 📖 Overview

**QIE Explorer** is the first community-built, full-featured block explorer for the **QIE Mainnet** — a hybrid blockchain supporting both **Cosmos SDK** and **Ethereum Virtual Machine (EVM)**. Built with modern web technologies, it provides deep visibility into every aspect of the QIE ecosystem with real-time data, beautiful visualizations, and professional-grade analytics.

> *"The Gateway to QIE Blockchain"*

---

## ✨ Features

### 📊 **Dashboard & Analytics**
- Real-time network statistics with live updating cards
- Block activity chart with transaction count visualization
- Network pulse monitoring (staking distribution, validator status)
- Application version tracking with build dependencies
- Portfolio breakdown with interactive pie & bar charts

### 📦 **Block Explorer**
- Browse latest blocks with auto-refresh (every 6 seconds)
- Detailed block view with all transactions, gas usage, and miner info
- Block hash copy functionality and transaction linking
- Gas usage percentage visualization per block

### 💸 **Transaction Explorer**
- Real-time transaction list with search and filtering
- Detailed transaction view with full event logs
- Message type decoding and status tracking
- Fee calculation and gas analysis
- Internal transaction tracing for contract calls

### 👥 **Staking Portal**
- Complete validator directory with voting power rankings
- Keybase avatar integration for validator identities
- Detailed validator profiles with self-bonded amounts
- Delegation distribution charts and voting power events
- **Staking Modal** with Delegate, Redelegate, Undelegate, and Claim Rewards
- User portfolio tracking (available, delegated, unbonding, rewards)

### 🗳️ **Governance Dashboard**
- Active proposals with voting status indicators
- Tally results with percentage bars
- Timeline tracking (submit, deposit, voting start/end)
- Vote casting interface with all options (Yes, No, Abstain, Veto)
- Proposal parameter details and voter list

### 📡 **Validator Uptime Monitoring**
- Real-time uptime tracking with block history grid
- Color-coded status indicators (green/yellow/red)
- Sortable columns (Rank, Voting Power, Uptime %)
- Expandable rows with detailed validator statistics
- Network health distribution charts

### ⛽ **Gas Tracker**
- Live gas prices (Slow, Average, Fast) in Gwei
- Fee estimator for transfers and contract calls
- Priority fee calculations
- Recent gas usage chart with transaction breakdown
- Network utilization statistics

### 🏆 **Top Accounts**
- Address leaderboard ranked by balance
- Contract/EOA classification
- Transaction count tracking
- Direct links to address detail pages

### 🪙 **Token Explorer**
- ERC-20, ERC-721, ERC-1155 token listings
- Token holder counts
- Token transfer history with real-time updates
- Address-based token filtering

### ✅ **Verified Contracts**
- Smart contract directory with verification status
- Compiler version and optimization details
- Language detection (Solidity, Vyper, etc.)
- Contract address linking

### 🔄 **Internal Transactions**
- Contract-to-contract call tracing
- Value transfer tracking within transactions
- Gas usage per internal call
- Parent transaction linking

### ⛓️ **Consensus State**
- Live round monitoring with real-time updates
- Validator vote grid with color-coded status
- Onboard rate and active validator tracking
- Voting power distribution charts
- Peer list with connection details

### 🌐 **IBC Monitor**
- Channel, connection, and client listings
- State tracking with expandable details
- Counterparty information display
- Trust period and chain ID tracking

### ⚙️ **Chain Parameters**
- Staking, governance, distribution, and slashing parameters
- Duration formatting with human-readable values
- Node information with software versions
- Build dependencies display
- Search and filter capabilities

### 🔄 **State Sync Configuration**
- Real-time trust height and hash generation
- Config.toml snippet with copy functionality
- RPC, REST, and EVM endpoint listings
- Step-by-step setup instructions

### 🔍 **Global Search**
- Search by block height, transaction hash, address, or validator
- Intelligent suggestion with auto-complete
- Keyboard shortcut support (⌘K)
- Direct navigation to relevant pages

### 👛 **Multi-Wallet Support**
- **QIE Wallet** — Official EVM wallet for balance & transfers
- **Keplr** — Cosmos wallet for staking, governance, and rewards
- Real-time balance display after connection
- Account change detection and auto-update

### 🎨 **UI/UX**
- Dark/Light theme with persistent preference
- Responsive design for desktop, tablet, and mobile
- 3D card effects with hover animations
- Gradient color schemes with violet/fuchsia/cyan accents
- Framer Motion animations throughout
- Collapsible sidebar navigation

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **TanStack Start** | Full-stack React framework |
| **TanStack Router** | File-based routing |
| **TanStack Query** | Server state management |
| **Recharts** | Data visualization & charts |
| **Framer Motion** | Animations |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI components |
| **Zustand** | Client state (wallet) |
| **CosmJS** | Cosmos SDK integration |
| **Vite** | Build tool |
| **Nitro** | Server engine |
| **Vercel** | Deployment |

---

## 📁 Project Structure

```

src/
├── components/
│   ├── layout/          # Sidebar, Topbar, Footer, WalletButton
│   ├── shared/          # ValidatorAvatar, shared components
│   ├── staking/         # StakingModal
│   └── ui/              # shadcn/ui components (Card, Dialog, etc.)
├── data/
│   └── network.ts       # QIE chain configuration & footer links
├── hooks/
│   └── use-mobile.tsx   # Mobile detection hook
├── lib/
│   ├── api.ts           # API helpers (Cosmos, EVM RPC, caching)
│   ├── wallet.ts        # Wallet connection (QIE Wallet, Keplr)
│   ├── wallet-tx.ts     # Transaction helpers (Delegate, Vote, Claim)
│   └── utils.ts         # Utility functions
├── routes/
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Landing page
│   ├── dashboard.tsx    # Dashboard
│   ├── blocks.tsx       # Blocks layout
│   ├── blocks.index.tsx # Blocks list
│   ├── blocks.$height.tsx # Block detail
│   ├── transactions.tsx # TX layout
│   ├── transactions.index.tsx # TX list
│   ├── tx.$hash.tsx     # TX detail
│   ├── staking.tsx      # Staking layout
│   ├── staking.index.tsx # Validator list
│   ├── staking.$validator.tsx # Validator detail
│   ├── governance.tsx   # Governance layout
│   ├── governance.index.tsx # Proposal list
│   ├── governance.$proposalId.tsx # Proposal detail
│   ├── uptime.tsx       # Uptime monitor
│   ├── gas-tracker.tsx  # Gas tracker
│   ├── top-accounts.tsx # Top accounts
│   ├── tokens.tsx       # Token list
│   ├── token-transfers.tsx # Token transfers
│   ├── verified-contracts.tsx # Verified contracts
│   ├── internal-txs.tsx # Internal transactions
│   ├── consensus.tsx    # Consensus state
│   ├── ibc.tsx          # IBC monitor
│   ├── parameters.tsx   # Chain parameters
│   ├── cosmwasm.tsx     # CosmWasm status
│   ├── statesync.tsx    # State sync config
│   ├── supply.tsx       # Supply info
│   ├── address.$address.tsx # Address detail
│   └── widgets.tsx      # Widgets page
├── server.ts            # SSR handler + API proxy
├── start.ts             # TanStack Start entry
└── styles.css           # Global styles

```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/OneNov0209/qie-nexus-explorer.git
cd qie-nexus-explorer

# Install dependencies
bun install

# Start development server
bun run dev
```

The explorer will be available at http://localhost:3000.

Build for Production

```bash
bun run build
```

Deploy to Vercel

```bash
bun run vercel-build
npx vercel deploy --prebuilt
```

---

🌐 Live Demo

qie.explorer.onenov.xyz

---

📊 Data Sources

Source Usage
rpc.qie.onenov.xyz Cosmos RPC (consensus, validators, blocks)
api.qie.onenov.xyz Cosmos REST (staking, governance, balances)
rpc-evm.qie.onenov.xyz EVM RPC (blocks, transactions, gas)
mainnet.qie.digital/api/v2 Official explorer API (stats, gas, tokens)
api.coingecko.com Price feed (QIE/USD)
keybase.io Validator avatars

---

🤝 Contributing

Contributions are welcome! This project is open-source and built for the QIE community.

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

---

📜 License

This project is licensed under the MIT License — see the LICENSE file for details.

---

👤 Author

OneNov

· Website: onenov.xyz
· Email: onenov0209@gmail.com
· GitHub: @OneNov0209

---

🙏 Acknowledgments

· QIE Blockchain — Hybrid Cosmos + EVM network
· TanStack — Amazing React framework ecosystem
· shadcn/ui — Beautiful component library
· Keplr — Cosmos wallet
· CoinGecko — Price data API
· Vercel — Deployment platform

---
```
<div align="center">
  <sub>Built with ❤️ for the QIE Community</sub>
  <br>
  <sub>Powered by <a href="https://onenov.xyz">OneNov</a></sub>
</div>
```
