import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { ScannerClient } from "./scanner-client";

export default async function ScannerPage() {
  await requireSession();

  return (
    <AppShell title="Scanner Rapor" subtitle="Upload rapor PDF/JPG/PNG, review hasil AI, lalu simpan ke database">
      <ScannerClient />
    </AppShell>
  );
}
