import { NextResponse } from "next/server";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";
import { SplitSchema } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const userId = await verifyAuth();

    const body = await req.json();
    const { success, data } = SplitSchema.safeParse(body);

    if (!success) {
      return NextResponse.json({ message: "Incorrect inputs" }, { status: 411 });
    }

    const marketId = data.marketId;

    await prisma.$transaction(async (tx) => {
      const userResponse = await tx.$queryRaw<
        { id: string; address: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;
      const user = userResponse[0];
      if (!user) {
        throw new Error("User not found");
      }

      if (user.usdBalance < data.amount) {
        throw new Error("Insufficient USD balance");
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          usdBalance: {
            decrement: data.amount,
          },
        },
      });

      await tx.position.upsert({
        where: {
          userId_marketId_type: {
            marketId,
            userId,
            type: "Yes",
          },
        },
        create: {
          marketId,
          userId,
          type: "Yes",
          qty: data.amount,
        },
        update: {
          qty: { increment: data.amount },
        },
      });

      await tx.position.upsert({
        where: {
          userId_marketId_type: {
            marketId,
            userId,
            type: "No",
          },
        },
        create: {
          marketId,
          userId,
          type: "No",
          qty: data.amount,
        },
        update: {
          qty: { increment: data.amount },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderType: "Split",
          userId,
          price: 0,
          qty: data.amount,
          marketId: data.marketId,
        },
      });
    });

    return NextResponse.json({ message: "Split successful" });
  } catch (error: any) {
    console.error("Error splitting:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message === "Insufficient USD balance") {
      return NextResponse.json({
        message: "Sorry you dont have enough $ in your account",
      }, { status: 403 });
    }
    if (error.message === "User not found") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Error splitting" }, { status: 500 });
  }
}
