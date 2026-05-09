import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  await requireSession();
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const ready = Boolean(settings?.llmBaseUrl && settings.llmApiKey && settings.llmModel);

  return (
    <AppShell title="Chatbot Data" subtitle="Tanya data siswa, nilai, kelengkapan semester, dan status review">
      <ChatClient ready={ready} model={settings?.llmModel ?? null} />
    </AppShell>
  );
}
