/**
 * Utility per formattazione date
 * Centralizza tutte le funzioni di formattazione usate nel frontend
 */

/**
 * Formatta una data in formato relativo (es. "2 ore fa", "ieri")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Adesso";
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;

  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Formatta l'orario in formato breve (es. "14:30")
 */
export function formatTimeShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatta la data in formato locale italiano
 */
export function formatDateLocalized(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(
    "it-IT",
    options || {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

/**
 * Formatta data e ora insieme
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatta la data per la visualizzazione nei messaggi di chat
 * Mostra solo l'ora se è oggi, altrimenti data + ora
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return formatTimeShort(dateString);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `Ieri ${formatTimeShort(dateString)}`;
  }

  return `${date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  })} ${formatTimeShort(dateString)}`;
}

/**
 * Calcola se una data è nel passato
 */
export function isPastDate(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

/**
 * Calcola se una data è oggi
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
