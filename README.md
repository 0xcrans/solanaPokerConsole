# Console to Poker on Solana

Built on Solana using Anchor framework. Players can join tables, deposit funds, and play poker with secure token-based betting system.

## 🏗️ Architecture

### Core Components
- **House**: Central authority managing fees and system operations
- **PlayerVault**: Personal player accounts for fund management
- **TableVault**: Table escrow accounts for game funds
- **Dealer**: Token management system (1 SOL = 10,000 tokens)
- **TableTemplate**: Configurable table rules and limits

### Business Model
- **Creation Fee**: 0.01 SOL per new table
- **Start Fee**: 1% of buy-in amounts
- **Rent Collection**: Automated cleanup of empty tables

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor CLI

### Installation

```bash
# Clone repository
git clone <repository-url>
cd poker-program

# Install dependencies
npm install
cd app && npm install

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Development

```bash
# Start local validator
solana-test-validator

# Run tests
anchor test

# Start frontend
cd app && npm run dev
```

## 📁 Project Structure

```
poker-program/
├── programs/poker-program/src/    # Solana program (Rust)
│   ├── lib.rs                     # Program entry point
│   ├── state.rs                   # Account structures
│   ├── errors.rs                  # Custom errors
│   └── instructions/              # Program instructions
├── app/                          # Next.js frontend
│   ├── components/               # React components
│   ├── hooks/                    # Custom hooks
│   └── pages/                    # Next.js pages
├── tests/                        # Integration tests
└── migrations/                   # Deployment scripts
```

## 🎮 Key Features

- **Secure Fund Management**: Player vaults with escrow protection
- **Token-Based Betting**: Internal token system for game mechanics
- **Table Templates**: Configurable game rules and limits
- **Automated Fee Collection**: Built-in revenue generation
- **Multi-Player Support**: Up to 7 players per table

## 🔧 Configuration

### Table Templates
- **Challenger**: 0.1-3 SOL buy-in, 2-7 players
- Customizable min/max buy-ins and player limits

### Network Settings
- **Devnet**: `3VWxtZ5CCjG2eKH1FNQxDkCKU57QMk5SZ61Gx6pcsHne`

## 🧪 Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/poker-program.ts
```


## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. 
