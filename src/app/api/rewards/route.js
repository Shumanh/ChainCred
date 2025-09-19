import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { dbConnect } = await import("../../../lib/mongo");
    const { Reward } = await import("../../../lib/models");
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const bizId = searchParams.get("bizId");
    const query = bizId ? { bizId } : {};
    const docs = await Reward.find(query, { __v: 0 }).sort({ bizId: 1, createdAt: 1 });
    return NextResponse.json({ rewards: docs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}


