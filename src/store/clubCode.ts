import type { Club } from '../engine/models/club';

export const CLUB_EXPORT_CODE_PREFIX = 'MBM1:';

interface ExportedClubPayload {
  v: 1;
  club: Club;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Encodes a dynasty club into a compact serverless Base64/JSON Export Code for offline sharing. */
export function encodeClubExportCode(club: Club): string {
  const sanitized: Club = {
    ...club,
    isHuman: false,
  };
  const payload: ExportedClubPayload = { v: 1, club: sanitized };
  return `${CLUB_EXPORT_CODE_PREFIX}${toBase64(JSON.stringify(payload))}`;
}

/** Decodes and validates a shared Club Export Code so friends can battle your dynasty club offline. */
export function decodeClubExportCode(
  rawCode: string,
): { ok: true; club: Club } | { ok: false; error: string } {
  const trimmed = rawCode.trim();
  if (!trimmed.startsWith(CLUB_EXPORT_CODE_PREFIX)) {
    return { ok: false, error: 'Invalid code prefix — expected an MBM1: club code.' };
  }
  try {
    const decoded = fromBase64(trimmed.slice(CLUB_EXPORT_CODE_PREFIX.length));
    const parsed = JSON.parse(decoded) as Partial<ExportedClubPayload>;
    if (parsed.v !== 1 || !parsed.club) {
      return { ok: false, error: 'Unsupported club code schema version.' };
    }
    const c = parsed.club;
    if (
      typeof c.id !== 'string' ||
      typeof c.name !== 'string' ||
      !Array.isArray(c.roster) ||
      c.roster.length < 9 ||
      !Array.isArray(c.lineup) ||
      c.lineup.length !== 9
    ) {
      return { ok: false, error: 'Corrupted club roster or lineup inside export code.' };
    }
    return { ok: true, club: { ...c, isHuman: false } };
  } catch {
    return { ok: false, error: 'Could not decode Base64/JSON club code.' };
  }
}
