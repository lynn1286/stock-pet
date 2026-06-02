import { useEffect, useState, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface StockState {
  price: number;
  change_pct: number;
  name: string;
  symbol: string;
  status: string;
}

/* ── 小螃蟹 SVG ── */

function Crab({ mood }: { mood: 'up' | 'down' | 'flat' }) {
  const c = mood === 'up' ? '#4ade80' : mood === 'down' ? '#f87171' : '#fb923c';
  const s = mood === 'up' ? '#22c55e' : mood === 'down' ? '#ef4444' : '#f97316';
  const cheek = mood === 'up' ? 0.4 : mood === 'down' ? 0.1 : 0.2;

  return (
    <svg viewBox="0 0 64 64" fill="none">
      {mood === 'up' ? (
        <>
          <ellipse cx="14" cy="16" rx="7" ry="5" fill={c} stroke={s} strokeWidth="1.2" transform="rotate(-35 14 16)" />
          <ellipse cx="10" cy="12" rx="5" ry="3.5" fill={c} stroke={s} strokeWidth="1" transform="rotate(-50 10 12)" />
          <ellipse cx="50" cy="16" rx="7" ry="5" fill={c} stroke={s} strokeWidth="1.2" transform="rotate(35 50 16)" />
          <ellipse cx="54" cy="12" rx="5" ry="3.5" fill={c} stroke={s} strokeWidth="1" transform="rotate(50 54 12)" />
        </>
      ) : mood === 'down' ? (
        <>
          <ellipse cx="22" cy="20" rx="7" ry="5" fill={c} stroke={s} strokeWidth="1.2" transform="rotate(15 22 20)" />
          <ellipse cx="42" cy="20" rx="7" ry="5" fill={c} stroke={s} strokeWidth="1.2" transform="rotate(-15 42 20)" />
        </>
      ) : (
        <>
          <ellipse cx="10" cy="34" rx="7" ry="5" fill={c} stroke={s} strokeWidth="1.2" transform="rotate(-10 10 34)" />
          <ellipse cx="6" cy="30" rx="5" ry="3.5" fill={c} stroke={s} strokeWidth="1" transform="rotate(-25 6 30)" />
          <ellipse cx="54" cy="34" rx="7" ry="5" fill={c} stroke={s} strokeWidth="1.2" transform="rotate(10 54 34)" />
          <ellipse cx="58" cy="30" rx="5" ry="3.5" fill={c} stroke={s} strokeWidth="1" transform="rotate(25 58 30)" />
        </>
      )}
      <ellipse cx="32" cy="38" rx="17" ry="15" fill={c} stroke={s} strokeWidth="1.5" />
      <ellipse cx="32" cy="41" rx="11" ry="9" fill="white" opacity="0.2" />
      <rect x="25" y="22" width="2.5" height="8" rx="1.2" fill={c} stroke={s} strokeWidth="1" />
      <rect x="36.5" y="22" width="2.5" height="8" rx="1.2" fill={c} stroke={s} strokeWidth="1" />
      <circle cx="26.2" cy="20" r="3.5" fill="white" stroke={s} strokeWidth="1" />
      <circle cx="37.8" cy="20" r="3.5" fill="white" stroke={s} strokeWidth="1" />
      {mood === 'down' ? (
        <>
          <circle cx="26.2" cy="21" r="1.8" fill="#1e1e2e" />
          <circle cx="37.8" cy="21" r="1.8" fill="#1e1e2e" />
        </>
      ) : (
        <>
          <circle cx="27" cy="19.5" r="1.8" fill="#1e1e2e" />
          <circle cx="38.5" cy="19.5" r="1.8" fill="#1e1e2e" />
        </>
      )}
      <circle cx="27.8" cy="18.5" r="0.7" fill="white" />
      <circle cx="39.3" cy="18.5" r="0.7" fill="white" />
      {mood === 'up' ? (
        <path d="M27 36 Q32 41 37 36" stroke="#c0392b" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      ) : mood === 'down' ? (
        <path d="M27 39 Q32 35 37 39" stroke="#c0392b" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M28 36 Q32 39 36 36" stroke="#c0392b" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      )}
      <circle cx="22" cy="34" r="2.5" fill="#ff6b6b" opacity={cheek} />
      <circle cx="42" cy="34" r="2.5" fill="#ff6b6b" opacity={cheek} />
      <line x1="18" y1="46" x2="12" y2="54" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="21" y1="48" x2="15" y2="56" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="46" y1="46" x2="52" y2="54" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="43" y1="48" x2="49" y2="56" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── 主组件 ── */

export default function Pet() {
  const [stock, setStock] = useState<StockState | null>(null);
  const [anim, setAnim] = useState('anim-breathe');
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten = listen<StockState>('stock-state', (e) => {
      const s = e.payload;
      setStock(s);
      setAnim(s.status === 'up' ? 'anim-bob' : s.status === 'down' ? 'anim-shake' : 'anim-breathe');
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const handlePointerDown = useCallback(async (e: React.PointerEvent) => {
    if (!rootRef.current) return;
    rootRef.current.setPointerCapture(e.pointerId);
    try { await getCurrentWindow().startDragging(); } catch {}
  }, []);

  const mood = stock?.status === 'up' ? 'up' : stock?.status === 'down' ? 'down' : 'flat';
  const glowColor = mood === 'up' ? 'rgba(74,222,128,0.5)' : mood === 'down' ? 'rgba(248,113,113,0.5)' : 'rgba(156,163,175,0.3)';
  const glowColorStrong = mood === 'up' ? 'rgba(74,222,128,0.8)' : mood === 'down' ? 'rgba(248,113,113,0.8)' : 'rgba(156,163,175,0.5)';
  const textColor = mood === 'up' ? '#4ade80' : mood === 'down' ? '#f87171' : '#9ca3af';

  return (
    <div ref={rootRef} className="pet-root" onPointerDown={handlePointerDown}>
      {/* 光晕：涨跌通过颜色和强度表示 */}
      <div
        className="glow"
        style={{
          background: `radial-gradient(circle, ${glowColorStrong} 0%, ${glowColor} 40%, transparent 70%)`,
        }}
      />

      {/* 螃蟹 */}
      <div
        className={`crab ${anim}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Crab mood={mood} />
      </div>

      {/* Hover 气泡 */}
      {hovered && stock && (
        <div className="bubble" style={{ borderColor: glowColor }}>
          <div className="bubble-name">{stock.name}</div>
          <div className="bubble-price" style={{ color: textColor }}>{stock.price.toFixed(2)}</div>
          <div className="bubble-change" style={{ color: textColor }}>
            {stock.change_pct > 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}
