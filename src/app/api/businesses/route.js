import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/mongo";
import { Business } from "../../../lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const docs = await Business.find({}, { __v: 0 }).sort({ createdAt: 1 });
    // Deduplicate by bizId to avoid duplicate options in UI
    const byBiz = {};
    for (const d of docs) {
      const k = d.bizId || d._id.toString();
      const prev = byBiz[k];
      if (!prev || new Date(d.createdAt) > new Date(prev.createdAt)) byBiz[k] = d;
    }
    const unique = Object.values(byBiz);
    return NextResponse.json({ businesses: unique });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}


