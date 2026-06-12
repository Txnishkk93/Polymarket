import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "db";
import { verifyAuth } from "@/lib/serverAuth";
import { CreateOrderSchema, type Orderbook } from "@/lib/types";

function parseOrderbook(orderbook: unknown): Orderbook {
  if (typeof orderbook === "string") {
    return JSON.parse(orderbook);
  }
  if (orderbook && typeof orderbook === "object") {
    return orderbook as Orderbook;
  }
  return {};
}

export async function POST(req: Request) {
  try {
    // Authenticate user
    const userId = await verifyAuth();

    // Parse payload
    const body = await req.json();
    const { success, data } = CreateOrderSchema.safeParse(body);

    if (!success) {
      return NextResponse.json({ message: "Incorrect inputs" }, { status: 411 });
    }

    const originalOrderId = randomUUID();

    await prisma.$transaction(async (tx) => {
      const response = await tx.$queryRaw<
        { yesOrderbook: unknown; noOrderbook: unknown; id: string; totalQty: number }[]
      >`SELECT * FROM "Market" WHERE id=${data.marketId} FOR UPDATE;`;
      const userResponse = await tx.$queryRaw<
        { id: string; address: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

      const user = userResponse[0];
      if (!user) {
        throw new Error("User not found");
      }
      const market = response[0];
      if (!market) {
        throw new Error("Market not found");
      }

      const yesOrderbook = parseOrderbook(market.yesOrderbook);
      const noOrderbook = parseOrderbook(market.noOrderbook);

      if (data.side === "yes" && data.type === "buy") {
        const usd = data.qty * data.price;
        if (user.usdBalance < usd) {
          throw new Error("Insufficient USD balance");
        }

        let leftQty = data.qty;

        const prices = Object.keys(yesOrderbook).sort(
          (a: string, b: string) => Number(a) - Number(b)
        );

        for (const price of prices) {
          if (Number(price) > data.price) {
            continue;
          }
          const { orders } = yesOrderbook[price]!;

          for (const order of orders) {
            if (leftQty <= 0) break;

            const availableQty = order.qty - order.filledQty;
            const matchedQty = Math.min(availableQty, leftQty);
            const reverseOrder = order.reverseOrder;
            if (!reverseOrder) {
              await tx.user.update({
                where: { id: order.userId },
                data: {
                  usdBalance: {
                    increment: Number(price) * matchedQty,
                  },
                },
              });
            } else {
              await tx.position.upsert({
                where: {
                  userId_marketId_type: {
                    userId: order.userId,
                    marketId: data.marketId,
                    type: "No",
                  },
                },
                update: {
                  qty: { increment: matchedQty },
                },
                create: {
                  userId: order.userId,
                  marketId: data.marketId,
                  type: "No",
                  qty: matchedQty,
                },
              });
            }
            await tx.position.upsert({
              where: {
                userId_marketId_type: {
                  userId,
                  marketId: data.marketId,
                  type: "Yes",
                },
              },
              update: {
                qty: { increment: matchedQty },
              },
              create: {
                userId,
                marketId: data.marketId,
                type: "Yes",
                qty: matchedQty,
              },
            });

            await tx.user.update({
              where: { id: userId },
              data: {
                usdBalance: {
                  decrement: Number(price) * matchedQty,
                },
              },
            });

            leftQty -= matchedQty;
            order.filledQty += matchedQty;
            yesOrderbook[price]!.availableQty -= matchedQty;
          }
        }

        if (leftQty > 0) {
          const oppositePrice = 100 - data.price;
          if (!noOrderbook[oppositePrice]) {
            noOrderbook[oppositePrice] = { availableQty: 0, orders: [] };
          }

          noOrderbook[oppositePrice]!.availableQty += leftQty;
          noOrderbook[oppositePrice]!.orders.push({
            qty: leftQty,
            userId,
            filledQty: 0,
            originalOrderId,
            reverseOrder: true,
          });
          await tx.user.update({
            where: { id: userId },
            data: {
              usdBalance: {
                decrement: Number(data.price) * leftQty,
              },
            },
          });
        }
      }

      if (data.side === "yes" && data.type === "sell") {
        const buyPrice = 100 - data.price;

        const userPosition = await tx.position.findFirst({
          where: {
            userId: userId,
            marketId: data.marketId,
            type: "Yes",
          },
        });

        if (!userPosition || userPosition.qty < data.qty) {
          throw new Error("Insufficient Yes position");
        }

        let leftQty = data.qty;

        const prices = Object.keys(noOrderbook).sort(
          (a: string, b: string) => Number(a) - Number(b)
        );

        for (const price of prices) {
          if (Number(price) > buyPrice) {
            continue;
          }
          const { orders } = noOrderbook[price]!;

          for (const order of orders) {
            if (leftQty <= 0) break;

            const availableQty = order.qty - order.filledQty;
            const matchedQty = Math.min(availableQty, leftQty);
            const reverseOrder = order.reverseOrder;
            if (!reverseOrder) {
              await tx.user.update({
                where: { id: order.userId },
                data: {
                  usdBalance: {
                    increment: Number(price) * matchedQty,
                  },
                },
              });
            } else {
              await tx.position.upsert({
                where: {
                  userId_marketId_type: {
                    userId: order.userId,
                    marketId: data.marketId,
                    type: "Yes",
                  },
                },
                update: {
                  qty: { increment: matchedQty },
                },
                create: {
                  userId: order.userId,
                  marketId: data.marketId,
                  type: "Yes",
                  qty: matchedQty,
                },
              });
            }
            await tx.position.update({
              where: {
                userId_marketId_type: {
                  userId,
                  marketId: data.marketId,
                  type: "Yes",
                },
              },
              data: {
                qty: { decrement: matchedQty },
              },
            });

            await tx.user.update({
              where: { id: userId },
              data: {
                usdBalance: {
                  increment: Number(price) * matchedQty,
                },
              },
            });

            leftQty -= matchedQty;
            order.filledQty += matchedQty;
            noOrderbook[price]!.availableQty -= matchedQty;
          }
        }

        if (leftQty > 0) {
          if (!yesOrderbook[data.price]) {
            yesOrderbook[data.price] = { availableQty: 0, orders: [] };
          }

          yesOrderbook[data.price]!.availableQty += leftQty;
          yesOrderbook[data.price]!.orders.push({
            qty: leftQty,
            userId,
            filledQty: 0,
            originalOrderId,
            reverseOrder: false,
          });
          await tx.position.update({
            where: {
              userId_marketId_type: {
                userId,
                marketId: data.marketId,
                type: "Yes",
              },
            },
            data: {
              qty: { decrement: leftQty },
            },
          });
        }
      }

      if (data.side === "no" && data.type === "buy") {
        const usd = data.qty * data.price;
        if (user.usdBalance < usd) {
          throw new Error("Insufficient USD balance");
        }

        let leftQty = data.qty;

        const prices = Object.keys(noOrderbook).sort(
          (a: string, b: string) => Number(a) - Number(b)
        );

        for (const price of prices) {
          if (Number(price) > data.price) {
            continue;
          }
          const { orders } = noOrderbook[price]!;

          for (const order of orders) {
            if (leftQty <= 0) break;

            const availableQty = order.qty - order.filledQty;
            const matchedQty = Math.min(availableQty, leftQty);
            const reverseOrder = order.reverseOrder;
            if (!reverseOrder) {
              await tx.user.update({
                where: { id: order.userId },
                data: {
                  usdBalance: {
                    increment: Number(price) * matchedQty,
                  },
                },
              });
            } else {
              await tx.position.upsert({
                where: {
                  userId_marketId_type: {
                    userId: order.userId,
                    marketId: data.marketId,
                    type: "Yes",
                  },
                },
                update: {
                  qty: { increment: matchedQty },
                },
                create: {
                  userId: order.userId,
                  marketId: data.marketId,
                  type: "Yes",
                  qty: matchedQty,
                },
              });
            }
            await tx.position.upsert({
              where: {
                userId_marketId_type: {
                  userId,
                  marketId: data.marketId,
                  type: "No",
                },
              },
              update: {
                qty: { increment: matchedQty },
              },
              create: {
                userId,
                marketId: data.marketId,
                type: "No",
                qty: matchedQty,
              },
            });

            await tx.user.update({
              where: { id: userId },
              data: {
                usdBalance: {
                  decrement: Number(price) * matchedQty,
                },
              },
            });

            leftQty -= matchedQty;
            order.filledQty += matchedQty;
            noOrderbook[price]!.availableQty -= matchedQty;
          }
        }

        if (leftQty > 0) {
          const oppositePrice = 100 - data.price;
          if (!yesOrderbook[oppositePrice]) {
            yesOrderbook[oppositePrice] = { availableQty: 0, orders: [] };
          }

          yesOrderbook[oppositePrice]!.availableQty += leftQty;
          yesOrderbook[oppositePrice]!.orders.push({
            qty: leftQty,
            userId,
            filledQty: 0,
            originalOrderId,
            reverseOrder: true,
          });
          await tx.user.update({
            where: { id: userId },
            data: {
              usdBalance: {
                decrement: Number(data.price) * leftQty,
              },
            },
          });
        }
      }

      if (data.side === "no" && data.type === "sell") {
        const buyPrice = 100 - data.price;

        const userPosition = await tx.position.findFirst({
          where: {
            userId: userId,
            marketId: data.marketId,
            type: "No",
          },
        });

        if (!userPosition || userPosition.qty < data.qty) {
          throw new Error("Insufficient No position");
        }

        let leftQty = data.qty;

        const prices = Object.keys(yesOrderbook).sort(
          (a: string, b: string) => Number(a) - Number(b)
        );

        for (const price of prices) {
          if (Number(price) > buyPrice) {
            continue;
          }
          const { orders } = yesOrderbook[price]!;

          for (const order of orders) {
            if (leftQty <= 0) break;

            const availableQty = order.qty - order.filledQty;
            const matchedQty = Math.min(availableQty, leftQty);
            const reverseOrder = order.reverseOrder;
            if (!reverseOrder) {
              await tx.user.update({
                where: { id: order.userId },
                data: {
                  usdBalance: {
                    increment: Number(price) * matchedQty,
                  },
                },
              });
            } else {
              await tx.position.upsert({
                where: {
                  userId_marketId_type: {
                    userId: order.userId,
                    marketId: data.marketId,
                    type: "No",
                  },
                },
                update: {
                  qty: { increment: matchedQty },
                },
                create: {
                  userId: order.userId,
                  marketId: data.marketId,
                  type: "No",
                  qty: matchedQty,
                },
              });
            }
            await tx.position.update({
              where: {
                userId_marketId_type: {
                  userId,
                  marketId: data.marketId,
                  type: "No",
                },
              },
              data: {
                qty: { decrement: matchedQty },
              },
            });

            await tx.user.update({
              where: { id: userId },
              data: {
                usdBalance: {
                  increment: Number(price) * matchedQty,
                },
              },
            });

            leftQty -= matchedQty;
            order.filledQty += matchedQty;
            yesOrderbook[price]!.availableQty -= matchedQty;
          }
        }

        if (leftQty > 0) {
          if (!noOrderbook[data.price]) {
            noOrderbook[data.price] = { availableQty: 0, orders: [] };
          }

          noOrderbook[data.price]!.availableQty += leftQty;
          noOrderbook[data.price]!.orders.push({
            qty: leftQty,
            userId,
            filledQty: 0,
            originalOrderId,
            reverseOrder: false,
          });
          await tx.position.update({
            where: {
              userId_marketId_type: {
                userId,
                marketId: data.marketId,
                type: "No",
              },
            },
            data: {
              qty: { decrement: leftQty },
            },
          });
        }
      }

      await tx.orderHistory.create({
        data: {
          orderType: data.type === "buy" ? "Buy" : "Sell",
          userId,
          price: data.price,
          qty: data.qty,
          marketId: data.marketId,
        },
      });

      // Cleanup: filter out fully-filled orders
      for (const price in yesOrderbook) {
        if (yesOrderbook[price]) {
          yesOrderbook[price].orders = yesOrderbook[price].orders.filter(
            (order: any) => order.filledQty < order.qty
          );
        }
      }
      for (const price in noOrderbook) {
        if (noOrderbook[price]) {
          noOrderbook[price].orders = noOrderbook[price].orders.filter(
            (order: any) => order.filledQty < order.qty
          );
        }
      }

      await tx.market.update({
        data: {
          yesOrderbook: yesOrderbook as any,
          noOrderbook: noOrderbook as any,
        },
        where: { id: data.marketId },
      });
    });

    return NextResponse.json({
      message: "Order executed successfully",
    });
  } catch (error: any) {
    console.error("Error executing order:", error);
    if (error.message === "Token missing" || error.message === "Invalid token") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message === "Insufficient USD balance") {
      return NextResponse.json({
        message: "Sorry you dont have enough $ in your account",
      }, { status: 403 });
    }
    if (
      error.message === "Insufficient Yes position" ||
      error.message === "Insufficient No position"
    ) {
      return NextResponse.json({
        message: "Sorry you dont have enough position",
      }, { status: 403 });
    }
    if (error.message === "Market not found") {
      return NextResponse.json({ message: "Market not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Error executing order" }, { status: 500 });
  }
}
