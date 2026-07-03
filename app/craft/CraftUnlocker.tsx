"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type CraftUnlockerProps = {
  encryptedPageJson: string;
  encryptedKilobytes: number;
};

const COOKIE_NAME = "pnevma_pricelist_auth";
const COOKIE_DAYS = 60;

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  return copy.buffer;
}

function secureCookiePart() {
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function hasRememberCookie() {
  return document.cookie.split("; ").some((item) => item === `${COOKIE_NAME}=1`);
}

function setRememberCookie() {
  const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=1; expires=${expires}; path=/craft; SameSite=Lax${secureCookiePart()}`;
}

function clearRememberCookie() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/craft; SameSite=Lax${secureCookiePart()}`;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax${secureCookiePart()}`;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

function replaceDocument(html: string) {
  if (!/<html[\s>]/i.test(html)) {
    throw new Error("Unexpected decrypted content");
  }

  document.open();
  document.write(html);
  document.close();
}

export function CraftUnlocker({ encryptedPageJson, encryptedKilobytes }: CraftUnlockerProps) {
  const encryptedPage = useMemo(() => JSON.parse(encryptedPageJson), [encryptedPageJson]);
  const passphraseRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("Enter the Craft access passphrase.");
  const [statusType, setStatusType] = useState<"ok" | "error" | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (hasRememberCookie()) {
      setStatus("Access is remembered. Enter the passphrase to decrypt this encrypted page.");
      setStatusType("ok");
    }
  }, []);

  async function decryptPage(passphrase: string) {
    const salt = fromBase64(encryptedPage.salt);
    const iv = fromBase64(encryptedPage.iv);
    const ciphertext = fromBase64(encryptedPage.ciphertext);
    const key = await deriveKey(passphrase, salt, encryptedPage.iterations);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext));

    return new TextDecoder().decode(plaintext);
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passphrase = passphraseRef.current?.value || "";
    if (!passphrase) {
      setStatus("Enter the Craft access passphrase.");
      setStatusType("error");
      passphraseRef.current?.focus();
      return;
    }

    setIsUnlocking(true);
    setStatus("Decrypting Craft page...");
    setStatusType(null);

    try {
      const html = await decryptPage(passphrase);
      setRememberCookie();
      replaceDocument(html);
    } catch {
      setIsUnlocking(false);
      setStatus("Unable to unlock. Check the passphrase and try again.");
      setStatusType("error");
      passphraseRef.current?.focus();
    }
  }

  function clearInput() {
    if (passphraseRef.current) {
      passphraseRef.current.value = "";
      passphraseRef.current.focus();
    }

    setStatus(hasRememberCookie() ? "Access is remembered. Enter the passphrase to decrypt this encrypted page." : "Cleared. Enter the Craft access passphrase.");
    setStatusType(hasRememberCookie() ? "ok" : null);
  }

  function resetAccess() {
    clearRememberCookie();

    if (passphraseRef.current) {
      passphraseRef.current.value = "";
      passphraseRef.current.focus();
    }

    setStatus("Remembered access cleared. Enter the Craft access passphrase.");
    setStatusType(null);
  }

  return (
    <main className="craft-page" aria-label="Pnevma Craft protected access">
      <section className="craft-gate" aria-label="Craft access gate">
        <div className="craft-heading">
          <div>
            <h1>Pnevma Craft Access</h1>
            <p>Encrypted static page. The passphrase is not stored in this file.</p>
          </div>
          <span>{encryptedKilobytes} KB encrypted</span>
        </div>
        <form className="craft-fields" id="craftUnlockForm" autoComplete="on" onSubmit={unlock}>
          <input id="craft-user" name="username" autoComplete="username" defaultValue="craft" hidden />
          <label htmlFor="craft-passphrase">
            Passphrase
            <input id="craft-passphrase" ref={passphraseRef} name="current-password" type="password" autoComplete="current-password" required autoFocus />
          </label>
          <button className="primary" id="craft-unlock" type="submit" disabled={isUnlocking}>
            Unlock
          </button>
          <button className="secondary" id="craft-clear" type="button" onClick={clearInput}>
            Clear
          </button>
          <button className="secondary" id="craft-reset-access" type="button" onClick={resetAccess}>
            Reset access
          </button>
        </form>
        <p className={`craft-status${statusType ? ` ${statusType}` : ""}`} id="craft-status" role="status" aria-live="polite">
          {status}
        </p>
      </section>
    </main>
  );
}
