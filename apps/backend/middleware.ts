import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function middleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({
      message: "Token missing",
    });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };

    req.userId = decoded.id;

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid token",
    });
  }
}