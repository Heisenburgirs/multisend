# MultiSend - Batch Asset Transfer for LUKSO

![MultiSend Logo](insert_logo_url_here)

🏆 **Hack the Grid Level 2 Hackathon Submission**

MultiSend is a powerful dApp that revolutionizes how users transfer digital assets on the LUKSO blockchain. Send multiple tokens, NFTs, or entire collections in a single transaction - saving time, gas, and complexity.

## ✨ Key Features

### 🚀 Batch Transfers
- **Multi-Asset Support**: Transfer any combination of tokens, NFTs, and entire collections in one transaction
- **Gas Efficiency**: Save on transaction fees by batching multiple transfers together
- **Time-Saving**: Complete in seconds what would normally take minutes or hours

### 💎 Asset Flexibility
- **LSP7 Token Support**: Send any amount of your fungible tokens
- **LSP8 NFT Support**: Transfer individual NFTs with ease
- **Collection Transfers**: Send entire NFT collections with a single click

### 🔍 Smart Recipient Search
- **Universal Profile Integration**: Search for recipients by name or address

### 🛡️ Security & UX
- **Real-time Balance Updates**: See your updated balances immediately after transfers
- **Transaction Status Tracking**: Follow your transaction from signing to confirmation

## 🏆 Why Multisend

### Innovation
MultiSend introduces a mini-app version of first-of-its-kind batch transfer capability to LUKSO, enabling users to send multiple assets simultaneously - a feature not available in standard wallets.

### User Experience
The intuitive interface makes complex blockchain operations accessible to everyone. Users can select assets, specify amounts, and send to recipients with just a few clicks.

### Ecosystem Value
MultiSend addresses a critical need in the Web3 ecosystem, enabling efficient asset management for collectors, creators, and projects distributing assets at scale.

### Future Potential
The foundation established by MultiSend can be expanded to support additional features like scheduled transfers, airdrops, and more.

## 📋 How to Use MultiSend

1. **Connect Your Wallet**
   - Click the connect button in the top left corner of the mini-app

2. **Select a Recipient**
   - Enter a Universal Profile name or address in the "Send to" field
   - Select from the search results or enter a valid address directly

3. **Add Assets to Send**
   - Click in the "Asset" field to browse your available assets
   - Search by name or scroll through your tokens, NFTs, and collections
   - For tokens, enter the amount you wish to send (or click "Max" to send all)
   - For NFTs, simply select them to add to your transaction
   - For collections, click on the collection name to select all NFTs in that collection

4. **Add Multiple Assets (Optional)**
   - Click "Add asset" to include additional assets in your transaction
   - Repeat the selection process for each asset you wish to include

5. **Complete the Transfer**
   - Review your selections
   - Click "Transfer" to initiate the transaction
   - Confirm the transaction in your wallet
   - Wait for confirmation (transaction status will be displayed)

## 🔧 Technical Implementation

MultiSend leverages LUKSO's Universal Profile standards and blockchain capabilities:
- **Universal Profile Integration**: Searches and interacts with UP profiles
- **LSP7/LSP8 Standards**: Fully compatible with LUKSO's token standards
- **Batch Transactions**: Uses the UP's `executeBatch` function for efficient transfers
- **Real-time Updates**: Updates balances locally after successful transfers