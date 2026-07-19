import JSZip from "jszip";

export type ZipEntry = { name: string; content: string };

export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.name, entry.content);
  }
  return zip.generateAsync({ type: "blob" });
}

// Ensures every entry has a unique file name within the zip by appending
// " (2)", " (3)", etc. before the extension on any repeat.
export function uniqueFileName(baseName: string, used: Set<string>): string {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  const dotIdx = baseName.lastIndexOf(".");
  const stem = dotIdx >= 0 ? baseName.slice(0, dotIdx) : baseName;
  const ext = dotIdx >= 0 ? baseName.slice(dotIdx) : "";
  let n = 2;
  let candidate = `${stem} (${n})${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
  used.add(candidate);
  return candidate;
}
