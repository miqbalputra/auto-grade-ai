import { getCompleteReportRows } from "@/lib/export-data";

export async function buildChatDataContext() {
  const students = await getCompleteReportRows();
  const summary = {
    total_siswa: students.length,
    total_rapor: students.reduce((total, student) => total + student.reports.length, 0),
    siswa_lengkap_12_semester: students.filter((student) => student.completeSemesters >= 12).length,
    siswa_belum_lengkap: students.filter((student) => student.completeSemesters < 12).length
  };

  const compactStudents = students.map((student) => ({
    nama: student.name,
    nis: student.nis,
    jk: student.gender,
    kelengkapan_semester_ok: student.completeSemesters,
    nilai_ijazah_final: student.finalScore,
    semester: student.reports.map((report) => ({
      semester: report.semester,
      tahun_ajaran: report.academicYear,
      kelas: report.className,
      jumlah_nilai: report.totalScore,
      jumlah_poin: report.scoreCount,
      rata_rata: report.averageScore,
      status: report.status
    }))
  }));

  return JSON.stringify({ ringkasan: summary, siswa: compactStudents });
}
