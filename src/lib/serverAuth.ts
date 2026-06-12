import jwt from "jsonwebtoken";
import { headers } from "next/headers";

export async function verifyAuth(): Promise<string> {
  const reqHeaders = await headers();
  const authHeader = reqHeaders.get("authorization");

  if (!authHeader) {
    throw new Error("Token missing");
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };
    return decoded.id;
  } catch (error) {
    throw new Error("Invalid token");
  }
}
