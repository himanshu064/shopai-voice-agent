"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAppointmentAction } from "@/lib/actions/consultations";

export default function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelAppointmentAction(appointmentId);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setConfirming(false);
      router.refresh();
    });

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <X className="size-4" />
        Cancel
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="destructive" onClick={cancel} disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Confirm cancel
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        Keep
      </Button>
    </div>
  );
}
