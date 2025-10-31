import crypto from "crypto";

export const encryptPayload = (payload, encryptionKey) => {
  const text = JSON.stringify(payload);
  const key = encryptionKey;

  // 3DES encryption using ECB mode
  const cipher = crypto.createCipheriv("des-ede3", key, null);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};
