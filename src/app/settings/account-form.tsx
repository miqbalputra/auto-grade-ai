"use client";

import { useState } from "react";
import { KeyRound, Save, UserCog } from "lucide-react";

export function AccountForm({ initialUsername }: { initialUsername: string }) {
  const [username, setUsername] = useState(initialUsername);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak sama.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/settings/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        currentPassword,
        newPassword: newPassword || undefined
      })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? "Gagal menyimpan akun.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Akun admin berhasil diperbarui.");
  }

  return (
    <form className="form" onSubmit={save}>
      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      <div className="field">
        <label htmlFor="admin-username">Username</label>
        <div style={{ position: "relative" }}>
          <UserCog size={17} style={{ left: 12, top: 13, position: "absolute", color: "#66736b" }} />
          <input
            className="input"
            id="admin-username"
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            required
            style={{ paddingLeft: 38 }}
            value={username}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="current-password">Password Lama</label>
        <div style={{ position: "relative" }}>
          <KeyRound size={17} style={{ left: 12, top: 13, position: "absolute", color: "#66736b" }} />
          <input
            className="input"
            id="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            style={{ paddingLeft: 38 }}
            type="password"
            value={currentPassword}
          />
        </div>
      </div>
      <div className="grid cols-2">
        <div className="field">
          <label htmlFor="new-password">Password Baru</label>
          <input
            className="input"
            id="new-password"
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Kosongkan jika tidak diganti"
            type="password"
            value={newPassword}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Konfirmasi Password Baru</label>
          <input
            className="input"
            id="confirm-password"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Ulangi password baru"
            type="password"
            value={confirmPassword}
          />
        </div>
      </div>
      <button className="button primary" disabled={loading || !username || !currentPassword} type="submit">
        <Save size={18} />
        Simpan Akun
      </button>
    </form>
  );
}
