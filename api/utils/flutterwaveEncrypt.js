// utils/flutterwaveEncrypt.js
import crypto from "crypto";

export const encryptPayload = (payload, encryptionKey) => {
  const text = JSON.stringify(payload);

  // 3DES-24 encryption (Flutterwave requirement)
  const cipher = crypto.createCipheriv("des-ede3", encryptionKey, null);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
};
