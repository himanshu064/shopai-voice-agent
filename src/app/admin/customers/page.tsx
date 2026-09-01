import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { listCustomers } from "@/lib/services/admin";
import { formatDate } from "@/lib/format";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        title="Customers"
        description="Profiles with their orders, conversations, and support history."
      />

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" />
      ) : (
        <SectionCard title="All customers" count={customers.length} flush>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="group cursor-pointer">
                  <TableCell className="pl-5">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium group-hover:text-primary"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c._count.orders}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c._count.conversations}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c._count.supportTickets}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-muted-foreground group-hover:text-primary"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </div>
  );
}
