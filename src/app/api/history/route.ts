import { NextResponse } from "next/server";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await verifyAuth();

    const history = await prisma.orderHistory.findMany({
      where: { userId },
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Error fetching history:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: "Error fetching history" }, { status: 500 });
  }
}
