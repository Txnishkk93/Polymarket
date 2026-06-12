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

      const yesPosition = await tx.position.findFirst({
        where: {
          userId,
          marketId,
          type: "Yes",
        },
      });

      const noPosition = await tx.position.findFirst({
        where: {
          userId,
          marketId,
          type: "No",
        },
      });

      if (!yesPosition || yesPosition.qty < data.amount) {
        throw new Error("Insufficient Yes position");
      }

      if (!noPosition || noPosition.qty < data.amount) {
        throw new Error("Insufficient No position");
      }

      await tx.position.update({
        where: {
          userId_marketId_type: {
            userId,
            marketId,
            type: "Yes",
          },
        },
        data: {
          qty: { decrement: data.amount },
        },
      });

      await tx.position.update({
        where: {
          userId_marketId_type: {
            userId,
            marketId,
            type: "No",
          },
        },
        data: {
          qty: { decrement: data.amount },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          usdBalance: { increment: data.amount },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderType: "Merge",
          userId,
          price: 0,
          qty: data.amount,
          marketId: data.marketId,
        },
      });
    });

    return NextResponse.json({ message: "Merge successful" });
  } catch (error: any) {
    console.error("Error merging:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (
      error.message === "Insufficient Yes position" ||
      error.message === "Insufficient No position"
    ) {
      return NextResponse.json({
        message: "Sorry you dont have enough position",
      }, { status: 403 });
    }
    if (error.message === "User not found") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Error merging" }, { status: 500 });
  }
}
