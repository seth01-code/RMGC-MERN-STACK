import crypto from "crypto";

export const encryptPayload = (payload, secretKey) => {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);

  const key = crypto
    .createHash("md5")
    .update(secretKey)
    .digest("hex")
    .substring(0, 24);

  const cipher = crypto.createCipheriv("des-ede3", key, null);
  cipher.setAutoPadding(true);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
};
