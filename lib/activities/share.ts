export async function shareOrCopy(payload: { title: string; text: string; url?: string }): Promise<
  "shared" | "copied" | "failed"
> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch {
      // User cancelled the native share sheet, or it's unsupported for this payload — fall through to copy.
    }
  }

  try {
    const text = [payload.text, payload.url].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
