import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  // payload must be an object
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);

  // 1. Hash secret key (SHA-256) → take first 24 bytes
  const hash = crypto.createHash("sha256").update(secretKey).digest();
  const key = hash.slice(0, 24); // 24-byte 3DES key

  // 2. Use ECB mode for Flutterwave
  const cipher = crypto.createCipheriv("des-ede3-ecb", key, null);
  cipher.setAutoPadding(true);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(text, "utf8")),
    cipher.final(),
  ]);

  return encrypted.toString("base64");
};
