# 🚀 QIE Explorer — The Gateway to QIE Blockchain

<div align="center">
  <img src="https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png" alt="QIE Explorer" width="120" />
  
  **A Comprehensive Hybrid Block Explorer for the QIE Mainnet**
  
  [![Website](https://img.shields.io/badge/Explorer-qie.explorer.onenov.xyz-violet?style=for-the-badge)](https://qie.explorer.onenov.xyz)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
  [![Powered by](https://img.shields.io/badge/Powered_by-OneNov-8B5CF6?style=for-the-badge)](https://onenov.xyz)
  [![Built with](https://img.shields.io/badge/Built_with-TanStack_Start-FF4154?style=for-the-badge)](https://tanstack.com/start)

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
- Portfolio breakdown with interactive pie & bar charts
- QIE Price Chart with multiple timeframes (Live, 1D, 1W, 1M, 1Y, All)

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
- **MetaMask** — EVM wallet for Web3 interactions
- **Keplr** — Cosmos wallet for staking, governance, and rewards
- Real-time balance display after connection
- Account change detection and auto-update

### 💱 **Swap & DeFi**
- Token swap with real-time quotes from QIEDEX
- Auto-wrap/unwrap support for QIE ↔ wQIE
- Transaction history with status tracking
- Trading pairs explorer from Subgraph
- Cross-chain bridge interface

### 🎨 **UI/UX**
- Dark/Light theme with persistent preference
- Responsive design for desktop, tablet, and mobile
- 3D card effects with hover animations
- Gradient color schemes with violet/fuchsia/cyan accents
- Framer Motion animations throughout
- Collapsible sidebar navigation with grouped menus

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | React 19 | UI framework |
| | TypeScript | Type safety |
| | TanStack Start | Full-stack React framework |
| | TanStack Router | File-based routing |
| | TanStack Query | Server state management |
| | Recharts | Data visualization & charts |
| | Framer Motion | Animations |
| | Tailwind CSS | Styling |
| | shadcn/ui | UI components |
| | Zustand | Client state (wallet) |
| **Blockchain** | CosmJS | Cosmos SDK integration |
| | ethers.js | EVM integration |
| | @cosmjs/stargate | Cosmos transaction signing |
| | @cosmjs/proto-signing | Protobuf signing |
| **Build** | Vite | Build tool |
| | Nitro | Server engine |
| | Bun | Package manager & runtime |
| **Deployment** | Vercel | Hosting & deployment |

---
```
## 📁 Project Structure

src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Navigation with collapsible groups
│   │   ├── Topbar.tsx           # Search bar & wallet button
│   │   ├── Footer.tsx           # Site footer
│   │   └── WalletButton.tsx     # Multi-wallet connection
│   ├── shared/
│   │   └── ValidatorAvatar.tsx  # Keybase avatar integration
│   ├── staking/
│   │   └── StakingModal.tsx     # Delegate/Redelegate/Undelegate/Claim
│   └── ui/                      # shadcn/ui components (40+)
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── button.tsx
│       └── ... (40+ components)
├── data/
│   ├── network.ts               # QIE chain config & footer links
│   └── tokens.ts                # Token list & contract addresses
├── hooks/
│   └── use-mobile.tsx           # Mobile detection hook
├── lib/
│   ├── api.ts                   # Cosmos/EVM RPC + caching
│   ├── wallet.ts                # QIE Wallet, MetaMask, Keplr
│   ├── wallet-tx.ts             # Delegate, Vote, Claim helpers
│   ├── evm-contracts.ts         # Swap, Wrap, Unwrap, Approve
│   ├── subgraph.ts              # QIEDEX Subgraph queries
│   ├── cache.ts                 # TTL caching utilities
│   └── utils.ts                 # Utility functions
├── routes/
│   ├── __root.tsx               # Root layout with theme
│   ├── index.tsx                # Landing page with animations
│   ├── dashboard.tsx            # Dashboard with live stats
│   ├── blocks.tsx               # Blocks layout
│   ├── blocks.index.tsx         # Blocks list
│   ├── blocks.$height.tsx       # Block detail
│   ├── transactions.tsx         # TX layout
│   ├── transactions.index.tsx   # TX list
│   ├── tx.$hash.tsx             # TX detail with event logs
│   ├── staking.tsx              # Staking layout
│   ├── staking.index.tsx        # Validator list
│   ├── staking.$validator.tsx   # Validator detail
│   ├── governance.tsx           # Governance layout
│   ├── governance.index.tsx     # Proposal list
│   ├── governance.$proposalId.tsx # Proposal detail
│   ├── uptime.tsx               # Validator uptime monitor
│   ├── gas-tracker.tsx          # Gas price tracker
│   ├── top-accounts.tsx         # Address leaderboard
│   ├── tokens.tsx               # Token list
│   ├── token-transfers.tsx      # Token transfers
│   ├── verified-contracts.tsx   # Verified contracts
│   ├── internal-txs.tsx         # Internal transactions
│   ├── consensus.tsx            # Consensus state
│   ├── ibc.tsx                  # IBC monitor
│   ├── parameters.tsx           # Chain parameters
│   ├── cosmwasm.tsx             # CosmWasm status
│   ├── statesync.tsx            # State sync config
│   ├── supply.tsx               # Supply info
│   ├── address.$address.tsx     # Address detail
│   ├── swap.tsx                 # Swap with wrap/unwrap
│   ├── pairs.tsx                # Trading pairs from Subgraph
│   ├── bridge.tsx               # Bridge interface
│   └── widgets.tsx              # Widgets page
├── server.ts                    # SSR handler + API proxy
├── start.ts                     # TanStack Start entry
├── styles.css                   # Global styles with Tailwind
├── routeTree.gen.ts             # Auto-generated router
├── vite.config.ts               # Vite configuration
├── vercel.json                  # Vercel deployment config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies & scripts
└── bun.lock                     # Bun lockfile

```

---

## 🌐 Data Sources

| Source | URL | Usage |
|--------|-----|-------|
| **Cosmos RPC** | `rpc.qie.onenov.xyz` | Consensus, validators, blocks |
| **Cosmos REST** | `api.qie.onenov.xyz` | Staking, governance, balances |
| **EVM RPC** | `rpc-evm.qie.onenov.xyz` | Blocks, transactions, gas |
| **Subgraph** | `graphql.qie.digital` | QIEDEX pairs, prices, liquidity |
| **Official API** | `mainnet.qie.digital/api/v2` | Stats, gas, tokens |
| **Price Feed** | `api.coingecko.com` | QIE/USD price |
| **Avatars** | `keybase.io` | Validator identities |

---

## 🔗 QIE Ecosystem Integration

| Component | URL | Description |
|-----------|-----|-------------|
| **QIE Blockchain** | [qie.digital](https://www.qie.digital) | Official QIE website |
| **QIE Wallet** | [qiewallet.me](https://qiewallet.me) | Official Web3 wallet |
| **QIEDEX** | [dex.qie.digital](https://www.dex.qie.digital) | Decentralized exchange |
| **QIE Bridge** | [bridge.qie.digital](https://bridge.qie.digital) | Cross-chain bridge |
| **QIE Pass** | [qiepass.qie.digital](https://qiepass.qie.digital) | Web3 identity & KYC |
| **QUSDC** | [stable.qie.digital](https://www.stable.qie.digital) | QIE stablecoin |
| **QIElend** | [qielend.qie.digital](https://www.qielend.qie.digital) | Lending & borrowing |
| **QIE Domains** | [domains.qie.digital](https://domains.qie.digital) | Web3 domains |
| **QIE Lottery** | [lottery.qie.digital](https://lottery.qie.digital) | On-chain lottery |
| **QIE Doodle** | [qiedoodle.com](https://qiedoodle.com) | NFT platform |
| **QBots Trade** | [qbots.trade](https://www.qbots.trade) | Trading bots |
| **Pawsome Host** | [pawsome.host](https://www.pawsome.host) | Hosting services |

---

## 🛡️ Smart Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **QIEDEX Router** | `0x08cd2e72e156D8563B4351eb4065C262A9f553Ef` | DEX routing for swaps |
| **QIEDEX Factory** | `0x8E23128a5511223bE6c0d64106e2D4508C08398C` | Pair creation |
| **wQIE** | `0xAC8d365ECc9074a679f75B3E6b2bbF303e466728` | Wrapped QIE token |
| **wUSDC** | `0x0e93FAcc0a2cfD418403f3AD3EEfB5C8b2dfAec7` | Wrapped USDC |
| **wUSDT** | `0xCB7bBC584475dce754a918ccD92FF6E0211f3CEE` | Wrapped USDT |
| **QIDEX** | `0xA795c4D885522d5e37956265837636b023445871` | QIDEX governance token |
| **QUSDC** | `0x3f43da82ec9a4f5285f10faf1f26eca7319e5da5` | QUSDC stablecoin |

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

📊 Live Demo

🌐 qie.explorer.onenov.xyz

---

## 🧭 Quick Navigation

| Section | Path | Description |
|---------|------|-------------|
| **Dashboard** | `/dashboard` | Live network overview with real-time stats |
| **Blocks** | `/blocks` | Block explorer with latest blocks |
| **Transactions** | `/transactions` | Transaction explorer with search |
| **Staking** | `/staking` | Validator staking portal |
| **Governance** | `/governance` | Proposal voting dashboard |
| **Uptime** | `/uptime` | Validator uptime monitor |
| **Swap** | `/swap` | Token swap with wrap/unwrap support |
| **Pairs** | `/pairs` | Trading pairs from QIEDEX Subgraph |
| **Bridge** | `/bridge` | Cross-chain bridge interface |
| **Gas Tracker** | `/gas-tracker` | Live gas price monitor |
| **Top Accounts** | `/top-accounts` | Address leaderboard by balance |
| **Tokens** | `/tokens` | Token explorer (ERC-20, ERC-721, ERC-1155) |
| **Token Transfers** | `/token-transfers` | Real-time token transfer history |
| **Verified Contracts** | `/verified-contracts` | Smart contract directory |
| **Internal TXs** | `/internal-txs` | Internal transaction tracing |
| **Consensus** | `/consensus` | Consensus state monitor |
| **IBC** | `/ibc` | IBC channels, connections, clients |
| **Parameters** | `/parameters` | Chain parameters viewer |
| **CosmWasm** | `/cosmwasm` | CosmWasm smart contract status |
| **State Sync** | `/statesync` | State sync configuration |
| **Supply** | `/supply` | Token supply information |
| **Widgets** | `/widgets` | Widgets and components showcase |

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

· 🌐 Website: onenov.xyz
· 📧 Email: onenov0209@gmail.com
· 🐙 GitHub: @OneNov0209

---

🙏 Acknowledgments

· QIE Blockchain — Hybrid Cosmos + EVM network
· TanStack — Amazing React framework ecosystem
· shadcn/ui — Beautiful component library
· Keplr — Cosmos wallet
· MetaMask — EVM wallet
· CoinGecko — Price data API
· Vercel — Deployment platform

---

<div align="center">
  <sub>Built with ❤️ for the QIE Community</sub>
  <br>
  <sub>Powered by <a href="https://onenov.xyz">OneNov</a></sub>
</div>
```
