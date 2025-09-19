import { NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "../../../lib/mongo";
import { ApiKey, Redemption, Business } from "../../../lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const docs = await Redemption.find().sort({ createdAt: -1 }).limit(100);
    return NextResponse.json({ logs: docs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const rawKey = request.headers.get("x-api-key") || "";
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKeyDoc = await ApiKey.findOne({ keyHash, active: true });
    if (!apiKeyDoc) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await Business.findById(apiKeyDoc.businessId);
    if (!business) return NextResponse.json({ error: "Business not found for API key" }, { status: 401 });

    const body = await request.json();
    const payload = { ...body, businessId: apiKeyDoc.businessId };
    // Force scoping: ignore any client-provided bizId
    delete payload.bizId;
    const doc = await Redemption.create(payload);
    return NextResponse.json({ ok: true, entry: doc });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}


