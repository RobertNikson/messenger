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

## Next milestones
1. Pre-key bundles + session bootstrap
2. Double Ratchet message chain
3. Offline store-and-forward peers
4. iOS client integration
5. Group messaging with sender keys
