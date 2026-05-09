import { z } from "zod";

const scoreItemSchema = z.object({
  nama: z.string().min(1),
  nilai: z.number().nullable()
});

export const scoreBreakdownSchema = z.object({
  capaian_belajar: z.array(scoreItemSchema).default([]),
  ujian_tahfidz: z.array(scoreItemSchema).default([]),
  tahfidz_harian: z.array(scoreItemSchema).default([]),
  ujian_praktik: z.array(scoreItemSchema).default([])
});

export const extractedReportSchema = z.object({
  nama_santri: z.string().min(1),
  nis: z.string().optional().nullable(),
  kelas: z.string().optional().nullable(),
  semester: z.coerce.number().int().min(1).max(12),
  tahun_ajaran: z.string().min(4),
  jumlah_nilai: z.coerce.number().positive(),
  jumlah_poin: z.coerce.number().int().min(5).max(30),
  score_breakdown: scoreBreakdownSchema
});

export type ExtractedReport = z.infer<typeof extractedReportSchema>;

export function flattenScores(breakdown: ExtractedReport["score_breakdown"]) {
  return [
    ...breakdown.capaian_belajar,
    ...breakdown.ujian_tahfidz,
    ...breakdown.tahfidz_harian,
    ...breakdown.ujian_praktik
  ];
}

export function validateExtractedReport(input: unknown) {
  const parsed = extractedReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      status: "failed" as const,
      errors: parsed.error.issues.map((issue) => issue.message)
    };
  }

  const report = parsed.data;
  const scores = flattenScores(report.score_breakdown).filter((item) => typeof item.nilai === "number");
  const sum = scores.reduce((total, item) => total + (item.nilai ?? 0), 0);
  const average = Number((report.jumlah_nilai / report.jumlah_poin).toFixed(2));
  const errors: string[] = [];
  let status: "ok" | "needs_review" = "ok";

  if (scores.length !== report.jumlah_poin) {
    status = "needs_review";
    errors.push(`Jumlah poin AI (${report.jumlah_poin}) berbeda dari item terbaca (${scores.length}).`);
  }

  if (Math.abs(sum - report.jumlah_nilai) > 0.5) {
    status = "needs_review";
    errors.push(`Selisih SUM breakdown (${sum.toFixed(2)}) dan JUMLAH NILAI (${report.jumlah_nilai}) lebih dari 0.5.`);
  }

  if (average < 50 || average > 100) {
    status = "needs_review";
    errors.push(`Rata-rata rapor ${average.toFixed(2)} di luar batas wajar 50-100.`);
  }

  return {
    ok: true as const,
    status,
    report,
    average,
    sum: Number(sum.toFixed(2)),
    errors
  };
}

export function numberToIndonesian(value: number) {
  const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  const spell = (n: number): string => {
    if (n < 12) return units[n];
    if (n < 20) return `${spell(n - 10)} belas`;
    if (n < 100) return `${spell(Math.floor(n / 10))} puluh ${spell(n % 10)}`.trim();
    if (n < 200) return `seratus ${spell(n - 100)}`.trim();
    if (n < 1000) return `${spell(Math.floor(n / 100))} ratus ${spell(n % 100)}`.trim();
    return String(n);
  };
  const rounded = Math.round(value * 100);
  const whole = Math.floor(rounded / 100);
  const decimal = rounded % 100;
  return decimal ? `${spell(whole)} koma ${spell(decimal)}` : spell(whole);
}
