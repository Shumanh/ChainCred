import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Lazy import to keep the serverless bundle smaller
    const { dbConnect } = await import("../../../lib/mongo");
    const { Business } = await import("../../../lib/models");
    await dbConnect();
    const docs = await Business.find({}, { __v: 0 }).sort({ createdAt: 1 });
    const byBiz = {};
    for (const d of docs) {
      const k = d.bizId || d._id.toString();
      const prev = byBiz[k];
      if (!prev || new Date(d.createdAt) > new Date(prev.createdAt)) byBiz[k] = d;
    }
    return NextResponse.json({ businesses: Object.values(byBiz) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}


