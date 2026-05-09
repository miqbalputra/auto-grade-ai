"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockKeyhole, LogIn, User } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Login gagal." }));
      setError(payload.message ?? "Login gagal.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      {error ? <div className="error">{error}</div> : null}
      <div className="field">
        <label htmlFor="username">Username</label>
        <div style={{ position: "relative" }}>
          <User size={17} style={{ left: 12, top: 13, position: "absolute", color: "#66736b" }} />
          <input className="input" id="username" name="username" required style={{ paddingLeft: 38 }} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div style={{ position: "relative" }}>
          <LockKeyhole size={17} style={{ left: 12, top: 13, position: "absolute", color: "#66736b" }} />
          <input className="input" id="password" name="password" required type="password" style={{ paddingLeft: 38 }} />
        </div>
      </div>
      <button className="button primary" disabled={loading} type="submit">
        <LogIn size={18} />
        {loading ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
