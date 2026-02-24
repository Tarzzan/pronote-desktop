import CryptoJS from 'crypto-js';

/**
 * Chiffrement AES-256-CBC utilisé par l'API Pronote
 * Basé sur le reverse engineering de pronotepy
 */

export function md5(data: string): string {
  return CryptoJS.MD5(data).toString(CryptoJS.enc.Hex);
}

export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

export function aesEncrypt(data: string, key: string, iv: string): string {
  const keyBytes = CryptoJS.enc.Hex.parse(key);
  const ivBytes = CryptoJS.enc.Hex.parse(iv);
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(data),
    keyBytes,
    {
      iv: ivBytes,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
}

export function aesDecrypt(data: string, key: string, iv: string): string {
  const keyBytes = CryptoJS.enc.Hex.parse(key);
  const ivBytes = CryptoJS.enc.Hex.parse(iv);
  const ciphertext = CryptoJS.enc.Hex.parse(data);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyBytes, {
    iv: ivBytes,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
