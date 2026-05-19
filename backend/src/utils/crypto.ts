import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

export function encryptMessage(
  plaintext: string | null | undefined
): Uint8Array<ArrayBuffer> | null {
  if (!plaintext) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  const bytes = new Uint8Array(new ArrayBuffer(payload.length));
  bytes.set(payload);
  return bytes as Uint8Array<ArrayBuffer>;
}

export function decryptMessage(ciphertext: Uint8Array | Buffer | null | undefined): string | null {
  if (!ciphertext || ciphertext.length < 28) {
    return null;
  }

  try {
    const payload = Buffer.from(ciphertext);
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Message decryption failed", error);
    return "[Noi dung khong the giai ma]";
  }
}
