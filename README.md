# ChainTrack – Blockchain Product Tracking (B.Tech mini project)

Stack: Solidity + Hardhat, Ethers.js v6, React (Vite), Express, MongoDB, MetaMask.

## Folder structure
contracts/ (Solidity) · scripts/ (deploy, seed) · test/ · backend/ (API, auth, MongoDB) · frontend/ (React app)

## Run on Windows (needs Node 18+, MongoDB running locally, MetaMask)
Open **4 terminals** in the project folder:
1. `npm install` then `npm run node` (local blockchain – keep open; prints test accounts)
2. `npm run deploy` (writes contract address + ABI into frontend/src/contract.json), then `npm run seed` (optional **sample data**: PROD001–003)
3. `cd backend` → `npm install` → copy `.env.example` to `.env` → `npm run seed-admin` → `npm start`
4. `cd frontend` → `npm install` → copy `.env.example` to `.env` → `npm run dev` → open http://localhost:5173

Run tests: `npm test`. If you restart `npm run node`, redeploy and reseed (the chain resets).

## MetaMask
Add network: RPC `http://127.0.0.1:8545`, Chain ID `31337`, symbol ETH. Import test private keys printed by `npm run node` (local test keys only – never real funds):
- Account #0 = Admin / contract owner (login `admin@demo.com` / `Admin@12345`)
- #1 manufacturer, #2 distributor, #3 retailer (used by the seed script). Register these wallets in the app as users, approve as admin, then log in.

## Demo flow
Register manufacturer/distributor/retailer (wallets #1-#3) → admin approves (MetaMask signs `grantRole`) → manufacturer registers a product and downloads its QR → transfers to distributor → distributor updates status and transfers to retailer → retailer confirms → anyone opens **Verify** (ID or QR scan).

## Smart contract functions
- `grantRole` – admin authorises a wallet as manufacturer/distributor/retailer.
- `registerProduct` – manufacturers only; unique ID; first history event.
- `updateProductStatus` – current holder only; appends an event.
- `transferProduct` – holder only; Manufacturer→Distributor→Retailer; appends an event.
- `getProductDetails`, `getProductHistory`, `verifyProduct` – public reads.
History is append-only. Transaction hashes are read from `EventRecorded` logs. No personal data is stored on-chain.

## Trust model
The chain is the source of truth for products and history. MongoDB holds only accounts and approval tx hashes. A blockchain record proves data was written by an authorised wallet and not altered afterwards; it does not prove the original data was truthful.
