import express from "express";
import cors from "cors";
import { middleware } from "./middleware";
import { prisma } from "../../packages/db";
import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { resolveTypeReferenceDirective } from "typescript";

const app = express()
app.use(express.json())
app.use(cors())

app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    })

    if (existingUser) {
        return res.status(400).json({
            message: "User is already exists"
        })
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password:hashedpassword
        }
    })
    res.json({
        message: "User created",
        userId: user.id,
    })
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // 1. Find user by email only
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2. Compare provided password against stored hash
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Sign token using the DB user's id
    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
    );

    res.json({ token });
});

app.post("/buy", async (req, res) => {
    const { marketId } = req.body;

    await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
      SELECT * FROM "Market"
      WHERE id = ${marketId}
      FOR UPDATE;
    `;

        await new Promise((r) => setTimeout(r, 3000));

        await tx.market.update({
            data: {
                title: "new title",
            },
            where: {
                id: marketId,
            },
        });
    });

    res.json({
        message: "Hi",
    });
});

app.post("/market", async (req, res) => {
    const { title, description, resolutionDescription } = req.body;

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

    res.json({
        market,
    });
});

app.get("/markets", async (req, res) => {
    try {
        const markets = await prisma.market.findMany();

        res.json({
            markets,
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: err,
        });
    }
});

app.post("/sell", middleware, async (req, res) => {
    res.json({ message: "sell" });
});

app.post("/merge", middleware, async (req, res) => {
    res.json({ message: "merge" });
});

app.post("/split", middleware, async (req, res) => {
    res.json({ message: "split" });
});

app.get("/balance", middleware, async (req, res) => {
    res.json({ message: "balance" });
});

app.get("/positions", middleware, async (req, res) => {
    res.json({ message: "positions" });
});

app.get("/history", middleware, async (req, res) => {
    res.json({ message: "history" });
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000")
})