import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, chapterId, subject } = await request.json();

  if (!message || !chapterId || !subject) {
    return Response.json({ error: "Missing message, chapterId, or subject" }, { status: 400 });
  }

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .eq("subject", subject)
    .order("created_at", { ascending: true })
    .limit(20);

  const messages = [
    ...(history || []),
    { role: "user" as const, content: message },
  ];

  // 1. stream: true — Claude sends back a stream of events instead of one finished object
  const stream = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages,
    stream: true,
  });

  // 2. this variable accumulates the full reply as chunks arrive —
  //    you need the complete text later to save to Supabase, even though
  //    you're sending it to the browser in pieces
  let fullReply = "";

  const encoder = new TextEncoder();

  // 3. ReadableStream is a built-in web API — a way to send data to the browser
  //    in pieces over time, instead of all at once. "start" runs immediately
  //    when the stream is created.
  const readableStream = new ReadableStream({
    async start(controller) {
      // 4. for await...of loops over the stream as events arrive —
      //    each "event" is a small piece of what Claude is doing (starting
      //    a block, sending a bit of text, finishing, etc.)
      for await (const event of stream) {
        // 5. Claude sends several event types. The one holding actual text
        //    is "content_block_delta" with delta.type "text_delta".
        //    Everything else (message_start, content_block_start, etc.)
        //    you just ignore by not matching this condition.
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const chunk = event.delta.text;
          fullReply += chunk; // keep building the full text for saving later

          // 6. controller.enqueue pushes this chunk to the browser right now —
          //    encoder.encode turns the string into bytes, which is what
          //    streams actually transmit
          controller.enqueue(encoder.encode(chunk));
        }
      }

      // 7. once the loop finishes, Claude is done generating — NOW save to Supabase,
      //    same "save after success" rule as before, just moved to after streaming
      //    instead of after one single await
      await supabase.from("messages").insert([
        { user_id: user.id, chapter_id: chapterId, subject, role: "user", content: message },
        { user_id: user.id, chapter_id: chapterId, subject, role: "assistant", content: fullReply },
      ]);

      // 8. tells the browser "no more data coming, stream is finished"
      controller.close();
    },
  });

  // 9. return the stream itself as the response body, instead of Response.json(...)
  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}