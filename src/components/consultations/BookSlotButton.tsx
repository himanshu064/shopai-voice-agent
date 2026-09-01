"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookConsultationAction } from "@/lib/actions/consultations";

export default function BookSlotButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const book = () =>
    startTransition(async () => {
      const result = await bookConsultationAction(slotId);
      if (result.ok) {
        toast.success("Consultation booked", { description: result.message });
      } else {
        toast.error(result.message);
      }
      router.refresh();
    });

  return (
    <Button size="sm" onClick={book} disabled={isPending} className="w-full sm:w-auto">
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CalendarPlus className="size-4" />
      )}
      Book
    </Button>
  );
}
