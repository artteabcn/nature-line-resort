import { NextResponse } from "next/server";
import { listActivePaidServices } from "@/lib/paid-services";

export async function GET(): Promise<NextResponse> {
  const services = await listActivePaidServices();
  return NextResponse.json(
    { services },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
