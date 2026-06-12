import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Incorrect inputs" }, { status: 411 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        usdBalance: 0,
      },
    });

    return NextResponse.json({
      message: "User created",
      userId: user.id,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
