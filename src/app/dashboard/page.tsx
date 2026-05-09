import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  await requireSession();

  const [students, reports, needsReview, settings] = await Promise.all([
    prisma.student.count(),
    prisma.reportCard.count(),
    prisma.reportCard.count({ where: { status: "needs_review" } }),
    prisma.appSettings.findUnique({ where: { id: 1 } })
  ]);

  return (
    <AppShell title="Dashboard" subtitle="Ringkasan kerja rekap nilai ijazah">
      <section className="grid cols-3">
        <div className="card metric">
          <span>Total Siswa</span>
          <strong>{students}</strong>
        </div>
        <div className="card metric">
          <span>Rapor Tersimpan</span>
          <strong>{reports}</strong>
        </div>
        <div className="card metric">
          <span>Perlu Review</span>
          <strong>{needsReview}</strong>
        </div>
      </section>
      <section className="panel">
        <h2>Status Setup</h2>
        <p className="muted">
          {settings?.llmBaseUrl && settings.llmModel
            ? `LLM aktif: ${settings.llmModel}`
            : "Konfigurasi LLM belum lengkap. Isi Base URL, API key, dan model di halaman Settings sebelum scanner dipakai."}
        </p>
      </section>
    </AppShell>
  );
}
