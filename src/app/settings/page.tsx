import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireSession();
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

  return (
    <AppShell title="Settings LLM" subtitle="Simpan konfigurasi provider OpenAI-compatible sekali saja">
      <section className="panel">
        <SettingsForm
          initial={{
            baseUrl: settings?.llmBaseUrl ?? "",
            apiKey: settings?.llmApiKey ?? "",
            model: settings?.llmModel ?? ""
          }}
        />
      </section>
    </AppShell>
  );
}
