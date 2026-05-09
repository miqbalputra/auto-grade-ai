import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fetchModels } from "@/lib/llm";

export async function POST(request: NextRequest) {
  await requireSession();
  const body = (await request.json().catch(() => null)) as { baseUrl?: string; apiKey?: string } | null;
  if (!body?.baseUrl || !body.apiKey) {
    return NextResponse.json({ message: "Base URL dan API Key wajib diisi." }, { status: 400 });
  }

  try {
    const models = await fetchModels({ baseUrl: body.baseUrl, apiKey: body.apiKey });
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Koneksi gagal." }, { status: 400 });
  }
}
