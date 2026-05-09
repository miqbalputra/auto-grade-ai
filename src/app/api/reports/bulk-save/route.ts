import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { extractedReportSchema } from "@/lib/grades";
import { prisma } from "@/lib/prisma";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function similarity(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  let same = 0;
  for (const char of new Set(left)) {
    if (right.includes(char)) same += 1;
  }
  return same / Math.max(new Set(left + right).size, 1);
}

async function recalculateFinalScore(studentId: number) {
  const rows = await prisma.reportCard.findMany({
    where: { studentId, status: "ok" },
    select: { averageScore: true }
  });
  const avg = rows.length
    ? rows.reduce((total, row) => total + Number(row.averageScore), 0) / rows.length
    : null;
  await prisma.student.update({
    where: { id: studentId },
    data: { finalScore: avg === null ? null : new Prisma.Decimal(avg.toFixed(2)) }
  });
}

export async function POST(request: NextRequest) {
  await requireSession();
  const body = (await request.json().catch(() => null)) as { reports?: Array<Record<string, unknown>> } | null;
  const reports = body?.reports ?? [];
  let saved = 0;
  const skipped: string[] = [];

  for (const item of reports) {
    const parsed = extractedReportSchema.safeParse({
      ...item,
      jumlah_poin: item.jumlah_poin,
      score_breakdown: item.score_breakdown
    });

    if (!parsed.success) {
      skipped.push(String(item.nama_santri ?? "Rapor tanpa nama"));
      continue;
    }

    const report = parsed.data;
    const nis = report.nis?.trim() || null;
    let student = nis ? await prisma.student.findFirst({ where: { latestNis: nis } }) : null;

    if (!student) {
      const candidates = await prisma.student.findMany({ take: 100 });
      const closest = candidates
        .map((candidate) => ({ candidate, score: similarity(candidate.name, report.nama_santri) }))
        .sort((a, b) => b.score - a.score)[0];
      student = closest && closest.score >= 0.85 ? closest.candidate : null;
    }

    if (!student) {
      student = await prisma.student.create({
        data: {
          name: report.nama_santri,
          latestNis: nis
        }
      });
    } else if (nis && student.latestNis !== nis) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { latestNis: nis }
      });
    }

    const duplicate = await prisma.reportCard.findUnique({
      where: {
        studentId_semester_academicYear: {
          studentId: student.id,
          semester: report.semester,
          academicYear: report.tahun_ajaran
        }
      }
    });

    if (duplicate) {
      skipped.push(`${report.nama_santri} semester ${report.semester} ${report.tahun_ajaran}`);
      continue;
    }

    const average = Number((report.jumlah_nilai / report.jumlah_poin).toFixed(2));

    await prisma.reportCard.create({
      data: {
        studentId: student.id,
        nisOnDocument: nis,
        className: report.kelas,
        semester: report.semester,
        academicYear: report.tahun_ajaran,
        totalScore: new Prisma.Decimal(report.jumlah_nilai),
        scoreCount: report.jumlah_poin,
        averageScore: new Prisma.Decimal(average),
        scoreBreakdown: report.score_breakdown,
        fileUrl: typeof item.fileUrl === "string" ? item.fileUrl : null,
        status: item.status === "needs_review" ? "needs_review" : "ok"
      }
    });

    await recalculateFinalScore(student.id);
    saved += 1;
  }

  return NextResponse.json({ saved, skipped });
}
