import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = JSON.stringify(payload);

  // 1. Hash secret key (SHA-256) → take first 24 bytes
  const hash = crypto.createHash("sha256").update(secretKey).digest();
  const key = hash.slice(0, 24); // 24-byte 3DES key

  // 2. Use ECB mode for Flutterwave
  const cipher = crypto.createCipheriv("des-ede3-ecb", key, null);
  cipher.setAutoPadding(true);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};
