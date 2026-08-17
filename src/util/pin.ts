import CryptoJS from "crypto-js";

// The API returns the user's PIN AES-CBC encrypted, with the IV as the first 32 hex
// chars of the payload. Returns "" when there is no PIN or decryption fails.
export function decryptPin(encryptedPin: string): string {
  if (!encryptedPin) return "";
  try {
    const key = CryptoJS.enc.Utf8.parse(process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "");
    const iv = CryptoJS.enc.Hex.parse(encryptedPin.slice(0, 32));
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedPin.slice(32));
    const decrypted = CryptoJS.AES.decrypt({ ciphertext } as any, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}
