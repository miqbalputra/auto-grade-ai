"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileUp, Save, UploadCloud } from "lucide-react";

type ScanRow = {
  id: string;
  fileName: string;
  fileUrl?: string;
  status: "menunggu" | "memproses" | "ok" | "needs_review" | "failed";
  errors: string[];
  data?: {
    nama_santri: string;
    nis?: string | null;
    kelas?: string | null;
    semester: number;
    tahun_ajaran: string;
    jumlah_nilai: number;
    jumlah_poin: number;
    average_score: number;
    score_breakdown: unknown;
  };
};

export function ScannerClient() {
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [saving, setSaving] = useState(false);
  const complete = useMemo(() => rows.filter((row) => row.status === "ok" || row.status === "needs_review").length, [rows]);

  async function processFiles(files: FileList | null) {
    if (!files?.length) return;
    const pending = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      status: "menunggu" as const,
      errors: []
    }));
    setRows(pending);

    for (const [index, file] of Array.from(files).entries()) {
      const id = pending[index].id;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status: "memproses" } : row)));
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/scanner/process", { method: "POST", body: form });
      const payload = await response.json();
      setRows((current) =>
        current.map((row) =>
          row.id === id
            ? {
                ...row,
                status: payload.status ?? "failed",
                errors: payload.errors ?? [],
                data: payload.data,
                fileUrl: payload.fileUrl
              }
            : row
        )
      );
    }
  }

  async function saveAll() {
    setSaving(true);
    const response = await fetch("/api/reports/bulk-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports: rows.filter((row) => row.data).map((row) => ({ ...row.data, fileUrl: row.fileUrl, status: row.status })) })
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      alert(payload.message ?? "Gagal menyimpan.");
      return;
    }
    alert(`${payload.saved} rapor tersimpan.`);
  }

  return (
    <section className="grid">
      <div className="dropzone">
        <UploadCloud size={34} color="#1a4d2e" />
        <h2>Upload batch rapor</h2>
        <p className="muted">Format PDF, JPG, PNG. File diproses berurutan untuk mengurangi risiko rate limit.</p>
        <label className="button primary" style={{ marginTop: 10 }}>
          <FileUp size={18} />
          Pilih File
          <input accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(event) => processFiles(event.target.files)} style={{ display: "none" }} type="file" />
        </label>
      </div>

      {rows.length ? (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <strong>
              Progress: {complete} dari {rows.length} selesai
            </strong>
            <button className="button primary" disabled={!complete || saving} onClick={saveAll}>
              <Save size={18} />
              Simpan Semua ke Database
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Nama / NIS / Kelas</th>
                  <th>Semester</th>
                  <th>Jumlah / Poin / Rata-rata</th>
                  <th>Status</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fileName}</td>
                    <td>
                      {row.data ? (
                        <>
                          <strong>{row.data.nama_santri}</strong>
                          <br />
                          <span className="muted">{row.data.nis || "-"} / {row.data.kelas || "-"}</span>
                        </>
                      ) : (
                        <span className="muted">Belum ada data</span>
                      )}
                    </td>
                    <td>{row.data ? `${row.data.semester} - ${row.data.tahun_ajaran}` : "-"}</td>
                    <td>{row.data ? `${row.data.jumlah_nilai} / ${row.data.jumlah_poin} / ${row.data.average_score.toFixed(2)}` : "-"}</td>
                    <td>
                      <span className={`badge ${row.status === "memproses" || row.status === "menunggu" ? "needs_review" : row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.errors.length ? row.errors.join(" ") : row.status === "ok" ? <CheckCircle2 size={18} color="#067647" /> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
