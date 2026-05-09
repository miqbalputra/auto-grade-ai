import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentsClient } from "./students-client";

export default async function StudentsPage() {
  await requireSession();
  const students = await prisma.student.findMany({
    include: {
      reportCards: {
        orderBy: [{ semester: "asc" }, { academicYear: "asc" }]
      }
    },
    orderBy: { name: "asc" }
  });

  const data = students.map((student) => ({
    id: student.id,
    name: student.name,
    latestNis: student.latestNis,
    gender: student.gender,
    finalScore: student.finalScore ? Number(student.finalScore) : null,
    complete: student.reportCards.filter((row) => row.status === "ok").length,
    classes: Array.from(new Set(student.reportCards.map((row) => row.className).filter(Boolean))) as string[],
    reports: student.reportCards.map((row) => ({
      id: row.id,
      semester: row.semester,
      academicYear: row.academicYear,
      className: row.className,
      totalScore: Number(row.totalScore),
      scoreCount: row.scoreCount,
      averageScore: Number(row.averageScore),
      status: row.status
    }))
  }));

  return (
    <AppShell title="Data Siswa" subtitle="Cari, cek kelengkapan semester, dan export rekap">
      <StudentsClient students={data} />
    </AppShell>
  );
}
