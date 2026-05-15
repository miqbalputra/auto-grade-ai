import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { validateExtractedReport } from "@/lib/grades";
import { extractReportFromImage } from "@/lib/llm";
import { renderPdfToImages } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

type DraftPayload = {
  nama_santri: string;
  nis: string;
  kelas: string;
  semester: string;
  tahun_ajaran: string;
  jumlah_nilai: string;
  jumlah_poin: string;
  score_breakdown_text: string;
};

function createEmptyDraft() {
  return {
    nama_santri: "",
    nis: "",
    kelas: "",
    semester: "",
    tahun_ajaran: "",
    jumlah_nilai: "",
    jumlah_poin: "",
    score_breakdown_text: JSON.stringify(
      {
        capaian_belajar: [],
        ujian_tahfidz: [],
        tahfidz_harian: [],
        ujian_praktik: []
      },
      null,
      2
    )
  } satisfies DraftPayload;
}

function reportToDraft(report: {
  nama_santri: string;
  nis?: string | null;
  kelas?: string | null;
  semester: number;
  tahun_ajaran: string;
  jumlah_nilai: number;
  jumlah_poin: number;
  score_breakdown: unknown;
}) {
  return {
    nama_santri: report.nama_santri,
    nis: report.nis ?? "",
    kelas: report.kelas ?? "",
    semester: String(report.semester),
    tahun_ajaran: report.tahun_ajaran,
    jumlah_nilai: String(report.jumlah_nilai),
    jumlah_poin: String(report.jumlah_poin),
    score_breakdown_text: JSON.stringify(report.score_breakdown, null, 2)
  } satisfies DraftPayload;
}

async function buildScanItem(args: {
  config: { baseUrl: string; apiKey: string; model: string };
  mimeType: string;
  base64: string;
  label: string;
  pageNumber?: number;
}) {
  try {
    const extracted = await extractReportFromImage(args.config, args.mimeType, args.base64);
    const validation = validateExtractedReport(extracted);

    if (!validation.ok) {
      return {
        label: args.label,
        pageNumber: args.pageNumber ?? null,
        status: "failed" as const,
        errors: validation.errors,
        draft: reportToDraft(extracted)
      };
    }

    return {
      label: args.label,
      pageNumber: args.pageNumber ?? null,
      status: validation.status,
      errors: validation.errors,
      draft: reportToDraft(validation.report)
    };
  } catch (error) {
    return {
      label: args.label,
      pageNumber: args.pageNumber ?? null,
      status: "failed" as const,
      errors: [error instanceof Error ? error.message : "AI gagal membaca rapor."],
      draft: createEmptyDraft()
    };
  }
}

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

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings?.llmBaseUrl || !settings.llmApiKey || !settings.llmModel) {
    return NextResponse.json({
      status: "failed",
      fileUrl: filePath,
      errors: ["Settings LLM belum lengkap."],
      items: []
    });
  }

  const config = {
    baseUrl: settings.llmBaseUrl,
    apiKey: settings.llmApiKey,
    model: settings.llmModel
  };

  const items =
    file.type === "application/pdf"
      ? await (async () => {
          const pages = await renderPdfToImages(buffer, 0.45);
          const rows = [];
          for (const page of pages) {
            rows.push(
              await buildScanItem({
                config,
                mimeType: page.mimeType,
                base64: page.base64,
                label: `${file.name} - Halaman ${page.pageNumber}`,
                pageNumber: page.pageNumber
              })
            );
          }
          return rows;
        })()
      : [
          await buildScanItem({
            config,
            mimeType: file.type,
            base64: buffer.toString("base64"),
            label: file.name
          })
        ];

  const summaryStatus = items.every((item) => item.status === "failed")
    ? "failed"
    : items.some((item) => item.status === "needs_review" || item.status === "failed")
      ? "needs_review"
      : "ok";

  return NextResponse.json({
    status: summaryStatus,
    fileUrl: filePath,
    errors: [],
    items
  });
}
