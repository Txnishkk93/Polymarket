import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { middleware } from "./middleware";
import { prisma } from "../../packages/db";
import {
    CreateOrderSchema,
    SplitSchema,
    OnrampSchema,
    OfframpSchema,
    type Orderbook,
} from "./types";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

function parseOrderbook(orderbook: unknown): Orderbook {
    if (typeof orderbook === "string") {
        return JSON.parse(orderbook);
    }
    if (orderbook && typeof orderbook === "object") {
        return orderbook as Orderbook;
    }
    return {};
}

// ===================== AUTH =====================

app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(411).json({ message: "Incorrect inputs" });
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return res.status(400).json({
            message: "User already exists",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            usdBalance: 0,
        },
    });

    res.json({
        message: "User created",
        userId: user.id,
    });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(411).json({ message: "Incorrect inputs" });
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
    );

    res.json({ token });
});

// ===================== MARKETS =====================

// Get all markets
app.get("/markets", async (req, res) => {
    try {
        const markets = await prisma.market.findMany();
        res.json({ markets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching markets" });
    }
});

// Get a single market
app.get("/market", async (req, res) => {
    try {
        const market = await prisma.market.findFirst({
            where: {
                id: req.query.marketId as string,
            },
        });

        if (!market) {
            return res.status(404).json({ message: "Market not found" });
        }

        res.json({ market });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching market" });
    }
});

// Create a market (consider adding an admin-only middleware here)
app.post("/market", middleware, async (req, res) => {
    try {
        const { title, description, resolutionDescription } = req.body;

        if (!title || !description || !resolutionDescription) {
            return res.status(411).json({ message: "Incorrect inputs" });
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

        res.json({ market });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error creating market" });
    }
});

// ===================== ORDER (matching engine) =====================

app.post("/order", middleware, async (req, res) => {
    const { success, data } = CreateOrderSchema.safeParse(req.body);
    const userId: string = req.userId;

    if (!success) {
        res.status(411).json({
            message: "Incorrect inputs",
        });
        return;
    }

    const originalOrderId = randomUUID();

    try {
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

            if (data.side == "yes" && data.type == "buy") {
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
                                where: {
                                    id: order.userId,
                                },
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
                                    qty: {
                                        increment: matchedQty,
                                    },
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
                                qty: {
                                    increment: matchedQty,
                                },
                            },
                            create: {
                                userId,
                                marketId: data.marketId,
                                type: "Yes",
                                qty: matchedQty,
                            },
                        });

                        await tx.user.update({
                            where: {
                                id: userId,
                            },
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
                        where: {
                            id: userId,
                        },
                        data: {
                            usdBalance: {
                                decrement: Number(data.price) * leftQty,
                            },
                        },
                    });
                }
            }

            if (data.side == "yes" && data.type == "sell") {
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
                                where: {
                                    id: order.userId,
                                },
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
                                    qty: {
                                        increment: matchedQty,
                                    },
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
                                qty: {
                                    decrement: matchedQty,
                                },
                            },
                        });

                        await tx.user.update({
                            where: {
                                id: userId,
                            },
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
                            qty: {
                                decrement: leftQty,
                            },
                        },
                    });
                }
            }

            if (data.side == "no" && data.type == "buy") {
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
                                where: {
                                    id: order.userId,
                                },
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
                                    qty: {
                                        increment: matchedQty,
                                    },
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
                                qty: {
                                    increment: matchedQty,
                                },
                            },
                            create: {
                                userId,
                                marketId: data.marketId,
                                type: "No",
                                qty: matchedQty,
                            },
                        });

                        await tx.user.update({
                            where: {
                                id: userId,
                            },
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
                        where: {
                            id: userId,
                        },
                        data: {
                            usdBalance: {
                                decrement: Number(data.price) * leftQty,
                            },
                        },
                    });
                }
            }

            if (data.side == "no" && data.type == "sell") {
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
                                where: {
                                    id: order.userId,
                                },
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
                                    qty: {
                                        increment: matchedQty,
                                    },
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
                                qty: {
                                    decrement: matchedQty,
                                },
                            },
                        });

                        await tx.user.update({
                            where: {
                                id: userId,
                            },
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
                            qty: {
                                decrement: leftQty,
                            },
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
                where: {
                    id: data.marketId,
                },
            });
        });

        res.json({
            message: "Order executed successfully",
        });
    } catch (error: any) {
        console.error("Error executing order:", error);
        if (error.message === "Insufficient USD balance") {
            res.status(403).json({
                message: "Sorry you dont have enough $ in your account",
            });
        } else if (
            error.message === "Insufficient Yes position" ||
            error.message === "Insufficient No position"
        ) {
            res.status(403).json({
                message: "Sorry you dont have enough position",
            });
        } else if (error.message === "Market not found") {
            res.status(404).json({
                message: "Market not found",
            });
        } else {
            res.status(500).json({
                message: "Error executing order",
            });
        }
    }
});

// ===================== SPLIT / MERGE =====================

app.post("/split", middleware, async (req, res) => {
    const { data, success } = SplitSchema.safeParse(req.body);
    const userId: string = req.userId;
    if (!success) {
        res.status(411).json({ message: "Incorrect inputs" });
        return;
    }
    const marketId = data.marketId;

    try {
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
                where: {
                    id: userId,
                },
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
                    qty: {
                        increment: data.amount,
                    },
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
                    qty: {
                        increment: data.amount,
                    },
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

        res.json({
            message: "Split successful",
        });
    } catch (error: any) {
        console.error("Error splitting:", error);
        if (error.message === "Insufficient USD balance") {
            res.status(403).json({
                message: "Sorry you dont have enough $ in your account",
            });
        } else if (error.message === "User not found") {
            res.status(404).json({ message: "User not found" });
        } else {
            res.status(500).json({
                message: "Error splitting",
            });
        }
    }
});

app.post("/merge", middleware, async (req, res) => {
    const { data, success } = SplitSchema.safeParse(req.body);
    const userId: string = req.userId;
    if (!success) {
        res.status(411).json({ message: "Incorrect inputs" });
        return;
    }
    const marketId = data.marketId;

    try {
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
                    qty: {
                        decrement: data.amount,
                    },
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
                    qty: {
                        decrement: data.amount,
                    },
                },
            });

            await tx.user.update({
                where: {
                    id: userId,
                },
                data: {
                    usdBalance: {
                        increment: data.amount,
                    },
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
        res.json({
            message: "Merge successful",
        });
    } catch (error: any) {
        console.error("Error merging:", error);
        if (
            error.message === "Insufficient Yes position" ||
            error.message === "Insufficient No position"
        ) {
            res.status(403).json({
                message: "Sorry you dont have enough position",
            });
        } else if (error.message === "User not found") {
            res.status(404).json({ message: "User not found" });
        } else {
            res.status(500).json({
                message: "Error merging",
            });
        }
    }
});

// ===================== USER DATA =====================

app.get("/balance", middleware, async (req, res) => {
    const userId: string = req.userId as string;
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
        },
    });

    res.json({
        balance: user?.usdBalance,
    });
});

app.get("/positions", middleware, async (req, res) => {
    const userId: string = req.userId as string;
    const positions = await prisma.position.findMany({
        where: {
            userId,
        },
    });

    res.json({
        positions,
    });
});

app.get("/history", middleware, async (req, res) => {
    const userId: string = req.userId as string;
    const history = await prisma.orderHistory.findMany({
        where: {
            userId,
        },
    });

    res.json({
        history,
    });
});

// ===================== ONRAMP / OFFRAMP =====================

app.post("/onramp", middleware, async (req, res) => {
    const { success, data } = OnrampSchema.safeParse(req.body);
    const userId: string = req.userId;

    if (!success) {
        res.status(411).json({
            message: "Incorrect inputs",
        });
        return;
    }

    try {
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

            await tx.user.update({
                where: {
                    id: userId,
                },
                data: {
                    usdBalance: {
                        increment: amountInCents,
                    },
                },
            });
        });

        res.json({
            message: "Onramp successful",
            amount: data.amount,
        });
    } catch (error: any) {
        console.error("Error processing onramp:", error);
        if (error.message === "User not found") {
            res.status(404).json({ message: "User not found" });
        } else {
            res.status(500).json({
                message: "Error processing onramp",
            });
        }
    }
});

app.post("/offramp", middleware, async (req, res) => {
    const { success, data } = OfframpSchema.safeParse(req.body);
    const userId: string = req.userId;

    if (!success) {
        res.status(411).json({
            message: "Incorrect inputs",
        });
        return;
    }

    try {
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
                where: {
                    id: userId,
                },
                data: {
                    usdBalance: {
                        decrement: amountInCents,
                    },
                },
            });
        });

        res.json({
            message: "Offramp successful",
            amount: data.amount,
        });
    } catch (error: any) {
        console.error("Error processing offramp:", error);
        if (error.message === "Insufficient USD balance") {
            res.status(403).json({
                message: "Insufficient USD balance for offramp",
            });
        } else if (error.message === "User not found") {
            res.status(404).json({ message: "User not found" });
        } else {
            res.status(500).json({
                message: "Error processing offramp",
            });
        }
    }
});

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});