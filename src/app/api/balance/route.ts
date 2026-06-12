import { NextResponse } from "next/server";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await verifyAuth();

    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    return NextResponse.json({
      balance: user?.usdBalance || 0,
    });
  } catch (error: any) {
    console.error("Error fetching balance:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: "Error fetching balance" }, { status: 500 });
  }
}
