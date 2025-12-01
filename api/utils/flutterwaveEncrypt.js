import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);

  // Generate 24-byte key from secret
  const md5 = crypto.createHash("md5").update(secretKey).digest(); // <Buffer>
  const key = Buffer.concat([md5, md5.slice(0, 8)]); // 16+8=24 bytes

  const cipher = crypto.createCipheriv("des-ede3", key, null);
  cipher.setAutoPadding(true);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
};
