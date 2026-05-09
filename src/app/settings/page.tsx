import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "./account-form";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

  return (
    <AppShell title="Settings" subtitle="Kelola konfigurasi LLM dan akun admin">
      <section className="panel">
        <h2>Konfigurasi LLM</h2>
        <SettingsForm
          initial={{
            baseUrl: settings?.llmBaseUrl ?? "",
            apiKey: settings?.llmApiKey ?? "",
            model: settings?.llmModel ?? ""
          }}
        />
      </section>
      <section className="panel">
        <h2>Akun Admin</h2>
        <AccountForm initialUsername={session.username} />
      </section>
    </AppShell>
  );
}
