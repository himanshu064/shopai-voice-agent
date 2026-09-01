"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOrderAction } from "@/lib/actions/orders";

export default function OrderActions({
  orderId,
  cancellable,
}: {
  orderId: string;
  cancellable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function cancel() {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId);
      if (result.ok) {
        toast.success(result.message);
        setConfirming(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (!cancellable) return null;

  return (
    <div>
      {
        confirming ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm">Cancel this order? Stock will be released.</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={cancel}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Yes, cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setConfirming(false)}
                disabled={isPending}
              >
                Keep order
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <XCircle className="size-4" />
            Cancel order
          </Button>
        )
      }
    </div>
  );
}
