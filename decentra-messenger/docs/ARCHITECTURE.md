# Architecture (Target)

## Trust model
- No central message authority
- Bootstrap/relay nodes are untrusted transport helpers
- Endpoints hold private keys and decrypt locally

## Layers
1. **Identity Layer**
   - Device keypairs (ed25519 for identity, x25519 for E2E)
   - DID-like id: `did:dm:<base58(pubkey)>`
2. **Session Layer**
   - X3DH handshake
   - Double Ratchet for forward secrecy
3. **Transport Layer**
   - libp2p pubsub + direct streams
   - Circuit relay for NAT traversal
4. **Storage Layer**
   - Local encrypted store
   - Optional replicated mailbox peers

## Message envelope
- `ciphertext` only over network
- signatures for anti-impersonation
- minimal metadata
