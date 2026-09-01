import { prisma } from "@/lib/db";
import type { Customer } from "@prisma/client";

/**
 * Resolve the "current" customer.
 *
 * DEMO STUB: for now this returns the seeded demo customer so the shopping
 * flows work without a login screen. In the auth phase this is the single
 * place to swap in real authenticated-session resolution (spec §21 — identity
 * must be derived from server context, never from a client/model-supplied ID).
 */
export async function getCurrentCustomer(): Promise<Customer> {
  const customer = await prisma.customer.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!customer) {
    throw new Error(
      "No customer found. Run `npm run db:seed` to create the demo customer.",
    );
  }
  return customer;
}

export async function getCurrentCustomerId(): Promise<string> {
  const customer = await getCurrentCustomer();
  return customer.id;
}
