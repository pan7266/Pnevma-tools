# Protected HTML artifacts

This folder contains a static decrypting viewer for two Pnevma HTML documents. The plaintext HTML documents are not committed to the repository.
One successful unlock decrypts both documents in the browser and exposes a compact header menu for switching between them.

## Included pages

- Pnevma Design System
- Pnevma Product QA Checklist

## Protection model

- Payloads are encrypted with AES-256-GCM.
- The key is derived in the browser with PBKDF2-SHA-256 and 310,000 iterations.
- The passphrase is not stored in this repository, this folder, or the pull request body.
- Anyone with the repository or deployed URL can download the ciphertext, but they cannot render the pages without the passphrase.

## Operational notes

Share the passphrase out of band. If the passphrase is exposed, re-encrypt the pages with a new passphrase and replace this folder in a new commit.

For stricter access control, keep the repository private or use GitHub Pages private visibility where available. Client-side static files cannot prevent downloading; this folder protects the document contents by encrypting them before they are committed.
