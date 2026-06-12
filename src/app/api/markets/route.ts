import { NextResponse } from "next/server";
import { prisma } from "db";

// Dynamic routing to avoid static generation if DB changes
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markets = await prisma.market.findMany();
    return NextResponse.json({ markets });
  } catch (err) {
    console.error("Fetch markets error:", err);
    return NextResponse.json({ error: "Error fetching markets" }, { status: 500 });
  }
}
