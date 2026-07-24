/** Replaces `{key}` placeholders in a translated template, e.g. formatMessage(t.common.minutesAgo, { n: 5 }). */
export function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
