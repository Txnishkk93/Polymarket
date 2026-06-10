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

app.post("signup", async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    })

    if (existingUser) {
        return res.status(400).json({
            message: "User is already exists"
        })
    }

    const hashedpassowrd = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password
        }
    })
    res.json({
        message: "User created",
        userId: user.id,
    })
})

app.post("/login", async (req, res) => {
    const {email,password}=req.body

    const user=await prisma.user.findUnique({
        where:{email},
    })
    if(!user){
        return res.status(401).json({
            message:"Invalid credentials"
        })
    }

    const validPassword=await bcrypt.compare(password,user.password)
    if(!validPassword){
        return res.status(401).json({
            message:"Invalid credentials"
        })
    }
    const token=jwt.sign(
        {
            id:user.id,
            email:user.email,
        }
    )
})

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

app.post("/sell", middleware, (req, res) => { })
app.post("/merge", middleware, (req, res) => { })
app.post("/split", middleware, (req, res) => { })
app.post("/balance", middleware, (req, res) => { })
app.post("/positions", middleware, (req, res) => { })
app.post("/history", middleware, (req, res) => { })

app.listen(3000)