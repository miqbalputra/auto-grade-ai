import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { buildChatDataContext } from "@/lib/chat-context";
import { completeChat } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000)
      })
    )
    .min(1)
    .max(12)
});

export async function POST(request: NextRequest) {
  await requireSession();
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Pesan chatbot tidak valid." }, { status: 400 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings?.llmBaseUrl || !settings.llmApiKey || !settings.llmModel) {
    return NextResponse.json({ message: "Settings LLM belum lengkap. Isi Base URL, API key, dan model dulu." }, { status: 400 });
  }

  const dataContext = await buildChatDataContext();
  const system = `Anda adalah chatbot internal AutoGrade AI untuk admin Kelompok Tahfidz Griya Qur'an Tunas Ilmu.
Jawab dalam bahasa Indonesia yang ringkas dan jelas.
Gunakan hanya DATA APLIKASI di bawah ini untuk menjawab pertanyaan terkait nilai, siswa, kelengkapan semester, status review, dan rekap.
Jika data tidak tersedia, katakan bahwa datanya belum ada di aplikasi.
Jangan mengarang data dan jangan menampilkan API key atau informasi rahasia.

DATA APLIKASI:
${dataContext}`;

  try {
    const answer = await completeChat(
      {
        baseUrl: settings.llmBaseUrl,
        apiKey: settings.llmApiKey,
        model: settings.llmModel
      },
      [
        { role: "system", content: system },
        ...parsed.data.messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ]
    );

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Chatbot gagal menjawab." }, { status: 500 });
  }
}
