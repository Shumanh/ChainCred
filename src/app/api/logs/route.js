import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { dbConnect } = await import("../../../lib/mongo");
    const { Issuance, Redemption, Business } = await import("../../../lib/models");
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const bizId = searchParams.get("bizId");
    const type = searchParams.get("type"); // issuance|redemption|all
    const limit = Math.min(Number(searchParams.get("limit") || 200), 1000);

    let business = null;
    if (bizId) {
      business = await Business.findOne({ bizId });
    }

    const filter = business ? { businessId: business._id } : {};
    const out = {};
    if (!type || type === "issuance" || type === "all") {
      out.issuances = await Issuance.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    }
    if (!type || type === "redemption" || type === "all") {
      out.redemptions = await Redemption.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    }
    return NextResponse.json(out);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}


