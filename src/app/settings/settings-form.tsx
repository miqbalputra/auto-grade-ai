"use client";

import { useState } from "react";
import { PlugZap, Save } from "lucide-react";

type Props = {
  initial: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
};

export function SettingsForm({ initial }: Props) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [models, setModels] = useState<string[]>(initial.model ? [initial.model] : []);
  const [manualModel, setManualModel] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkConnection() {
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/settings/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey })
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? "Koneksi gagal.");
      setManualModel(true);
      return;
    }

    setModels(payload.models);
    setModel(payload.models[0] ?? "");
    setManualModel(payload.models.length === 0);
    setMessage(payload.models.length ? `Koneksi berhasil. ${payload.models.length} model ditemukan.` : "Koneksi berhasil, tetapi provider tidak mengirim daftar model. Isi model secara manual.");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey, model })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? "Gagal menyimpan settings.");
      return;
    }

    setMessage("Settings tersimpan.");
  }

  return (
    <form className="form" onSubmit={save}>
      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      <div className="field">
        <label>Base URL</label>
        <input className="input" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com" />
      </div>
      <div className="field">
        <label>API Key</label>
        <input className="input" value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="button secondary" disabled={loading || !baseUrl || !apiKey} type="button" onClick={checkConnection}>
          <PlugZap size={18} />
          Cek Koneksi
        </button>
      </div>
      <div className="field">
        <label>Model Vision</label>
        {manualModel ? (
          <input className="input" value={model} onChange={(event) => setModel(event.target.value)} placeholder="Contoh: seed-1-6-250915 atau model ID provider" />
        ) : (
          <select className="select" value={model} onChange={(event) => setModel(event.target.value)}>
            <option value="">Pilih model</option>
            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}
        <button className="button secondary" type="button" onClick={() => setManualModel((value) => !value)}>
          {manualModel ? "Pilih dari daftar model" : "Isi model manual"}
        </button>
      </div>
      <button className="button primary" disabled={loading || !baseUrl || !apiKey || !model} type="submit">
        <Save size={18} />
        Simpan
      </button>
    </form>
  );
}
