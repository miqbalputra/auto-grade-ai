import { prisma } from "@/lib/prisma";

export async function getCompleteReportRows() {
  const students = await prisma.student.findMany({
    include: {
      reportCards: {
        orderBy: [{ semester: "asc" }, { academicYear: "asc" }]
      }
    },
    orderBy: { name: "asc" }
  });

  return students.map((student) => {
    const reports = student.reportCards.map((report) => ({
      semester: report.semester,
      academicYear: report.academicYear,
      className: report.className,
      totalScore: Number(report.totalScore),
      scoreCount: report.scoreCount,
      averageScore: Number(report.averageScore),
      status: report.status
    }));

    return {
      id: student.id,
      name: student.name,
      nis: student.latestNis,
      gender: student.gender,
      finalScore: student.finalScore ? Number(student.finalScore) : null,
      completeSemesters: reports.filter((report) => report.status === "ok").length,
      reports
    };
  });
}
