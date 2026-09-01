"use client";

import { useState } from "react";
import Link from "next/link";
import type { TicketStatus, TicketPriority } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/admin/badges";
import { formatDateTime } from "@/lib/format";

export interface TicketRow {
  id: string;
  reference: string;
  category: string;
  description: string | null;
  aiSummary: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  customer: { id: string; name: string };
  orderRef: string | null;
}

export default function TicketsTable({ tickets }: { tickets: TicketRow[] }) {
  const [selected, setSelected] = useState<TicketRow | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Ticket</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow
              key={t.id}
              onClick={() => setSelected(t)}
              className="cursor-pointer"
            >
              <TableCell className="pl-5 font-mono text-xs text-muted-foreground">
                #{t.reference}
              </TableCell>
              <TableCell>
                <p className="font-medium capitalize">{t.category}</p>
                <p className="max-w-xs truncate text-xs text-muted-foreground">
                  {t.aiSummary ?? t.description}
                </p>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/customers/${t.customer.id}`}
                  className="hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.customer.name}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {t.orderRef ?? "—"}
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={t.priority} />
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={t.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(t.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <TicketPriorityBadge priority={selected.priority} />
                  <TicketStatusBadge status={selected.status} />
                </div>
                <DialogTitle className="mt-2 capitalize">
                  {selected.category}
                </DialogTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  Ticket #{selected.reference}
                </p>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Summary
                  </p>
                  <p className="leading-relaxed text-foreground">
                    {selected.aiSummary ?? selected.description ?? "—"}
                  </p>
                </div>

                {selected.description &&
                  selected.description !== selected.aiSummary && (
                    <div>
                      <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Details
                      </p>
                      <p className="leading-relaxed text-foreground">
                        {selected.description}
                      </p>
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Customer
                    </p>
                    <Link
                      href={`/admin/customers/${selected.customer.id}`}
                      className="hover:text-primary"
                    >
                      {selected.customer.name}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Order
                    </p>
                    <p className="font-mono text-xs">{selected.orderRef ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Created
                    </p>
                    <p>{formatDateTime(selected.createdAt)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
