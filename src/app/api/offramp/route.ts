import { NextResponse } from "next/server";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";
import { OfframpSchema } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const userId = await verifyAuth();

    const body = await req.json();
    const { success, data } = OfframpSchema.safeParse(body);

    if (!success) {
      return NextResponse.json({ message: "Incorrect inputs" }, { status: 411 });
    }

    await prisma.$transaction(async (tx) => {
      const userResponse = await tx.$queryRaw<
        { id: string; address: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;
      const user = userResponse[0];
      if (!user) {
        throw new Error("User not found");
      }

      // Convert USD amount (dollars) to cents (integer) for storage
      const amountInCents = Math.round(data.amount * 100);

      if (user.usdBalance < amountInCents) {
        throw new Error("Insufficient USD balance");
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          usdBalance: {
            decrement: amountInCents,
          },
        },
      });
    });

    return NextResponse.json({
      message: "Offramp successful",
      amount: data.amount,
    });
  } catch (error: any) {
    console.error("Error processing offramp:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message === "Insufficient USD balance") {
      return NextResponse.json({
        message: "Insufficient USD balance for offramp",
      }, { status: 403 });
    }
    if (error.message === "User not found") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Error processing offramp" }, { status: 500 });
  }
}
