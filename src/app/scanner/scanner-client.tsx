"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Save, UploadCloud } from "lucide-react";

type DraftPayload = {
  nama_santri: string;
  nis: string;
  kelas: string;
  semester: string;
  tahun_ajaran: string;
  jumlah_nilai: string;
  jumlah_poin: string;
  score_breakdown_text: string;
};

type ScanRow = {
  id: string;
  fileName: string;
  label: string;
  pageNumber: number | null;
  fileUrl?: string;
  status: "menunggu" | "memproses" | "ok" | "needs_review" | "failed";
  errors: string[];
  draft: DraftPayload;
  edited: boolean;
};

type ProcessResponse = {
  status?: "ok" | "needs_review" | "failed";
  fileUrl?: string;
  items?: Array<{
    label: string;
    pageNumber: number | null;
    status: "ok" | "needs_review" | "failed";
    errors: string[];
    draft: DraftPayload;
  }>;
};

const EMPTY_BREAKDOWN = JSON.stringify(
  {
    capaian_belajar: [],
    ujian_tahfidz: [],
    tahfidz_harian: [],
    ujian_praktik: []
  },
  null,
  2
);

function createEmptyDraft(): DraftPayload {
  return {
    nama_santri: "",
    nis: "",
    kelas: "",
    semester: "",
    tahun_ajaran: "",
    jumlah_nilai: "",
    jumlah_poin: "",
    score_breakdown_text: EMPTY_BREAKDOWN
  };
}

function computeAverage(draft: DraftPayload) {
  const total = Number(draft.jumlah_nilai);
  const count = Number(draft.jumlah_poin);
  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) return null;
  return total / count;
}

export function ScannerClient() {
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [saving, setSaving] = useState(false);
  const complete = useMemo(() => rows.filter((row) => row.status === "ok" || row.status === "needs_review").length, [rows]);
  const readyToSave = useMemo(() => rows.filter((row) => row.draft.nama_santri.trim()).length, [rows]);

  async function processFiles(files: FileList | null) {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    const placeholders = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      label: file.name,
      pageNumber: null,
      status: "menunggu" as const,
      errors: [],
      draft: createEmptyDraft(),
      edited: false
    }));

    setRows((current) => [...current, ...placeholders]);

    for (const [index, file] of selectedFiles.entries()) {
      const placeholderId = placeholders[index].id;
      setRows((current) => current.map((row) => (row.id === placeholderId ? { ...row, status: "memproses" } : row)));

      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/scanner/process", { method: "POST", body: form });
      const payload = (await response.json().catch(() => ({}))) as ProcessResponse;
      const items = payload.items?.length
        ? payload.items
        : [
            {
              label: file.name,
              pageNumber: null,
              status: payload.status ?? "failed",
              errors: response.ok ? [] : ["Gagal memproses file."],
              draft: createEmptyDraft()
            }
          ];

      setRows((current) =>
        current.flatMap((row) =>
          row.id !== placeholderId
            ? [row]
            : items.map((item) => ({
                id: crypto.randomUUID(),
                fileName: file.name,
                label: item.label,
                pageNumber: item.pageNumber,
                fileUrl: payload.fileUrl,
                status: item.status,
                errors: item.errors,
                draft: item.draft,
                edited: false
              }))
        )
      );
    }
  }

  function updateDraft(id: string, field: keyof DraftPayload, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              edited: true,
              status: row.status === "failed" ? "needs_review" : row.status,
              draft: { ...row.draft, [field]: value }
            }
          : row
      )
    );
  }

  async function saveAll() {
    const nextRows = rows.map((row) => {
      const errors: string[] = [];
      const semester = Number(row.draft.semester);
      const total = Number(row.draft.jumlah_nilai);
      const count = Number(row.draft.jumlah_poin);

      if (!row.draft.nama_santri.trim()) errors.push("Nama santri wajib diisi.");
      if (!Number.isInteger(semester) || semester <= 0) errors.push("Semester harus berupa angka bulat.");
      if (!row.draft.tahun_ajaran.trim()) errors.push("Tahun ajaran wajib diisi.");
      if (!Number.isFinite(total) || total <= 0) errors.push("Jumlah nilai harus berupa angka.");
      if (!Number.isInteger(count) || count <= 0) errors.push("Jumlah poin harus berupa angka bulat.");

      try {
        JSON.parse(row.draft.score_breakdown_text);
      } catch {
        errors.push("Format JSON score breakdown tidak valid.");
      }

      return {
        ...row,
        status: errors.length ? "needs_review" : row.status,
        errors
      };
    });

    setRows(nextRows);

    const invalidCount = nextRows.filter((row) => row.errors.length).length;
    if (invalidCount) {
      alert(`${invalidCount} draft masih perlu diperbaiki sebelum disimpan.`);
      return;
    }

    setSaving(true);
    const response = await fetch("/api/reports/bulk-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reports: nextRows.map((row) => ({
          nama_santri: row.draft.nama_santri.trim(),
          nis: row.draft.nis.trim() || null,
          kelas: row.draft.kelas.trim() || null,
          semester: Number(row.draft.semester),
          tahun_ajaran: row.draft.tahun_ajaran.trim(),
          jumlah_nilai: Number(row.draft.jumlah_nilai),
          jumlah_poin: Number(row.draft.jumlah_poin),
          score_breakdown: JSON.parse(row.draft.score_breakdown_text),
          fileUrl: row.fileUrl,
          status: row.edited || row.status === "failed" ? "needs_review" : row.status
        }))
      })
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      alert((payload as { message?: string }).message ?? "Gagal menyimpan.");
      return;
    }

    alert(`${(payload as { saved?: number }).saved ?? 0} rapor tersimpan.`);
  }

  return (
    <section className="grid">
      <div className="dropzone">
        <UploadCloud size={34} color="#1a4d2e" />
        <h2>Upload batch rapor</h2>
        <p className="muted">Format PDF, JPG, PNG. PDF akan dipisah per halaman lalu dibaca otomatis sebagai draft yang masih bisa Anda edit.</p>
        <label className="button primary" style={{ marginTop: 10 }}>
          <FileUp size={18} />
          Pilih File
          <input accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(event) => processFiles(event.target.files)} style={{ display: "none" }} type="file" />
        </label>
      </div>

      {rows.length ? (
        <div className="panel">
          <div className="scanner-toolbar">
            <strong>
              Draft terbaca: {complete} dari {rows.length} item
            </strong>
            <span className="muted">{readyToSave} item siap diedit / disimpan</span>
            <button className="button primary" disabled={!readyToSave || saving} onClick={saveAll}>
              <Save size={18} />
              Simpan Semua ke Database
            </button>
          </div>

          <div className="scanner-list">
            {rows.map((row) => {
              const average = computeAverage(row.draft);

              return (
                <article className="card scanner-card" key={row.id}>
                  <div className="scanner-card-header">
                    <div>
                      <strong>{row.label}</strong>
                      <div className="muted">{row.pageNumber ? `Halaman ${row.pageNumber}` : "File tunggal"} • {row.fileName}</div>
                    </div>
                    <span className={`badge ${row.status === "memproses" || row.status === "menunggu" ? "needs_review" : row.status}`}>
                      {row.status}
                    </span>
                  </div>

                  <div className="scanner-fields">
                    <div className="field scanner-field-span-2">
                      <label>Nama Santri</label>
                      <input className="input" value={row.draft.nama_santri} onChange={(event) => updateDraft(row.id, "nama_santri", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>NIS</label>
                      <input className="input" value={row.draft.nis} onChange={(event) => updateDraft(row.id, "nis", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Kelas</label>
                      <input className="input" value={row.draft.kelas} onChange={(event) => updateDraft(row.id, "kelas", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Semester</label>
                      <input className="input" inputMode="numeric" value={row.draft.semester} onChange={(event) => updateDraft(row.id, "semester", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Tahun Ajaran</label>
                      <input className="input" value={row.draft.tahun_ajaran} onChange={(event) => updateDraft(row.id, "tahun_ajaran", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Jumlah Nilai</label>
                      <input className="input" inputMode="decimal" value={row.draft.jumlah_nilai} onChange={(event) => updateDraft(row.id, "jumlah_nilai", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Jumlah Poin</label>
                      <input className="input" inputMode="numeric" value={row.draft.jumlah_poin} onChange={(event) => updateDraft(row.id, "jumlah_poin", event.target.value)} />
                    </div>
                  </div>

                  <div className="scanner-meta">
                    <span>Rata-rata otomatis: <strong>{average === null ? "-" : average.toFixed(2)}</strong></span>
                    {row.edited ? <span className="muted">Draft sudah diedit, akan disimpan sebagai needs_review.</span> : null}
                  </div>

                  <details className="scanner-breakdown">
                    <summary>Score breakdown JSON</summary>
                    <textarea
                      className="textarea"
                      value={row.draft.score_breakdown_text}
                      onChange={(event) => updateDraft(row.id, "score_breakdown_text", event.target.value)}
                    />
                  </details>

                  <div className="scanner-notes">
                    {row.errors.length ? (
                      row.errors.map((error, index) => (
                        <div className="error" key={`${row.id}-error-${index}`}>
                          <AlertTriangle size={16} />
                          <span>{error}</span>
                        </div>
                      ))
                    ) : row.status === "ok" ? (
                      <div className="success">
                        <CheckCircle2 size={16} />
                        <span>Hasil scan lolos validasi awal.</span>
                      </div>
                    ) : (
                      <div className="muted">Belum ada catatan tambahan.</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
