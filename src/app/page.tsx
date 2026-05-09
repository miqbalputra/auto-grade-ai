import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, FileSearch, GraduationCap, LockKeyhole, Sparkles, TableProperties } from "lucide-react";
import { getSession } from "@/lib/auth";

const features = [
  {
    icon: FileSearch,
    title: "Scan Rapor",
    text: "Upload rapor JPG/PNG/PDF, lalu sistem menyiapkan hasil ekstraksi untuk direview admin."
  },
  {
    icon: Sparkles,
    title: "Otomasi LLM",
    text: "Vision LLM membaca komponen nilai, menghitung rata-rata, dan memberi flag ketika data perlu diperiksa."
  },
  {
    icon: TableProperties,
    title: "Rekap Ijazah",
    text: "Data siswa, semester, nilai final, export Excel/PDF, dan cetak F4 tersedia dalam satu alur."
  }
];

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <GraduationCap size={28} />
          <div>
            <strong>AutoGrade AI</strong>
            <span>Griya Qur'an Tunas Ilmu</span>
          </div>
        </div>
        <Link className="button secondary" href="/login">
          <LockKeyhole size={18} />
          Masuk Admin
        </Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker">
            <Bot size={17} />
            Internal tool berbasis otomasi LLM
          </span>
          <h1>Rekap nilai ijazah lebih cepat, rapi, dan mudah diverifikasi.</h1>
          <p>
            AutoGrade AI membantu admin mengubah rapor semester menjadi rekap nilai ijazah final melalui pemindaian dokumen, validasi nilai, review data, dan export laporan.
          </p>
          <div className="landing-actions">
            <Link className="button primary" href="/login">
              <LockKeyhole size={18} />
              Masuk ke Aplikasi
            </Link>
            <a className="button secondary" href="#fitur">
              Lihat Fungsi
            </a>
          </div>
        </div>
        <div className="automation-panel" aria-label="Ilustrasi otomasi AutoGrade AI">
          <div className="automation-top">
            <span />
            <span />
            <span />
          </div>
          <div className="automation-flow">
            <div>
              <small>Input</small>
              <strong>Rapor Santri</strong>
            </div>
            <div>
              <small>LLM Vision</small>
              <strong>Ekstraksi Nilai</strong>
            </div>
            <div>
              <small>Validasi</small>
              <strong>Review Admin</strong>
            </div>
            <div>
              <small>Output</small>
              <strong>Nilai Ijazah</strong>
            </div>
          </div>
          <div className="automation-metrics">
            <div>
              <span>Formula</span>
              <strong>Jumlah Nilai / Poin</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>OK / Review</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" id="fitur">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article className="landing-feature" key={feature.title}>
              <Icon size={24} />
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
