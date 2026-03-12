import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16; // Auth tag length

function getKey(): Buffer {
  const key = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("MESSAGE_ENCRYPTION_KEY is not set in environment variables");
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects the format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getKey();
    const parts = encryptedText.split(":");

    if (parts.length !== 3) {
      // Not encrypted (legacy plain-text message), return as-is
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const ciphertext = parts[2];

    // Validate lengths to detect non-encrypted content
    if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
      return encryptedText;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // If decryption fails, it's likely a legacy unencrypted message
    return encryptedText;
  }
}
