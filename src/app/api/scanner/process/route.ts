import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { validateExtractedReport } from "@/lib/grades";
import { extractReportFromImage } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  await requireSession();
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ status: "failed", errors: ["File tidak ditemukan."] }, { status: 400 });
  }

  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const filePath = path.join(uploadDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  if (file.type === "application/pdf") {
    return NextResponse.json({
      status: "failed",
      fileUrl: filePath,
      errors: ["PDF sudah tersimpan. Rendering halaman pertama ke PNG belum diaktifkan di build awal ini; masukkan data manual atau upload JPG/PNG."]
    });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings?.llmBaseUrl || !settings.llmApiKey || !settings.llmModel) {
    return NextResponse.json({
      status: "failed",
      fileUrl: filePath,
      errors: ["Settings LLM belum lengkap."]
    });
  }

  try {
    let extracted;
    try {
      extracted = await extractReportFromImage(
        { baseUrl: settings.llmBaseUrl, apiKey: settings.llmApiKey, model: settings.llmModel },
        file.type,
        buffer.toString("base64")
      );
    } catch {
      extracted = await extractReportFromImage(
        { baseUrl: settings.llmBaseUrl, apiKey: settings.llmApiKey, model: settings.llmModel },
        file.type,
        buffer.toString("base64")
      );
    }

    const validation = validateExtractedReport(extracted);
    if (!validation.ok) {
      return NextResponse.json({ status: "failed", fileUrl: filePath, errors: validation.errors });
    }

    return NextResponse.json({
      status: validation.status,
      fileUrl: filePath,
      errors: validation.errors,
      data: {
        ...validation.report,
        average_score: validation.average
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: "failed",
      fileUrl: filePath,
      errors: [error instanceof Error ? error.message : "AI gagal membaca rapor."]
    });
  }
}
