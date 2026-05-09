import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { checkLoginRateLimit, clearFailedLogins, recordFailedLogin } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const gate = checkLoginRateLimit(ip);

  if (!gate.allowed) {
    return NextResponse.json({ message: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username?.trim();
  const password = body?.password;

  if (!username || !password) {
    return NextResponse.json({ message: "Username dan password wajib diisi." }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { username } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !valid) {
    recordFailedLogin(ip);
    return NextResponse.json({ message: "Username atau password salah." }, { status: 401 });
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  clearFailedLogins(ip);
  await setSessionCookie({ userId: user.id, username: user.username });
  return NextResponse.json({ ok: true });
}
