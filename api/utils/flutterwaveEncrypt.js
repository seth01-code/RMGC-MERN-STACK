// utils/flutterwaveEncrypt.js
import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);

  const hash = crypto.createHash("sha256").update(secretKey).digest();
  const key = hash.slice(0, 24);

  const cipher = crypto.createCipheriv("des-ede3-ecb", key, null);
  cipher.setAutoPadding(true);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(text, "utf8")),
    cipher.final(),
  ]);
  return encrypted.toString("base64");
};
