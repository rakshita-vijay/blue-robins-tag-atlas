import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

// POST { title, content, existingTags } -> which of the board's existing
// tags this project probably belongs under, plus any genuinely new tags
// worth adding, plus "this looks like an existing tag" synonym notes.
// Nothing is ever applied automatically — ProjectForm.tsx shows these as
// dismissible suggestion chips the user clicks to add.
export async function POST(req: NextRequest) {
  let body: { title?: string; content?: string; existingTags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const content = typeof body.content === "string" ? body.content : "";
  const existingTags = Array.isArray(body.existingTags)
    ? body.existingTags.filter((t) => typeof t === "string")
    : [];

  if (!title.trim() && !content.trim()) {
    return NextResponse.json(
      { error: "Add a title or some content first." },
      { status: 400 }
    );
  }

  let model;
  try {
    model = getGeminiModel();
  } catch {
    return NextResponse.json(
      { error: "AI tag suggestions aren't configured (missing GEMINI_API_KEY)." },
      { status: 503 }
    );
  }

  const prompt = `A personal project board already uses these tags:
${existingTags.length > 0 ? existingTags.map((t) => `- ${t}`).join("\n") : "(none yet)"}

Here is a new project:
Title: ${title || "(untitled)"}
Content: ${content || "(no content yet)"}

Suggest tags for this project. Return ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "existingTagsToApply": string[],
  "suggestedNewTags": string[],
  "synonymNotes": [{ "newTag": string, "existingTag": string, "reason": string }]
}

Rules:
- "existingTagsToApply": tags from the board's existing list above that clearly fit this project, even if the project's wording doesn't use the exact same word.
- "suggestedNewTags": short, lowercase, genuinely new tags (not already on the board) worth adding for this project. Keep this list small — 1 to 4 tags.
- "synonymNotes": only include an entry when a tag you were about to suggest as new is really just a different phrasing of one already on the board — point to that existing tag instead of suggesting a duplicate concept.
- Keep every tag short (1-3 words), lowercase.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    const existingTagsToApply = Array.isArray(parsed.existingTagsToApply)
      ? parsed.existingTagsToApply.filter(
          (t: unknown): t is string => typeof t === "string" && existingTags.includes(t)
        )
      : [];

    const suggestedNewTags = Array.isArray(parsed.suggestedNewTags)
      ? parsed.suggestedNewTags.filter(
          (t: unknown): t is string => typeof t === "string" && t.trim().length > 0
        )
      : [];

    const synonymNotes = Array.isArray(parsed.synonymNotes)
      ? parsed.synonymNotes.filter((n: unknown) => {
          if (!n || typeof n !== "object") return false;
          const obj = n as Record<string, unknown>;
          return (
            typeof obj.newTag === "string" &&
            typeof obj.existingTag === "string" &&
            existingTags.includes(obj.existingTag) &&
            typeof obj.reason === "string"
          );
        })
      : [];

    return NextResponse.json({ existingTagsToApply, suggestedNewTags, synonymNotes });
  } catch (err) {
    console.error("suggest-tags error:", err);
    return NextResponse.json(
      { error: "AI tag suggestion failed. Try again." },
      { status: 500 }
    );
  }
}
