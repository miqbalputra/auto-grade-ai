"use client";

import { useRef, useState } from "react";
import { BotMessageSquare, Send, Sparkles, UserRound } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Berapa total siswa dan berapa yang belum lengkap 12 semester?",
  "Siapa saja siswa dengan nilai ijazah final tertinggi?",
  "Tampilkan siswa yang masih perlu review.",
  "Ringkas data nilai per semester untuk siswa tertentu."
];

export function ChatClient({ ready, model }: { ready: boolean; model: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Assalamu'alaikum. Saya siap bantu membaca data AutoGrade AI. Silakan tanya rekap siswa, nilai final, semester yang belum lengkap, atau status review."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(question?: string) {
    const content = (question ?? input).trim();
    if (!content || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages.filter((message) => message.role === "user" || message.role === "assistant").slice(-10)
      })
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.message ?? "Chatbot gagal menjawab.");
      return;
    }

    setMessages((current) => [...current, { role: "assistant", content: payload.answer }]);
  }

  return (
    <section className="chat-layout">
      <div className="panel chat-panel">
        <div className="chat-header">
          <div>
            <strong>Asisten Data AutoGrade</strong>
            <p className="muted">{ready ? `Model aktif: ${model}` : "Settings LLM belum lengkap."}</p>
          </div>
          <BotMessageSquare color="#1a4d2e" size={28} />
        </div>

        {!ready ? <div className="error">Isi Settings LLM terlebih dahulu agar chatbot bisa memanggil model AI.</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              <div className="chat-avatar">{message.role === "assistant" ? <Sparkles size={16} /> : <UserRound size={16} />}</div>
              <div className="chat-bubble">{message.content}</div>
            </div>
          ))}
          {loading ? (
            <div className="chat-message assistant">
              <div className="chat-avatar">
                <Sparkles size={16} />
              </div>
              <div className="chat-bubble">Sedang membaca data...</div>
            </div>
          ) : null}
        </div>

        <form
          className="chat-input"
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
        >
          <input
            className="input"
            disabled={!ready || loading}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tanya data nilai atau siswa..."
            value={input}
          />
          <button className="button primary" disabled={!ready || loading || !input.trim()} type="submit">
            <Send size={18} />
            Kirim
          </button>
        </form>
      </div>

      <aside className="panel chat-suggestions">
        <strong>Contoh Pertanyaan</strong>
        {suggestions.map((suggestion) => (
          <button className="button secondary" disabled={!ready || loading} key={suggestion} onClick={() => ask(suggestion)}>
            {suggestion}
          </button>
        ))}
      </aside>
    </section>
  );
}
