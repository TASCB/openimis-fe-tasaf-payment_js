// navigator.clipboard exists only on a secure origin (trusted HTTPS or localhost); servers reached by
// IP over http or a self-signed certificate need the execCommand fallback. The textarea goes inside
// `container` (the dialog) because a MUI Dialog's focus trap pulls focus back from the body.
function legacyCopy(text, container) {
  const host = container || document.body;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  host.appendChild(area);
  area.focus();
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  host.removeChild(area);
  return ok;
}

export default function copyText(text, container) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => legacyCopy(text, container));
  }
  return Promise.resolve(legacyCopy(text, container));
}
