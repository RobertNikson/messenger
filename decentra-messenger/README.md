# Decentra Messenger (Phase 1)

E2E-first decentralized messenger foundation.

## Stack
- **Crypto:** Signal-style primitives (X25519 + Double Ratchet roadmap)
- **Network:** libp2p (p2p transport + relay)
- **Identity:** DID-like key identity (ed25519)
- **Storage:** Local encrypted DB (roadmap)

## Current in Phase 1
- Monorepo scaffold
- Shared message envelope types
- Identity/key generation module
- Signed message envelopes
- Minimal libp2p chat node (topic pubsub)
- Bootstrap peer server scaffold
- Encrypted local session-state storage (SQLite + secretbox wrapper)

## Quick start
```bash
cd decentra-messenger
npm install
npm run build
```

Run two local p2p nodes:
```bash
npm run p2p:dev -- --name alice
npm run p2p:dev -- --name bob
```

Run bootstrap + secure session demo:
```bash
npm run bootstrap:dev
npm run -w @decentra/p2p-core secure:dev -- --name alice
npm run -w @decentra/p2p-core secure:dev -- --name bob --peerDid did:dm:...aliceDid
```

## Next milestones
1. Upgrade current ratchet demo to production-grade Double Ratchet (DH ratchet steps + skipped-key store)
2. Offline store-and-forward peers
3. iOS client integration
4. Group messaging with sender keys
5. Key transparency + device revocation
