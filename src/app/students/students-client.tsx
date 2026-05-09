"use client";

import { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { Download, FileText, Search } from "lucide-react";

type StudentRow = {
  id: number;
  name: string;
  latestNis: string | null;
  gender: "L" | "P" | null;
  finalScore: number | null;
  complete: number;
  classes: string[];
  reports: Array<{
    id: number;
    semester: number;
    academicYear: string;
    className: string | null;
    totalScore: number;
    scoreCount: number;
    averageScore: number;
    status: string;
  }>;
};

export function StudentsClient({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");
  const [completion, setCompletion] = useState("all");

  const filtered = useMemo(() => {
    return students.filter((student) => {
      const text = `${student.name} ${student.latestNis ?? ""}`.toLowerCase();
      const matchQuery = text.includes(query.toLowerCase());
      const matchCompletion =
        completion === "all" ||
        (completion === "complete" && student.complete >= 12) ||
        (completion === "incomplete" && student.complete < 12);
      return matchQuery && matchCompletion;
    });
  }, [students, query, completion]);

  async function exportExcel() {
    const rows = filtered.map((student) => {
      const base: Record<string, string | number | null> = {
        Nama: student.name,
        NIS: student.latestNis,
        JK: student.gender,
        "Nilai Ijazah Final": student.finalScore
      };
      for (let semester = 1; semester <= 12; semester += 1) {
        base[`Semester ${semester}`] = student.reports.find((report) => report.semester === semester)?.averageScore ?? null;
      }
      return base;
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rekap Ijazah");
    const headers = rows[0] ? Object.keys(rows[0]) : ["Nama", "NIS", "JK", "Nilai Ijazah Final"];
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(headers.map((header) => row[header])));
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => {
      column.width = 18;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rekap-nilai-ijazah.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadServerExport(kind: "pdf" | "excel") {
    window.location.href = `/api/export/${kind}`;
  }

  return (
    <section className="grid">
      <div className="panel" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={17} style={{ left: 12, top: 13, position: "absolute", color: "#66736b" }} />
          <input className="input" placeholder="Cari nama atau NIS" value={query} onChange={(event) => setQuery(event.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <select className="select" value={completion} onChange={(event) => setCompletion(event.target.value)} style={{ maxWidth: 230 }}>
          <option value="all">Semua kelengkapan</option>
          <option value="complete">Lengkap 12 semester</option>
          <option value="incomplete">Belum lengkap</option>
        </select>
        <button className="button secondary" onClick={exportExcel}>
          <Download size={18} />
          Export Excel Filter
        </button>
        <button className="button primary" onClick={() => downloadServerExport("excel")}>
          <Download size={18} />
          Download Excel Lengkap
        </button>
        <button className="button warn" onClick={() => downloadServerExport("pdf")}>
          <FileText size={18} />
          Download PDF Lengkap
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>NIS / JK</th>
              <th>Kelas</th>
              <th>Kelengkapan</th>
              <th>Nilai Final</th>
              <th>Riwayat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={student.id}>
                <td>
                  <strong>{student.name}</strong>
                </td>
                <td>{student.latestNis ?? "-"} / {student.gender ?? "-"}</td>
                <td>{student.classes.join(", ") || "-"}</td>
                <td>{student.complete} / 12 semester</td>
                <td>{student.finalScore?.toFixed(2) ?? "-"}</td>
                <td>
                  {student.reports.map((report) => (
                    <span className={`badge ${report.status}`} key={report.id} style={{ marginRight: 6, marginBottom: 6 }}>
                      S{report.semester}: {report.averageScore.toFixed(2)}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
