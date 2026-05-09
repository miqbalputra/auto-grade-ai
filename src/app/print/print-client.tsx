"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";

export function PrintClient({ students, selectedId }: { students: Array<{ id: number; name: string }>; selectedId?: number }) {
  const router = useRouter();

  return (
    <section className="panel no-print" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <select className="select" style={{ maxWidth: 360 }} value={selectedId ?? ""} onChange={(event) => router.push(`/print?student=${event.target.value}`)}>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name}
          </option>
        ))}
      </select>
      <button className="button primary" onClick={() => window.print()}>
        <Printer size={18} />
        Cetak / Simpan PDF
      </button>
    </section>
  );
}
