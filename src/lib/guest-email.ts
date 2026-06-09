// Localized booking confirmation email — picks copy by guest locale,
// formats dates in the same locale, and renders an email-client-safe
// inline-styled HTML table.

import { sendEmail } from "@/lib/resend";
import { SITE } from "@/config/site";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import th from "../../messages/th.json";

type Locale = "en" | "fr" | "de" | "th";

const messages = { en, fr, de, th } as const;

function pickLocale(input: string | undefined): Locale {
  if (input === "fr" || input === "de" || input === "th") return input;
  return "en";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined ? "" : String(v);
  });
}

function formatDate(iso: string, locale: Locale): string {
  // Buddhist calendar for Thai per CLAUDE.md i18n guidance.
  const calendar: "buddhist" | "gregory" = locale === "th" ? "buddhist" : "gregory";
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      calendar,
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    // Edge runtimes with limited ICU may not support all options — fall back.
    return iso;
  }
}

function localizedRoomName(roomId: string, locale: Locale): string {
  const items = messages[locale].rooms.items as Array<{ id: string; name: string }>;
  const match = items.find((r) => r.id === roomId);
  if (match) return match.name;
  // Fallback to English label, then the raw id.
  const enMatch = (messages.en.rooms.items as Array<{ id: string; name: string }>).find(
    (r) => r.id === roomId
  );
  return enMatch?.name ?? roomId;
}

export interface BookingConfirmationInput {
  to: string;
  name: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
  reservationId?: number;
  locale?: string;
}

interface Copy {
  subject: string;
  preheader: string;
  greeting: string;
  intro: string;
  stayTitle: string;
  roomLabel: string;
  checkInLabel: string;
  checkOutLabel: string;
  guestsLabel: string;
  reservationLabel: string;
  paymentTitle: string;
  totalLabel: string;
  depositLabel: string;
  balanceLabel: string;
  balanceNote: string;
  nonRefundableNote: string;
  contactTitle: string;
  contactBody: string;
  signOff: string;
  houseName: string;
  houseAddress: string;
}

export function renderBookingConfirmation(input: BookingConfirmationInput): {
  subject: string;
  html: string;
} {
  const locale = pickLocale(input.locale);
  const copy = messages[locale].emails.bookingConfirmation as Copy;
  const nameSafe = escapeHtml(input.name);
  const roomName = escapeHtml(localizedRoomName(input.roomId, locale));
  const checkIn = formatDate(input.checkIn, locale);
  const checkOut = formatDate(input.checkOut, locale);
  const phone = SITE.phone.display;

  const subject = copy.subject;
  const preheader = copy.preheader;
  const greeting = interpolate(copy.greeting, { name: nameSafe });
  const contactBody = interpolate(copy.contactBody, { phone });

  const fmt = (n: number): string => n.toLocaleString(locale);

  const reservationRow = input.reservationId
    ? row(copy.reservationLabel, `#${input.reservationId}`)
    : "";

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5fafd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#c9a840;">
<div style="display:none;font-size:1px;color:#f5fafd;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5fafd;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 1px 2px rgba(15,123,110,0.06);">
      <tr><td style="background:#1a6b8a;padding:36px 32px 28px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:300;letter-spacing:1.5px;line-height:1;">Nature Line Resort</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Nakhon Si Thammarat</p>
      </td></tr>
      <tr><td style="padding:36px 36px 0;">
        <h2 style="margin:0;font-family:'Libre Baskerville',Georgia,serif;font-weight:500;font-size:28px;color:#c9a840;line-height:1.2;">${greeting}</h2>
        <p style="margin:16px 0 0;font-size:15px;line-height:24px;color:#4a7a8a;">${escapeHtml(copy.intro)}</p>
      </td></tr>
      <tr><td style="padding:32px 36px 0;">
        ${sectionLabel(copy.stayTitle)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #c4dfe8;border-radius:12px;border-collapse:separate;">
          ${row(copy.roomLabel, roomName)}
          ${row(copy.checkInLabel, escapeHtml(checkIn))}
          ${row(copy.checkOutLabel, escapeHtml(checkOut))}
          ${row(copy.guestsLabel, String(input.guests), reservationRow === "")}
          ${reservationRow}
        </table>
      </td></tr>
      <tr><td style="padding:24px 36px 0;">
        ${sectionLabel(copy.paymentTitle)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f0f7fb;border-radius:12px;border-collapse:separate;">
          ${row(copy.totalLabel, `${fmt(input.totalPrice)} THB`)}
          ${rowHighlight(copy.depositLabel, `${fmt(input.depositPaid)} THB`)}
          ${input.balanceDue > 0 ? rowTotal(copy.balanceLabel, `${fmt(input.balanceDue)} THB`) : ""}
        </table>
        <p style="margin:12px 0 0;font-size:12px;line-height:18px;color:#4a7a8a;">${escapeHtml(copy.balanceNote)}</p>
        <p style="margin:8px 0 0;font-size:12px;line-height:18px;color:#0e4a62;">${escapeHtml(copy.nonRefundableNote)}</p>
      </td></tr>
      <tr><td style="padding:32px 36px 0;">
        ${sectionLabel(copy.contactTitle)}
        <p style="margin:0;font-size:14px;line-height:22px;color:#4a7a8a;">${escapeHtml(contactBody)}</p>
      </td></tr>
      <tr><td style="padding:32px 36px 36px;">
        <p style="margin:0;font-family:'Libre Baskerville',Georgia,serif;font-size:22px;color:#c9a840;">${escapeHtml(copy.signOff)}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#c9a840;font-weight:600;">${escapeHtml(copy.houseName)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#4a7a8a;">${escapeHtml(copy.houseAddress)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

function sectionLabel(label: string): string {
  return `<p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0e4a62;font-weight:600;">${escapeHtml(label)}</p>`;
}

function row(label: string, value: string, isLast: boolean = false): string {
  const border = isLast ? "" : "border-bottom:1px solid #f0f7fb;";
  return `<tr><td style="padding:14px 18px;${border}font-size:13px;color:#4a7a8a;">${escapeHtml(label)}</td><td style="padding:14px 18px;${border}font-size:14px;color:#c9a840;text-align:right;font-weight:600;">${value}</td></tr>`;
}

function rowHighlight(label: string, value: string): string {
  return `<tr><td style="padding:14px 18px;border-bottom:1px solid #c4dfe8;font-size:13px;color:#c9a840;font-weight:600;">${escapeHtml(label)}</td><td style="padding:14px 18px;border-bottom:1px solid #c4dfe8;font-size:14px;color:#c9a840;text-align:right;font-weight:700;">${value}</td></tr>`;
}

function rowTotal(label: string, value: string): string {
  return `<tr><td style="padding:14px 18px;font-size:13px;color:#4a7a8a;">${escapeHtml(label)}</td><td style="padding:14px 18px;font-size:14px;color:#c9a840;text-align:right;font-weight:600;">${value}</td></tr>`;
}

export async function sendBookingConfirmation(input: BookingConfirmationInput): Promise<void> {
  const { subject, html } = renderBookingConfirmation(input);
  await sendEmail({
    to: input.to,
    subject,
    html,
  });
}
