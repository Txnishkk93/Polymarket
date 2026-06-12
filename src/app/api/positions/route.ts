import { NextResponse } from "next/server";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await verifyAuth();

    const positions = await prisma.position.findMany({
      where: { userId },
    });

    return NextResponse.json({ positions });
  } catch (error: any) {
    console.error("Error fetching positions:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: "Error fetching positions" }, { status: 500 });
  }
}
