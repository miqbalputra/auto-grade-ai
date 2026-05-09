import { extractedReportSchema } from "@/lib/grades";

export const REPORT_SYSTEM_PROMPT = `Anda adalah asisten administrasi yang membaca dokumen rapor dari Kelompok Tahfidz berbahasa Indonesia dan Arab. Ekstrak data spesifik menjadi JSON valid.

FIELD YANG DICARI:
1. "nama_santri" dari "Nama Santri :"
2. "nis" dari "NIS :"
3. "kelas" dari "Kelas :"
4. "semester" angka saja
5. "tahun_ajaran" dari "Tahun Ajaran :"
6. "jumlah_nilai" angka pada baris "JUMLAH NILAI"
7. "score_breakdown" semua nilai individual: capaian_belajar, ujian_tahfidz, tahfidz_harian, ujian_praktik.

ATURAN:
- Ambil kolom Angka, abaikan KKM dan Rata-rata Kelas.
- Abaikan baris Nilai rata-rata.
- Ubah koma desimal menjadi titik.
- Hitung "jumlah_poin" dari total item score_breakdown.
- Nilai tidak terbaca isi null, jangan mengarang.
- Output strict JSON tanpa teks lain.`;

type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function fetchModels(config: Pick<LlmConfig, "baseUrl" | "apiKey">) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/v1/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Provider membalas ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as { data?: Array<{ id: string }> };
  return (payload.data ?? []).map((model) => model.id).filter(Boolean);
}

export async function extractReportFromImage(config: LlmConfig, mimeType: string, base64: string) {
  const imageUrl = `data:${mimeType};base64,${base64}`;
  const payload = {
    model: config.model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Baca rapor ini dan keluarkan JSON sesuai schema." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    temperature: 0
  };

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`LLM gagal ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = extractedReportSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("JSON LLM tidak sesuai schema.");
  }
  return parsed.data;
}

export async function completeChat(config: LlmConfig, messages: ChatMessage[]) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`LLM gagal ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM tidak mengembalikan jawaban teks.");
  }
  return content;
}
