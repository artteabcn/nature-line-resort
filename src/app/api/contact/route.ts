import { NextRequest, NextResponse } from "next/server";
import { ContactSchema } from "@/lib/validations/contact";
import { sendOwnerEmail, contactOwnerEmail } from "@/lib/owner-email";
import { sendContactReply } from "@/lib/resend";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = ContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, email, message } = parsed.data;

    const [ownerResult, guestResult] = await Promise.allSettled([
      sendOwnerEmail(contactOwnerEmail({ name, email, message })),
      sendContactReply({ to: email, name }),
    ]);

    const warnings: { ownerEmail?: string; guestEmail?: string } = {};
    if (ownerResult.status === "rejected") {
      const reason =
        ownerResult.reason instanceof Error
          ? ownerResult.reason.message
          : String(ownerResult.reason);
      console.error("Contact owner email failed:", reason);
      warnings.ownerEmail = reason;
    }
    if (guestResult.status === "rejected") {
      const reason =
        guestResult.reason instanceof Error
          ? guestResult.reason.message
          : String(guestResult.reason);
      console.error("Contact guest reply failed:", reason);
      warnings.guestEmail = reason;
    }

    return NextResponse.json({
      ok: true,
      ...(Object.keys(warnings).length > 0 ? { warnings } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
