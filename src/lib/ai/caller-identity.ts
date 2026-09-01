import type { Customer } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Phone caller-ID identity (spec §21, phone channel).
 *
 * For phone calls there is no browser session to mint a token, so identity
 * starts from the caller's number. We match it against `Customer.phone`. A
 * caller-ID match is treated as identified for this demo; a production system
 * would layer a second factor (PIN, verification code) before trusting it for
 * sensitive actions — the session token already carries a `verified` flag for
 * exactly this.
 */

/** Reduce a phone number to comparable digits (last 10, US-style). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Resolve a customer from a raw caller-id string, or null if no match. */
export async function resolveCustomerByPhone(
  rawCallerId: string | null | undefined,
): Promise<Customer | null> {
  if (!rawCallerId) return null;
  const digits = normalizePhone(rawCallerId);
  if (digits.length < 7) return null; // too short to trust
  // Stored numbers are E.164 (e.g. "+15555550123"); match on the local digits.
  return prisma.customer.findFirst({
    where: { phone: { contains: digits } },
  });
}
