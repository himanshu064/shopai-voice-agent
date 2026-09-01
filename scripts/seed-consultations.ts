/**
 * Refresh the pool of open consultation slots (spec §15-E) without a full
 * reseed. Removes existing OPEN slots and creates a fresh spread of future
 * times across services, so the /consultations page has something to book.
 *
 *   npm run seed:slots
 *
 * Booked slots and their appointments are left untouched.
 */
import { SlotStatus } from "@prisma/client";
import { prisma } from "../src/lib/db";

const SERVICES = [
  "Product Expert Consultation",
  "Audio Specialist Session",
  "Smart Home Setup Advice",
];
const HOURS = [9, 11, 14, 16];

async function main() {
  const removed = await prisma.consultationSlot.deleteMany({
    where: { status: SlotStatus.OPEN },
  });

  // Base = tomorrow at 09:00 UTC, relative to the machine clock.
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 1);
  base.setUTCHours(9, 0, 0, 0);

  const data = [];
  for (let day = 0; day < 4; day++) {
    for (const hour of HOURS) {
      const start = new Date(base);
      start.setUTCDate(base.getUTCDate() + day);
      start.setUTCHours(hour, 0, 0, 0);
      data.push({
        service: SERVICES[(day + hour) % SERVICES.length],
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60 * 1000),
        status: SlotStatus.OPEN,
      });
    }
  }

  await prisma.consultationSlot.createMany({ data });
  console.log(`🗓️  Removed ${removed.count} open slot(s), created ${data.length} fresh ones.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ seed:slots failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
