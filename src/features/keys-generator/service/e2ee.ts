import { Injectable } from '@angular/core';
import * as bip39 from 'bip39';
import sodium from 'libsodium-wrappers-sumo';

@Injectable({ providedIn: 'root' })
export class E2eeService {
  private ready = false;

  constructor() {
    sodium.ready.then(() => {
      this.ready = true;
    });
  }

  private ensureReady() {
    if (!this.ready) throw new Error('libsodium not ready yet');
  }

  generateMnemonic(strength = 256): string {
    return bip39.generateMnemonic(strength);
  }

  async mnemonicToSeed32(mnemonic: string, passphrase = ''): Promise<Uint8Array> {
    this.ensureReady();
    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    return new Uint8Array(seed.slice(0, 32));
  }

  async keypairFromSeed32(seed32: Uint8Array) {
    await sodium.ready;
    const kp = sodium.crypto_sign_seed_keypair(seed32);
    return {
      edPublicKey: new Uint8Array(kp.publicKey),
      edPrivateKey: new Uint8Array(kp.privateKey),
    };
  }

  async convertEdToX(edPublicKey: Uint8Array, edPrivateKey: Uint8Array) {
    this.ensureReady();
    const xPublic = sodium.crypto_sign_ed25519_pk_to_curve25519(edPublicKey);
    const xPrivate = sodium.crypto_sign_ed25519_sk_to_curve25519(edPrivateKey);
    return {
      xPublicKey: new Uint8Array(xPublic),
      xPrivateKey: new Uint8Array(xPrivate),
    };
  }

  toBase64(u8: Uint8Array): string {
    return sodium.to_base64(u8, sodium.base64_variants.ORIGINAL);
  }
  fromBase64(b64: string): Uint8Array {
    return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
  }

  async createEncryptedBackupAndDownload(edPrivateKey: Uint8Array, mnemonic: string, password: string | null) {
    this.ensureReady();

    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      mnemonic,
      edPrivateKey: this.toBase64(edPrivateKey)
    };

    const payloadStr = JSON.stringify(payload);

    const pw = password || '';
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const opslimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE;
    const memlimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE;

    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      pw,
      salt,
      opslimit,
      memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const cipher = sodium.crypto_secretbox_easy(payloadStr, nonce, key);

    const backupJson = {
      version: 1,
      salt: this.toBase64(salt),
      nonce: this.toBase64(nonce),
      opslimit,
      memlimit,
      ciphertext: this.toBase64(cipher),
    };

    const blob = new Blob([JSON.stringify(backupJson)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e2ee-backup-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async decryptBackup(backupJson: any, password: string) {
    this.ensureReady();
    const salt = this.fromBase64(backupJson.salt);
    const nonce = this.fromBase64(backupJson.nonce);
    const cipher = this.fromBase64(backupJson.ciphertext);
    const opslimit = backupJson.opslimit;
    const memlimit = backupJson.memlimit;

    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      salt,
      opslimit,
      memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
    if (!decrypted) throw new Error('Invalid password or corrupted backup');

    const decoder = new TextDecoder();
    const payloadStr = decoder.decode(decrypted);
    return JSON.parse(payloadStr);
  }

  async deriveSharedSecret(myXPrivate: Uint8Array, theirXPublic: Uint8Array) {
    this.ensureReady();
    const shared = sodium.crypto_scalarmult(myXPrivate, theirXPublic);
    return shared;
  }
}