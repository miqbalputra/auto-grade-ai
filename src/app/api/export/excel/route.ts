import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getCompleteReportRows } from "@/lib/export-data";

export const runtime = "nodejs";

export async function GET() {
  await requireSession();
  const students = await getCompleteReportRows();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AutoGrade AI";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Rekap Lengkap");
  const headers = ["Nama", "NIS", "JK", "Kelengkapan", "Nilai Ijazah Final", ...Array.from({ length: 12 }, (_, index) => `Semester ${index + 1}`)];
  summary.addRow(headers);

  for (const student of students) {
    summary.addRow([
      student.name,
      student.nis ?? "",
      student.gender ?? "",
      `${student.completeSemesters}/12`,
      student.finalScore ?? "",
      ...Array.from({ length: 12 }, (_, index) => student.reports.find((report) => report.semester === index + 1)?.averageScore ?? "")
    ]);
  }

  summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A4D2E" } };
  summary.columns.forEach((column) => {
    column.width = 18;
  });

  const detail = workbook.addWorksheet("Detail Semester");
  detail.addRow(["Nama", "NIS", "JK", "Semester", "Tahun Ajaran", "Kelas", "Jumlah Nilai", "Poin", "Rata-rata", "Status"]);
  for (const student of students) {
    for (const report of student.reports) {
      detail.addRow([
        student.name,
        student.nis ?? "",
        student.gender ?? "",
        report.semester,
        report.academicYear,
        report.className ?? "",
        report.totalScore,
        report.scoreCount,
        report.averageScore,
        report.status
      ]);
    }
  }
  detail.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  detail.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A4D2E" } };
  detail.columns.forEach((column) => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-lengkap-autograde.xlsx"`
    }
  });
}
