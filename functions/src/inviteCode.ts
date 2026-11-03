/**
 * Short invite-code generation (Phase 2.3). Replaces exposing the Firebase UID
 * as a "partner code". Codes are non-secret tokens for claiming only.
 */

import { createHash, randomInt } from "node:crypto";

// An alphabet with unambiguous characters (no 0/O, 1/I) to avoid confusion.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars

/** Generate a random invite code of the given length. */
export function generateInviteCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Normalize user-typed codes (upper, strip spaces/dashes). */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

/** Store only a one-way lookup value; the short code itself is returned once. */
export function hashInviteCode(input: string): string {
  return createHash("sha256").update(normalizeCode(input)).digest("hex");
}

/** Validate a code format before it is dereferenced. */
export function isValidCodeFormat(code: string, length = 6): boolean {
  return new RegExp(`^[${ALPHABET}]{${length}}$`).test(code);
}
