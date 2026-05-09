import Link from "next/link";
import { BarChart3, BotMessageSquare, FileSearch, GraduationCap, LogOut, Printer, Settings, Users } from "lucide-react";
import { logoutAction } from "@/lib/server-actions";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/scanner", label: "Scanner Rapor", icon: FileSearch },
  { href: "/students", label: "Data Siswa", icon: Users },
  { href: "/chat", label: "Chatbot Data", icon: BotMessageSquare },
  { href: "/print", label: "Cetak Ijazah", icon: Printer },
  { href: "/settings", label: "Settings LLM", icon: Settings }
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>AutoGrade AI</strong>
          <span>Griya Qur'an Tunas Ilmu</span>
        </div>
        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <form action={logoutAction}>
            <button type="submit">
              <LogOut size={18} />
              Keluar
            </button>
          </form>
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="page-title">
            <h1>{title}</h1>
            {subtitle ? <span className="muted">{subtitle}</span> : null}
          </div>
          <GraduationCap color="#1a4d2e" size={32} />
        </div>
        {children}
      </main>
    </div>
  );
}
