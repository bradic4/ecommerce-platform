import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const HMAC_SECRET =
  process.env.REVALIDATION_HMAC_SECRET ||
  "dev-only-change-in-production-hmac-secret-key-32b";

/**
 * Section 25.6 & AT-20: Signed webhook called by .NET Worker after price, stock, or catalog changes.
 * Validates HMAC-SHA256 signature and timestamp, then calls revalidateTag for affected tags.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");
  const rawBody = await req.text();

  if (!signature || !timestamp) {
    return NextResponse.json(
      { error: "MISSING_SIGNATURE" },
      { status: 401 }
    );
  }

  const expectedHmac = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (
    signature.length !== expectedHmac.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedHmac, "utf8")
    )
  ) {
    return NextResponse.json(
      { error: "INVALID_SIGNATURE" },
      { status: 401 }
    );
  }

  try {
    const payload = JSON.parse(rawBody) as { tags?: string[] };
    const tags = Array.isArray(payload.tags) ? payload.tags : ["catalog"];
    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({
      revalidated: true,
      tags,
      at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }
}
