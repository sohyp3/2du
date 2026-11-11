import { useEffect, useState } from 'react';

/** Milliseconds left, re-rendering only its caller once per second on the second boundary. */
export function useRemaining(endsAt: number | undefined) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (endsAt == null) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      // Wake just after the next whole second of the countdown, so digits change on time.
      const left = endsAt - t;
      timer = setTimeout(tick, left > 0 ? (left % 1000 || 1000) + 5 : 1000);
    };
    tick();
    return () => clearTimeout(timer);
  }, [endsAt]);
  return endsAt == null ? 0 : Math.max(0, endsAt - now);
}

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600),
    m = Math.floor((total % 3600) / 60),
    s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
