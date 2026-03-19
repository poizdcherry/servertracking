import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

const API_KEY = process.env.API_KEY;

export function authenticate(request: NextRequest): boolean {
  if (!API_KEY) return false;
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const tokenBuf = Buffer.from(token);
  const keyBuf = Buffer.from(API_KEY);
  if (tokenBuf.length !== keyBuf.length) return false;
  return timingSafeEqual(tokenBuf, keyBuf);
}
