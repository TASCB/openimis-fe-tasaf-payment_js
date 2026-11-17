// Errors arrive as a JSON list of {message, detail}.
export function mutationErrorText(raw) {
  if (!raw) return null;
  let entries = raw;
  if (typeof raw === 'string') {
    try { entries = JSON.parse(raw); } catch (e) { return raw; }
  }
  const list = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
  const texts = list.map((e) => (typeof e === 'string' ? e : e.message || e.detail)).filter(Boolean);
  return texts.length ? [...new Set(texts)].join('\n') : String(raw);
}
