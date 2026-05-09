import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const accountSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, underscore, dan strip."),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100).optional()
});

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  const parsed = accountSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data akun tidak valid." }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ message: "Akun admin tidak ditemukan." }, { status: 404 });
  }

  const validPassword = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ message: "Password lama salah." }, { status: 401 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { username: parsed.data.username } });
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ message: "Username sudah digunakan." }, { status: 409 });
  }

  const passwordHash = parsed.data.newPassword ? await bcrypt.hash(parsed.data.newPassword, 12) : user.passwordHash;
  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      username: parsed.data.username,
      passwordHash
    }
  });

  await setSessionCookie({ userId: updated.id, username: updated.username });
  return NextResponse.json({ ok: true });
}
