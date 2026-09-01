import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Headphones,
  Sparkles,
} from "lucide-react";
import { getCurrentCustomerId } from "@/lib/auth/session";
import {
  listAppointments,
  checkAvailability,
  confirmationRef,
} from "@/lib/services/appointments";
import { PageContainer, PageHeader } from "@/components/common/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { AppointmentStatusBadge } from "@/components/admin/badges";
import BookSlotButton from "@/components/consultations/BookSlotButton";
import CancelAppointmentButton from "@/components/consultations/CancelAppointmentButton";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d) + " UTC";

export default async function ConsultationsPage() {
  const customerId = await getCurrentCustomerId();
  const [appointments, availability] = await Promise.all([
    listAppointments(customerId),
    checkAvailability(),
  ]);

  const active = appointments.filter(
    (a) => a.status === "BOOKED" || a.status === "CONFIRMED",
  );
  const past = appointments.filter(
    (a) => a.status === "CANCELLED" || a.status === "COMPLETED",
  );

  // Group open slots by day for a tidy schedule.
  const slotsByDay = new Map<string, typeof availability.slots>();
  for (const s of availability.slots) {
    const day = fmtDate(new Date(s.startsAt));
    if (!slotsByDay.has(day)) slotsByDay.set(day, []);
    slotsByDay.get(day)!.push(s);
  }

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="Expert consultations"
        description="Book a 1-on-1 session with a ShopAI product specialist."
      />

      {/* Ask Sarah callout — booking is also an agent workflow */}
      <div className="mb-8 flex flex-col items-start gap-4 rounded-xl bg-linear-to-br from-primary/10 via-primary/5 to-accent/40 p-5 ring-1 ring-primary/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Headphones className="size-5" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-semibold">
              Prefer to just ask?
              <Sparkles className="size-4 text-primary" />
            </p>
            <p className="text-sm text-muted-foreground">
              Sarah can find a time and book it for you — by text or voice.
            </p>
          </div>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/support">
            <Headphones className="size-4" />
            Ask Sarah
          </Link>
        </Button>
      </div>

      {/* Your consultations */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Your consultations</h2>
        {active.length === 0 && past.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No consultations yet"
            description="Book an open time below, or ask Sarah to set one up for you."
          />
        ) : (
          <div className="space-y-3">
            {[...active, ...past].map((a) => {
              const start = new Date(a.slot.startsAt);
              const cancellable = a.status === "BOOKED" || a.status === "CONFIRMED";
              return (
                <Card key={a.id} className="gap-0 p-0">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <CalendarDays className="size-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{a.slot.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtDate(start)} · {fmtTime(start)}
                        </p>
                        {a.confirmationSentAt && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                            Confirmed · ref {confirmationRef(a.id)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <AppointmentStatusBadge status={a.status} />
                      {cancellable && <CancelAppointmentButton appointmentId={a.id} />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Available times */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available times</h2>
          <span className="text-sm text-muted-foreground">
            {availability.count} open slot{availability.count === 1 ? "" : "s"}
          </span>
        </div>
        {availability.count === 0 ? (
          <EmptyState
            icon={Clock}
            title="No open slots right now"
            description="Please check back soon — new consultation times are added regularly."
          />
        ) : (
          <div className="space-y-6">
            {[...slotsByDay.entries()].map(([day, slots]) => (
              <div key={day}>
                <p className="mb-2 text-sm font-medium text-muted-foreground">{day}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {slots.map((s) => (
                    <Card key={s.slotId} className="gap-0 p-0">
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <p className="text-sm font-medium">{s.service}</p>
                          <p className="text-sm text-muted-foreground">
                            {fmtTime(new Date(s.startsAt))}
                          </p>
                        </div>
                        <BookSlotButton slotId={s.slotId} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
