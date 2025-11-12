// utils/flutterwaveEncrypt.js
import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = JSON.stringify(payload);

  // Ensure 24-byte key
  let key = Buffer.from(secretKey);
  if (key.length < 24) {
    // Pad with zeros if too short
    key = Buffer.concat([key, Buffer.alloc(24 - key.length)]);
  } else if (key.length > 24) {
    // Truncate if too long
    key = key.slice(0, 24);
  }

  const cipher = crypto.createCipheriv("des-ede3", key, null);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
};
