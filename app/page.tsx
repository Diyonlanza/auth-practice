"use client";
import { useState, useEffect } from "react";

type Message = { role: string; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // unchanged from before — loads history once on page load
  useEffect(() => {
    async function loadHistory() {
      const res = await fetch("/api/history?subject=physics&chapterId=electrostatics");
      const data = await res.json();
      setMessages(data.messages);
    }
    loadHistory();
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]); // optimistic update, unchanged
    setInput("");
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, chapterId: "electrostatics", subject: "physics" }),
    });

    // NEW: add an empty assistant bubble now — chunks will fill it in as they arrive
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    // NEW: the read-end of the stream, and the byte→text converter
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // NEW: pull chunks until the stream says done
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);

      // NEW: append this chunk onto the last message (the one we just added)
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content += chunk;
        return updated;
      });
    }

    setLoading(false);
  }

  // NEW: clear chat — deletes from Supabase, then wipes local state
  async function clearChat() {
    await fetch("/api/clear?subject=physics&chapterId=electrostatics", {
      method: "DELETE",
    });
    setMessages([]);
  }

  return (
    <div>
      <h1>Chat</h1>
      <button onClick={clearChat}>Clear Chat</button>

      <div>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && <p>AI is thinking...</p>}
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && sendMessage()}
        placeholder="Ask a question..."
      />
      <button onClick={sendMessage} disabled={loading}>
        Send
      </button>
    </div>
  );
}