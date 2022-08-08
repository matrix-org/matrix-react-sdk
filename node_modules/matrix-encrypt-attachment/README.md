# Matrix Encrypt Attachment

Encrypt and decrypt attachments in accordance with the [Matrix](https://matrix.org) [Client-Server API spec](https://spec.matrix.org/v1.1/client-server-api/#sending-encrypted-attachments).

Supports browsers using [`WebCryptoAPI`](https://www.w3.org/TR/WebCryptoAPI/) and Node.js via [`crypto`](https://nodejs.org/api/crypto.html).

This project builds on and deprecates [`browser-encrypt-attachment`](https://github.com/matrix-org/browser-encrypt-attachment) to add support for non-browser environments.

## Protocol versions

Previous versions of the protocol are not currently documented in the spec, and are described here for reference:

| Protocol | Description |
| --- | --- |
| v0 | use all 128 bits of the counter |
| v1 | use only 64 bits of the counter |
| v2 (current) | use only 64 bits and also zero out the other half to maximise the space before it wraps |

## Encryption

The library will encrypt to the following protocol versions:

| Protocol | Browser | Node.js |
| --- | --- | --- |
| Encrypt | v2 | v2 |

## Decryption

The library supports decryption of the following protocol versions:

| Protocol | Browser | Node.js |
| --- | --- | --- |
| Decrypt v0 | ✅ | ❌ |
| Decrypt v1 | ✅ | ❌ |
| Decrypt v2 | ✅ | ✅ |
