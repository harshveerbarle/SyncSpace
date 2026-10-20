/**
 * Utility functions for parsing and generating video meeting links and room codes.
 */

/**
 * Extracts a clean meeting roomId from any user input:
 * - Full URL: http://localhost:5173/?meet=room_123 or https://example.com/?room=room_123
 * - Hash URL: http://localhost:5173/#meet=room_123
 * - Path URL: http://localhost:5173/meet/room_123
 * - Query string: ?meet=room_123
 * - Plain room code: room_123 or standup-sync
 */
export function parseMeetingRoomId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // 1. Check if user provided a full HTTP/HTTPS URL
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);

      // Query param ?meet=... or ?room=...
      if (url.searchParams.has('meet')) {
        const val = url.searchParams.get('meet')?.trim();
        if (val) return sanitizeRoomId(val);
      }
      if (url.searchParams.has('room')) {
        const val = url.searchParams.get('room')?.trim();
        if (val) return sanitizeRoomId(val);
      }

      // Hash fragment #meet=...
      if (url.hash && url.hash.includes('meet=')) {
        const hashQuery = url.hash.replace(/^#\??/, '');
        const hashParams = new URLSearchParams(hashQuery);
        if (hashParams.has('meet')) {
          const val = hashParams.get('meet')?.trim();
          if (val) return sanitizeRoomId(val);
        }
      }

      // Path /meet/room_id
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[segments.length - 2].toLowerCase() === 'meet') {
        return sanitizeRoomId(segments[segments.length - 1]);
      }
      if (segments.length > 0 && segments[segments.length - 1].startsWith('room_')) {
        return sanitizeRoomId(segments[segments.length - 1]);
      }
    }
  } catch (e) {
    // Continue to regex match
  }

  // 2. Regex fallback for strings containing ?meet= or &meet=
  const meetMatch = trimmed.match(/[?&#]meet=([^&#\s]+)/i);
  if (meetMatch && meetMatch[1]) {
    return sanitizeRoomId(decodeURIComponent(meetMatch[1]));
  }

  const roomMatch = trimmed.match(/[?&#]room=([^&#\s]+)/i);
  if (roomMatch && roomMatch[1]) {
    return sanitizeRoomId(decodeURIComponent(roomMatch[1]));
  }

  // 3. Raw room code entered
  return sanitizeRoomId(trimmed);
}

function sanitizeRoomId(raw) {
  if (!raw) return '';
  // Remove trailing slashes, hash symbols or query strings
  return raw
    .replace(/^#/, '')
    .replace(/[?&].*$/, '')
    .trim();
}

/**
 * Returns a complete shareable web link for a meeting room
 */
export function getMeetingShareUrl(roomId) {
  if (!roomId) return '';
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:5173';
  return `${origin}/?meet=${encodeURIComponent(roomId)}`;
}
