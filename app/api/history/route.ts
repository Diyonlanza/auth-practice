import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // query params come from the URL, e.g. /api/history?subject=physics&chapterId=electrostatics
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");
  const chapterId = searchParams.get("chapterId");

  if (!subject || !chapterId) {
    return Response.json({ error: "Missing subject or chapterId" }, { status: 400 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("user_id", user.id)
    .eq("subject", subject)
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: true })
    .limit(20);

  return Response.json({ messages: messages || [] });
}