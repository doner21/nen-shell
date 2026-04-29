export const nowIso = () => new Date().toISOString();

export const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const formatShortDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
