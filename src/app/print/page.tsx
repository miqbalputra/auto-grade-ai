import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { numberToIndonesian } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { PrintClient } from "./print-client";

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  await requireSession();
  const params = await searchParams;
  const students = await prisma.student.findMany({ orderBy: { name: "asc" } });
  const selectedId = params.student ? Number(params.student) : students[0]?.id;
  const student = selectedId
    ? await prisma.student.findUnique({
        where: { id: selectedId },
        include: { reportCards: { orderBy: { semester: "asc" } } }
      })
    : null;

  return (
    <AppShell title="Cetak Nilai Ijazah" subtitle="Pratinjau F4 portrait dengan format arsip">
      <PrintClient students={students.map((item) => ({ id: item.id, name: item.name }))} selectedId={selectedId} />
      {student ? (
        <section className="print-sheet">
          <div style={{ textAlign: "center", borderBottom: "2px solid #8b6914", paddingBottom: 12 }}>
            <div style={{ fontSize: 28, color: "#1a4d2e" }}>حَلَقَةُ التَحْفِيظِ</div>
            <h1 style={{ margin: "8px 0 4px", color: "#1a4d2e" }}>Kelompok Tahfidz Griya Qur'an Tunas Ilmu</h1>
            <div>Alamat lembaga dan kontak resmi</div>
          </div>
          <h2 style={{ textAlign: "center", textDecoration: "underline", marginTop: 28 }}>Rekap Nilai Ijazah</h2>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, margin: "24px 0" }}>
            <strong>Nama Lengkap</strong>
            <span>{student.name}</span>
            <strong>NIS</strong>
            <span>{student.latestNis ?? "-"}</span>
            <strong>Jenis Kelamin</strong>
            <span>{student.gender ?? "-"}</span>
            <strong>Total Semester</strong>
            <span>{student.reportCards.length}</span>
          </div>
          <table style={{ minWidth: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Tahun Ajaran</th>
                <th>Kelas</th>
                <th>Jumlah Nilai</th>
                <th>Poin</th>
                <th>Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {student.reportCards.map((report) => (
                <tr key={report.id}>
                  <td>{report.semester}</td>
                  <td>{report.academicYear}</td>
                  <td>{report.className ?? "-"}</td>
                  <td>{Number(report.totalScore).toFixed(2)}</td>
                  <td>{report.scoreCount}</td>
                  <td>{Number(report.averageScore).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "center", margin: "30px 0" }}>
            <div>Nilai Ijazah Final</div>
            <div className="print-score">{student.finalScore ? Number(student.finalScore).toFixed(2) : "-"}</div>
            <div style={{ textTransform: "capitalize" }}>{student.finalScore ? numberToIndonesian(Number(student.finalScore)) : "-"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", marginTop: 48 }}>
            <span />
            <div style={{ textAlign: "center" }}>
              <div>{new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date())}</div>
              <div>Kepala Kelompok Tahfidz</div>
              <div style={{ height: 70 }} />
              <strong>________________________</strong>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: "12mm", left: "18mm", right: "18mm", borderTop: "1px solid #8b6914", paddingTop: 8, textAlign: "center", color: "#1a4d2e" }}>
            Griya Qur'an Tunas Ilmu
          </div>
        </section>
      ) : (
        <section className="panel">Belum ada data siswa.</section>
      )}
    </AppShell>
  );
}
