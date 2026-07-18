import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

// POST { tags } -> groups of existing tags that likely mean the same thing,
// each with a suggested canonical tag to merge into. This never merges
// anything itself — the board's "Clean up tags" UI shows each cluster and
// lets the user confirm (or change the canonical choice) before merging.
export async function POST(req: NextRequest) {
  let body: { tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string")
    : [];

  if (tags.length < 2) {
    return NextResponse.json({ clusters: [] });
  }

  let model;
  try {
    model = getGeminiModel();
  } catch {
    return NextResponse.json(
      { error: "AI tag cleanup isn't configured (missing GEMINI_API_KEY)." },
      { status: 503 }
    );
  }

  const prompt = `Here is the full list of tags currently used on a personal project board:
${tags.map((t) => `- ${t}`).join("\n")}

Find groups of tags that mean essentially the same thing: near-synonyms, different phrasing of the same concept, singular/plural variants, or abbreviations of each other. Ignore tags that are genuinely distinct concepts even if related (e.g. "accessibility" and "HCI" are related but NOT the same thing — do not cluster them).

Return ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "clusters": [
    { "tags": string[], "suggestedCanonical": string, "reason": string }
  ]
}

Rules:
- Only include a cluster if 2 or more tags from the list above should likely be merged into one.
- Use the exact original tag spelling/casing from the list in "tags".
- "suggestedCanonical" must be one of the strings in that same cluster's "tags" array — the one that reads most naturally as the umbrella term.
- "reason" should be one short sentence.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    const clusters = Array.isArray(parsed.clusters)
      ? parsed.clusters.filter((c: unknown) => {
          if (!c || typeof c !== "object") return false;
          const obj = c as Record<string, unknown>;
          return (
            Array.isArray(obj.tags) &&
            obj.tags.length >= 2 &&
            obj.tags.every((t: unknown) => typeof t === "string") &&
            typeof obj.suggestedCanonical === "string" &&
            (obj.tags as string[]).includes(obj.suggestedCanonical as string)
          );
        })
      : [];

    return NextResponse.json({ clusters });
  } catch (err) {
    console.error("cluster-tags error:", err);
    return NextResponse.json(
      { error: "AI tag cleanup failed. Try again." },
      { status: 500 }
    );
  }
}
