import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="page-title" style={{ marginBottom: 22 }}>
          <h1>Masuk Admin</h1>
          <span className="muted">AutoGrade AI hanya untuk pengelola yang berwenang.</span>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
