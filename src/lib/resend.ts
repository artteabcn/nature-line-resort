const FROM = process.env.RESEND_FROM ?? "noreply@nature-line-resortkhanom.com";

export async function sendEmail(payload: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from ?? FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

// sendBookingConfirmation has moved to src/lib/guest-email.ts so the
// template can be localized and live alongside its message imports.

export async function sendContactReply(data: { to: string; name: string }): Promise<void> {
  await sendEmail({
    to: data.to,
    subject: "We received your message — Nature Line Resort",
    html: `
      <h2>Hello ${data.name},</h2>
      <p>Thank you for reaching out. We have received your message and will reply within 24 hours.</p>
      <p>Nature Line Resort</p>
    `,
  });
}
