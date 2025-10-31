import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = JSON.stringify(payload);

  // Flutterwave uses 24-byte key for 3DES
  const key = crypto
    .createHash("md5")
    .update(secretKey)
    .digest("hex")
    .substring(0, 24);

  const cipher = crypto.createCipheriv("des-ede3", key, null);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};
