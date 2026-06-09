import React from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { listAllPaidServices } from "@/lib/paid-services";
import ServicesEditor from "./ServicesEditor";

export default async function ServicesPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  const initialServices = await listAllPaidServices();

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Paid Services</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Extra services shown to guests in the Facilities section. Changes appear immediately.
      </p>
      <ServicesEditor initialServices={initialServices} />
    </div>
  );
}
