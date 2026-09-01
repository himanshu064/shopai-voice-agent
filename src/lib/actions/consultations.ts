"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomerId } from "@/lib/auth/session";
import {
  bookConsultation,
  sendConfirmation,
  cancelAppointment,
} from "@/lib/services/appointments";

/**
 * Book a slot and immediately send its confirmation — the same book →
 * confirm sequence the agent runs (spec §15-E), exposed to the storefront.
 */
export async function bookConsultationAction(slotId: string) {
  const customerId = await getCurrentCustomerId();
  const booking = await bookConsultation(customerId, slotId);
  if (!booking.ok || !booking.appointmentId) {
    return { ok: false as const, message: booking.message };
  }

  const confirmation = await sendConfirmation(customerId, booking.appointmentId);
  revalidatePath("/consultations");
  return {
    ok: true as const,
    message: confirmation.ok ? confirmation.message : booking.message,
    reference: confirmation.reference,
  };
}

export async function cancelAppointmentAction(appointmentId: string) {
  const customerId = await getCurrentCustomerId();
  const result = await cancelAppointment(customerId, appointmentId);
  if (result.ok) revalidatePath("/consultations");
  return result;
}
