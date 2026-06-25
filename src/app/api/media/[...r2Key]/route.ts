import { type NextRequest, NextResponse } from "next/server";
import { getR2OrNull } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ r2Key: string[] }> }
): Promise<NextResponse> {
  const { r2Key } = await params;
  const key = r2Key.join("/");

  const r2 = await getR2OrNull();
  if (!r2) {
    return new NextResponse("R2 unavailable", { status: 503 });
  }

  const object = await r2.get(key);
  if (!object) {
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new NextResponse(object.body as ReadableStream, { headers });
}
