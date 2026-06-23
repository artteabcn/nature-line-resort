import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "This endpoint is no longer in use. Use /api/booking instead." },
    { status: 410 }
  );
}
