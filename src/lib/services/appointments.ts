import { prisma } from "@/lib/db";
import { AppointmentStatus, SlotStatus, Prisma } from "@prisma/client";

/** Open consultation slots (spec §15-E). Optionally filter by service/date range. */
export async function checkAvailability(input: {
  service?: string;
  from?: string;
  to?: string;
} = {}) {
  const where: Prisma.ConsultationSlotWhereInput = { status: SlotStatus.OPEN };
  if (input.service) where.service = input.service;
  if (input.from || input.to) {
    where.startsAt = {};
    if (input.from) where.startsAt.gte = new Date(input.from);
    if (input.to) where.startsAt.lte = new Date(input.to);
  }

  const slots = await prisma.consultationSlot.findMany({
    where,
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  return {
    count: slots.length,
    slots: slots.map((s) => ({
      slotId: s.id,
      service: s.service,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
    })),
  };
}

export interface BookingResult {
  ok: boolean;
  message: string;
  appointmentId?: string;
}

/** Book an open slot (spec §15-E). Transactional to avoid double-booking. */
export async function bookConsultation(
  customerId: string,
  slotId: string,
): Promise<BookingResult> {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.consultationSlot.findUnique({ where: { id: slotId } });
    if (!slot) return { ok: false, message: "I couldn't find that time slot." };
    if (slot.status !== SlotStatus.OPEN) {
      return { ok: false, message: "Sorry, that slot was just taken. Want me to find another?" };
    }

    await tx.consultationSlot.update({
      where: { id: slotId },
      data: { status: SlotStatus.BOOKED },
    });
    const appointment = await tx.appointment.create({
      data: {
        customerId,
        slotId,
        type: slot.service,
        status: AppointmentStatus.BOOKED,
      },
    });

    return {
      ok: true,
      appointmentId: appointment.id,
      message: `Booked ${slot.service} for ${slot.startsAt.toISOString().slice(0, 16).replace("T", " ")} UTC.`,
    };
  });
}

export interface ConfirmationResult {
  ok: boolean;
  message: string;
  reference?: string;
}

/** Human-facing confirmation reference for an appointment. */
export function confirmationRef(appointmentId: string): string {
  return `APT-${appointmentId.slice(-8).toUpperCase()}`;
}

/**
 * Send/record a booking confirmation (spec §15-E). Real email is a future
 * extension; for now we mark the appointment confirmed, stamp the time, and
 * return a confirmation reference.
 */
export async function sendConfirmation(
  customerId: string,
  appointmentId: string,
): Promise<ConfirmationResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { slot: true },
  });
  if (!appointment || appointment.customerId !== customerId) {
    return { ok: false, message: "I couldn't find that appointment." };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CONFIRMED,
      confirmationSentAt: new Date(),
    },
  });

  const reference = confirmationRef(appointmentId);
  return {
    ok: true,
    reference,
    message: `Confirmation ${reference} sent for your ${appointment.slot.service} on ${appointment.slot.startsAt
      .toISOString()
      .slice(0, 10)}.`,
  };
}

/** The customer's consultations, newest first (spec §15-E). */
export async function listAppointments(customerId: string) {
  return prisma.appointment.findMany({
    where: { customerId },
    orderBy: { slot: { startsAt: "asc" } },
    include: { slot: true },
  });
}

export interface CancelAppointmentResult {
  ok: boolean;
  message: string;
}

/** Cancel a consultation and release its slot back to the pool. */
export async function cancelAppointment(
  customerId: string,
  appointmentId: string,
): Promise<CancelAppointmentResult> {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment || appointment.customerId !== customerId) {
      return { ok: false, message: "I couldn't find that appointment." };
    }
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      return {
        ok: false,
        message: `This consultation is already ${appointment.status.toLowerCase()}.`,
      };
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
    });
    await tx.consultationSlot.update({
      where: { id: appointment.slotId },
      data: { status: SlotStatus.OPEN },
    });

    return { ok: true, message: "Your consultation has been cancelled." };
  });
}
