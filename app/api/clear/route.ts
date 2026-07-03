// app/api/clear/route.ts
import { createClient } from "@/utils/supabase/server";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");
  const chapterId = searchParams.get("chapterId");

  if (!subject || !chapterId) {
    return Response.json({ error: "Missing subject or chapterId" }, { status: 400 });
  }
  

  await supabase
    .from("messages")
    .delete()
    .eq("user_id", user.id)
    .eq("subject", subject)
    .eq("chapter_id", chapterId);

  return Response.json({ success: true });
}