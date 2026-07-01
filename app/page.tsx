"use client";
import { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    // add user message to UI immediately
    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // call your route
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        chapterId: "electrostatics",
        subject: "physics",
      }),
    });

    const data = await response.json();

    // add Claude's reply to UI
    setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  return (
    <div>
      <h1>Chat</h1>

      {/* message history */}
      <div>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && <p>AI is thinking...</p>}
      </div>

      {/* input */}
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