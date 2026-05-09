import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(6),
  model: z.string().min(1)
});

export async function PUT(request: NextRequest) {
  await requireSession();
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Settings tidak valid." }, { status: 400 });
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      llmBaseUrl: parsed.data.baseUrl,
      llmApiKey: parsed.data.apiKey,
      llmModel: parsed.data.model
    },
    update: {
      llmBaseUrl: parsed.data.baseUrl,
      llmApiKey: parsed.data.apiKey,
      llmModel: parsed.data.model
    }
  });

  return NextResponse.json({ ok: true });
}
