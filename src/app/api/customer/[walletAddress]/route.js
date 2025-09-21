import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { walletAddress } = await params;
    const { dbConnect } = await import("../../../../lib/mongo");
    const { Customer } = await import("../../../../lib/models");
    await dbConnect();

    const customer = await Customer.findOne({ walletAddress });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}
