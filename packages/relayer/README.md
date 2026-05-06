# Meta-Transaction Relayer

Express.js backend service that relays gasless meta-transactions on Rootstock Testnet.

## Overview

This relayer accepts EIP-712 signed messages from users and submits them as transactions on-chain, paying the gas fees on behalf of the user.

## Features

- EIP-712 signature verification
- Nonce management and replay protection
- Gas limit validation
- Target contract whitelisting
- Transaction status tracking
- Health monitoring

## Setup

1. Install dependencies:

```bash
yarn install
```

2. Configure environment:

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3001
RELAYER_PRIVATE_KEY=your_funded_relayer_wallet_private_key
ROOTSTOCK_RPC_URL=https://rpc.testnet.rootstock.io
FORWARDER_ADDRESS=deployed_forwarder_address
EXAMPLE_TARGET_ADDRESS=deployed_example_target_address
```

3. Start the relayer:

```bash
yarn dev
```

## API Endpoints

### POST /relay

Submit a meta-transaction for relaying.

**Request:**

```json
{
  "request": {
    "from": "0x...",
    "to": "0x...",
    "value": "0",
    "gas": "100000",
    "nonce": "0",
    "data": "0x..."
  },
  "signature": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "txHash": "0x..."
}
```

### GET /status/:txHash

Get transaction status.

**Response:**

```json
{
  "txHash": "0x...",
  "status": "confirmed",
  "blockNumber": "12345"
}
```

### GET /nonce/:address

Get current nonce for an address.

**Response:**

```json
{
  "address": "0x...",
  "nonce": "5"
}
```

### GET /health

Health check and relayer balance.

**Response:**

```json
{
  "status": "healthy",
  "relayerBalance": "1000000000000000000",
  "chainId": 31
}
```

## Security

- Only whitelisted target contracts are allowed
- Gas limits are enforced (21000 - 1000000)
- Nonce verification prevents replay attacks
- Signature validation ensures authenticity
- Value must be 0 (no ETH transfers)

## Validation Rules

The relayer validates:

1. Valid Ethereum addresses
2. Target contract is whitelisted
3. Gas within acceptable range
4. Value is 0
5. Valid signature format
6. Correct nonce
7. Valid EIP-712 signature

## Error Handling

Common errors:

- `Invalid signature or nonce` - Signature doesn't match or nonce is wrong
- `Target contract not allowed` - Contract not whitelisted
- `Gas must be between X and Y` - Gas limit out of range
- `Invalid 'from' address` - Malformed address

## Production Considerations

For production deployment:

1. **Serve the relayer over HTTPS.** Meta-transaction payloads contain
   user-signed messages and must not transit the public internet in
   plaintext. Terminate TLS at a reverse proxy (nginx, Caddy, Cloudflare,
   etc.) and configure `NEXT_PUBLIC_RELAYER_URL=https://...` on the
   frontend. The frontend prints a runtime warning when it detects a
   non-loopback `http://` URL in production.
2. Add rate limiting
3. Implement API authentication
4. Monitor relayer balance
5. Set up alerts for low balance
6. Use a dedicated relayer wallet
7. Implement request queuing
8. Add comprehensive logging
9. Set up metrics and monitoring

## Development

Run in development mode with hot reload:

```bash
yarn dev
```

Build for production:

```bash
yarn build
```

Run production build:

```bash
yarn start
```

## Architecture

```
Client Request
     ↓
Validation Layer
     ↓
Signature Verification
     ↓
Transaction Submission
     ↓
Rootstock Testnet
```

## Dependencies

- express - Web framework
- viem - Ethereum library
- cors - CORS middleware
- dotenv - Environment configuration

## License

MIT
