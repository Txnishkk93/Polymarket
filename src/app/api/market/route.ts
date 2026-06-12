import { NextResponse } from "next/server";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");

    if (!marketId) {
      return NextResponse.json({ message: "marketId query parameter is required" }, { status: 400 });
    }

    const market = await prisma.market.findFirst({
      where: { id: marketId },
    });

    if (!market) {
      return NextResponse.json({ message: "Market not found" }, { status: 404 });
    }

    return NextResponse.json({ market });
  } catch (err) {
    console.error("Fetch market error:", err);
    return NextResponse.json({ error: "Error fetching market" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Authenticate
    await verifyAuth();

    const { title, description, resolutionDescription } = await req.json();

    if (!title || !description || !resolutionDescription) {
      return NextResponse.json({ message: "Incorrect inputs" }, { status: 411 });
    }

    const market = await prisma.market.create({
      data: {
        title,
        description,
        resolutionDescription,
        yesOrderbook: {},
        noOrderbook: {},
        totalQty: 0,
      },
    });

    return NextResponse.json({ market });
  } catch (err: any) {
    console.error("Create market error:", err);
    if (err.message === "Token missing" || err.message === "Invalid token") {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Error creating market" }, { status: 500 });
  }
}
