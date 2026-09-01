import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/ai/session-token";

/**
 * Mint a conversation session token for the authenticated customer (spec §21).
 * The browser fetches this before starting an ElevenLabs conversation and
 * passes the token to the agent as a dynamic variable. Identity is derived from
 * server context here — never from the client.
 */
export async function POST() {
  try {
    const customer = await getCurrentCustomer();
    const token = signSessionToken({ customerId: customer.id, verified: true });
    return NextResponse.json({
      token,
      customer: { id: customer.id, name: customer.name },
    });
  } catch (err) {
    console.error("[session-token] failed", err);
    return NextResponse.json(
      { error: "Could not mint session token" },
      { status: 500 },
    );
  }
}
