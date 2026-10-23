import { decodeId } from '@openimis/fe-core';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const cycleUuid = (window) => {
  if (!window?.id) return null;
  return UUID_RE.test(window.id) ? window.id : decodeId(window.id);
};

export default cycleUuid;
