import CryptoJS from "crypto-js";

const SECRET = process.env.NEXT_PUBLIC_AES_SECRET || "change-this-secret-in-production";

export function encryptText(text) {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
}

export function decryptText(encryptedText) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}
