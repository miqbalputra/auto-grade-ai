import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getCompleteReportRows } from "@/lib/export-data";

export const runtime = "nodejs";

function pdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function writeCell(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, options: PDFKit.Mixins.TextOptions = {}) {
  doc.text(text, x, y, { width, lineBreak: false, ellipsis: true, ...options });
}

export async function GET() {
  await requireSession();
  const students = await getCompleteReportRows();
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
  const done = pdfBuffer(doc);

  doc.font("Times-Bold").fontSize(18).fillColor("#1a4d2e").text("AutoGrade AI", { align: "center" });
  doc.font("Times-Roman").fontSize(11).fillColor("#18251d").text("Laporan Lengkap Nilai Ijazah", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#66736b").text(`Dicetak: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`, { align: "center" });
  doc.moveDown(1.5);

  if (!students.length) {
    doc.fontSize(12).fillColor("#18251d").text("Belum ada data siswa.");
  }

  for (const student of students) {
    if (doc.y > 700) doc.addPage();
    doc.font("Times-Bold").fontSize(12).fillColor("#1a4d2e").text(student.name);
    doc.font("Times-Roman").fontSize(9).fillColor("#18251d").text(`NIS: ${student.nis ?? "-"}   JK: ${student.gender ?? "-"}   Kelengkapan: ${student.completeSemesters}/12   Nilai Final: ${student.finalScore?.toFixed(2) ?? "-"}`);
    doc.moveDown(0.4);

    const startX = 36;
    let y = doc.y;
    const widths = [48, 82, 86, 72, 42, 56, 56];
    const headers = ["Sem", "Tahun", "Kelas", "Jumlah", "Poin", "Rata", "Status"];

    doc.rect(startX, y - 2, widths.reduce((a, b) => a + b, 0), 18).fill("#eef5f0");
    doc.fillColor("#18251d").font("Times-Bold").fontSize(8);
    let x = startX;
    headers.forEach((header, index) => {
      writeCell(doc, header, x + 3, y + 3, widths[index] - 6);
      x += widths[index];
    });
    y += 18;

    doc.font("Times-Roman").fontSize(8);
    for (const report of student.reports) {
      if (y > 760) {
        doc.addPage();
        y = 36;
      }
      x = startX;
      const values = [
        String(report.semester),
        report.academicYear,
        report.className ?? "-",
        report.totalScore.toFixed(2),
        String(report.scoreCount),
        report.averageScore.toFixed(2),
        report.status
      ];
      values.forEach((value, index) => {
        writeCell(doc, value, x + 3, y + 3, widths[index] - 6);
        x += widths[index];
      });
      doc.moveTo(startX, y + 16).lineTo(startX + widths.reduce((a, b) => a + b, 0), y + 16).strokeColor("#dce5df").stroke();
      y += 18;
    }
    doc.y = y + 12;
  }

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.font("Times-Roman").fontSize(8).fillColor("#66736b").text(`Halaman ${index + 1} dari ${range.count}`, 36, 806, { align: "center" });
  }

  doc.end();
  const buffer = await done;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-lengkap-autograde.pdf"`
    }
  });
}
