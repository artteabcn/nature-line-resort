// Owner notifications via Resend.
// Cloudflare Pages does not support the send_email binding, so the same
// HTTP-based provider is used for both guest and owner mail.

import { sendEmail } from "@/lib/resend";
import { COMMISSION_PERCENT, commissionAmount, ownerPayout } from "@/config/payments";

interface OwnerEmailParams {
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendOwnerEmail(params: OwnerEmailParams): Promise<void> {
  const raw = process.env.OWNER_EMAIL;
  if (!raw) throw new Error("OWNER_EMAIL not configured");
  const to = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  await sendEmail({
    to: to.length === 1 ? to[0] : to,
    subject: params.subject,
    html: params.html,
    from: process.env.OWNER_FROM_EMAIL,
    replyTo: params.replyTo,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bookingOwnerEmail(data: {
  name: string;
  email: string;
  phone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  notes?: string;
  totalPrice?: number;
  depositPaid?: number;
  balanceDue?: number;
  reservationId?: number;
}): { subject: string; html: string; replyTo: string } {
  const hasDeposit = data.depositPaid !== undefined && data.depositPaid > 0;
  const prefix = hasDeposit ? "New booking (deposit paid)" : "New booking";
  const subject = `${prefix} — ${data.name} — ${data.checkIn} → ${data.checkOut}`;
  const rows: [string, string][] = [
    ["Guest", data.name],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Room", data.room],
    ["Check-in", data.checkIn],
    ["Check-out", data.checkOut],
    ["Guests", String(data.guests)],
  ];
  if (data.totalPrice !== undefined) {
    rows.push(["Total stay", `${data.totalPrice.toLocaleString()} THB`]);
    rows.push([
      `Arkadya commission (${COMMISSION_PERCENT}%)`,
      `-${commissionAmount(data.totalPrice).toLocaleString()} THB`,
    ]);
    rows.push([
      "Your payout (we remit this)",
      `${ownerPayout(data.totalPrice).toLocaleString()} THB`,
    ]);
  }
  if (hasDeposit && data.depositPaid !== undefined) {
    rows.push(["Paid online (full)", `${data.depositPaid.toLocaleString()} THB`]);
  }
  if (data.balanceDue !== undefined && data.balanceDue > 0) {
    rows.push(["Balance due on arrival", `${data.balanceDue.toLocaleString()} THB`]);
  }
  if (data.reservationId !== undefined) {
    rows.push(["Smoobu reservation", `#${data.reservationId}`]);
  }
  if (data.notes) rows.push(["Notes", data.notes]);

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#4a7a8a;font-size:13px;">${escapeHtml(k)}</td><td style="padding:6px 0;color:#c9a840;font-size:14px;">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;">
      <h2 style="color:#1a6b8a;margin:0 0 16px;">New booking — Nature Line Resort</h2>
      <table style="border-collapse:collapse;">${tableRows}</table>
    </div>
  `;

  return { subject, html, replyTo: data.email };
}

export function contactOwnerEmail(data: { name: string; email: string; message: string }): {
  subject: string;
  html: string;
  replyTo: string;
} {
  return {
    subject: `Contact form — ${data.name}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;">
        <h2 style="color:#1a6b8a;margin:0 0 16px;">New contact message — Nature Line Resort</h2>
        <p style="color:#c9a840;font-size:14px;"><strong>${escapeHtml(data.name)}</strong> &lt;${escapeHtml(data.email)}&gt;</p>
        <p style="color:#c9a840;font-size:14px;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
      </div>
    `,
    replyTo: data.email,
  };
}
