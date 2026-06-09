import { NextResponse } from "next/server";
import { getGoogleReviews } from "@/lib/google-reviews";

export async function GET(req: Request): Promise<NextResponse> {
  const locale = new URL(req.url).searchParams.get("locale") ?? undefined;
  const data = await getGoogleReviews(locale);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
