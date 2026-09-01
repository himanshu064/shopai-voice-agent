"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkoutAction } from "@/lib/actions/cart";

export default function PlaceOrderButton() {
  const [isPending, startTransition] = useTransition();

  function placeOrder() {
    startTransition(async () => {
      const result = await checkoutAction();
      // On success the action redirects to the order page; we only reach here
      // if it failed.
      if (result && !result.ok) toast.error(result.message);
    });
  }

  return (
    <Button
      size="lg"
      className="h-11 w-full"
      onClick={placeOrder}
      disabled={isPending}
    >
      <CheckCircle2 className="size-4" />
      {isPending ? "Placing order…" : "Place order"}
    </Button>
  );
}
