import argon2 from "argon2";

/**
 * Hash password using Argon2id with recommended options
 * @param password Plain password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024, // 19 MB
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify password against Argon2id hash
 * @param hash Password hash
 * @param plain Plain password to verify
 * @returns True if password matches hash
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch (err) {
    return false;
  }
}
