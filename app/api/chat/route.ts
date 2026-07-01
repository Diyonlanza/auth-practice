import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // 1. verify who's logged in via their session cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. get the incoming message details
  const { message, chapterId, subject } = await request.json();

  // 3. fetch THIS user's last 20 messages for this chapter
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: true })
    .limit(20);

  // 4. build conversation array — history + new message at the end
  const messages = [
    ...(history || []),
    { role: "user" as const, content: message }
  ];

  // 5. call Claude with full conversation context
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: messages,
  });

  const textBlock = response.content[0];
  const reply = textBlock.type === "text" ? textBlock.text : "";

  // 6. save both messages tagged with THIS user's id
  await supabase.from("messages").insert([
    {
      user_id: user.id,
      chapter_id: chapterId,
      subject,
      role: "user",
      content: message,
    },
    {
      user_id: user.id,
      chapter_id: chapterId,
      subject,
      role: "assistant",
      content: reply,
    },
  ]);

  // 7. send reply back to browser
  return Response.json({ reply });
}