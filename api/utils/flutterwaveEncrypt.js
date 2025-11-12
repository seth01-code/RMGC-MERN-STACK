import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = JSON.stringify(payload);

  // Hash secret key (SHA-256) → take first 24 bytes
  const hash = crypto.createHash("sha256").update(secretKey).digest();
  const key = hash.slice(0, 24); // 3DES-24 key

  const cipher = crypto.createCipheriv("des-ede3", key, null);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};
