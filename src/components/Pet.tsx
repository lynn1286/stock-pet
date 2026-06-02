import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface StockState {
  price: number;
  change_pct: number;
  name: string;
  symbol: string;
  secid: string;
  status: string;
}

type TradeStatus = 'trading' | 'rest' | 'sleep';
type Mood = 'up' | 'down' | 'flat' | 'coffee' | 'sleep';

function moodFromStatus(status?: string): Mood {
  if (status === 'up') return 'up';
  if (status === 'down') return 'down';
  return 'flat';
}

function Particles({ mood }: { mood: Mood }) {
  const particles = useMemo(() => {
    if (mood !== 'up') return [];
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${20 + Math.random() * 60}%`,
      top: `${15 + Math.random() * 50}%`,
      delay: `${Math.random() * 1.5}s`,
      size: 3 + Math.random() * 3,
    }));
  }, [mood]);

  if (mood !== 'up') return null;

  return (
    <div className="pet-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="pet-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            background: '#fbbf24',
            boxShadow: '0 0 4px rgba(251, 191, 36, 0.6)',
          }}
        />
      ))}
    </div>
  );
}

function Crab({ mood }: { mood: Mood }) {
  const bodyColor = mood === 'up' ? '#22c55e' : mood === 'down' ? '#ef4444' : mood === 'sleep' ? '#8b5cf6' : mood === 'coffee' ? '#f59e0b' : '#fbbf24';
  const bodyDark = mood === 'up' ? '#16a34a' : mood === 'down' ? '#dc2626' : mood === 'sleep' ? '#7c3aed' : mood === 'coffee' ? '#d97706' : '#d97706';
  const bodyLight = mood === 'up' ? '#86efac' : mood === 'down' ? '#fca5a5' : mood === 'sleep' ? '#c4b5fd' : mood === 'coffee' ? '#fde68a' : '#fde68a';
  const cheekOpacity = mood === 'up' ? 0.5 : mood === 'down' ? 0.15 : 0.3;

  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden>
      {/* 钳子 */}
      {mood === 'up' ? (
        <>
          <ellipse cx="12" cy="18" rx="9" ry="6" fill={bodyColor} stroke={bodyDark} strokeWidth="1.5" transform="rotate(-40 12 18)" />
          <ellipse cx="8" cy="14" rx="6" ry="4" fill={bodyColor} stroke={bodyDark} strokeWidth="1.2" transform="rotate(-55 8 14)" />
          <ellipse cx="68" cy="18" rx="9" ry="6" fill={bodyColor} stroke={bodyDark} strokeWidth="1.5" transform="rotate(40 68 18)" />
          <ellipse cx="72" cy="14" rx="6" ry="4" fill={bodyColor} stroke={bodyDark} strokeWidth="1.2" transform="rotate(55 72 14)" />
        </>
      ) : mood === 'down' ? (
        <>
          <ellipse cx="18" cy="32" rx="8" ry="5.5" fill={bodyColor} stroke={bodyDark} strokeWidth="1.5" transform="rotate(20 18 32)" />
          <ellipse cx="62" cy="32" rx="8" ry="5.5" fill={bodyColor} stroke={bodyDark} strokeWidth="1.5" transform="rotate(-20 62 32)" />
        </>
      ) : (
        <>
          <ellipse cx="10" cy="40" rx="8" ry="5.5" fill={bodyColor} stroke={bodyDark} strokeWidth="1.5" transform="rotate(-12 10 40)" />
          <ellipse cx="6" cy="36" rx="6" ry="4" fill={bodyColor} stroke={bodyDark} strokeWidth="1.2" transform="rotate(-28 6 36)" />
          <ellipse cx="70" cy="40" rx="8" ry="5.5" fill={bodyColor} stroke={bodyDark} strokeWidth="1.5" transform="rotate(12 70 40)" />
          <ellipse cx="74" cy="36" rx="6" ry="4" fill={bodyColor} stroke={bodyDark} strokeWidth="1.2" transform="rotate(28 74 36)" />
        </>
      )}

      {/* 身体 */}
      <ellipse cx="40" cy="46" rx="22" ry="18" fill={bodyColor} stroke={bodyDark} strokeWidth="2" />
      <ellipse cx="38" cy="42" rx="14" ry="10" fill={bodyLight} opacity="0.3" />
      <ellipse cx="40" cy="50" rx="14" ry="11" fill="white" opacity="0.2" />

      {/* 眼睛柄 */}
      <rect x="30" y="24" width="3.5" height="10" rx="1.8" fill={bodyColor} stroke={bodyDark} strokeWidth="1.2" />
      <rect x="46.5" y="24" width="3.5" height="10" rx="1.8" fill={bodyColor} stroke={bodyDark} strokeWidth="1.2" />

      {/* 眼睛 */}
      <circle cx="31.5" cy="22" r="5" fill="white" stroke={bodyDark} strokeWidth="1.5" />
      <circle cx="48.5" cy="22" r="5" fill="white" stroke={bodyDark} strokeWidth="1.5" />

      {/* 瞳孔 */}
      {mood === 'sleep' ? (
        <>
          <line x1="27" y1="22" x2="36" y2="22" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="44" y1="22" x2="53" y2="22" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : mood === 'down' ? (
        <>
          <circle cx="31.5" cy="23.5" r="2.5" fill="#1e1b4b" />
          <circle cx="48.5" cy="23.5" r="2.5" fill="#1e1b4b" />
        </>
      ) : (
        <>
          <circle cx="32.5" cy="21" r="2.5" fill="#1e1b4b" />
          <circle cx="49.5" cy="21" r="2.5" fill="#1e1b4b" />
        </>
      )}
      {mood !== 'sleep' && (
        <>
          <circle cx="33.5" cy="20" r="1" fill="white" />
          <circle cx="50.5" cy="20" r="1" fill="white" />
        </>
      )}

      {/* 嘴巴 */}
      {mood === 'up' ? (
        <path d="M33 52 Q40 58 47 52" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : mood === 'down' ? (
        <path d="M33 56 Q40 51 47 56" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : mood === 'sleep' ? (
        <ellipse cx="40" cy="54" rx="3" ry="2" fill="#9f1239" opacity="0.6" />
      ) : (
        <path d="M35 53 Q40 56 45 53" stroke="#9f1239" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )}

      {/* 腮红 */}
      <circle cx="24" cy="44" r="3.5" fill="#fb7185" opacity={cheekOpacity} />
      <circle cx="56" cy="44" r="3.5" fill="#fb7185" opacity={cheekOpacity} />

      {/* 腿 */}
      <line x1="22" y1="56" x2="14" y2="66" stroke={bodyDark} strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="58" x2="18" y2="68" stroke={bodyDark} strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="56" x2="66" y2="66" stroke={bodyDark} strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="58" x2="62" y2="68" stroke={bodyDark} strokeWidth="2" strokeLinecap="round" />

      {/* 咖啡状态 */}
      {mood === 'coffee' && (
        <g transform="translate(58, 28) rotate(15)">
          <rect x="0" y="0" width="10" height="12" rx="2" fill="#8B4513" stroke="#6B3410" strokeWidth="1" />
          <path d="M10 3 Q14 3 14 7 Q14 11 10 11" stroke="#6B3410" strokeWidth="1.2" fill="none" />
          <path d="M3 -2 Q4 -5 3 -8" stroke="#9CA3AF" strokeWidth="0.8" fill="none" opacity="0.5" />
          <path d="M7 -1 Q8 -4 7 -7" stroke="#9CA3AF" strokeWidth="0.8" fill="none" opacity="0.5" />
        </g>
      )}

      {/* 睡眠状态 */}
      {mood === 'sleep' && (
        <g opacity="0.6">
          <text x="56" y="18" fontSize="8" fill="#8b5cf6" fontFamily="sans-serif" fontWeight="bold">Z</text>
          <text x="60" y="12" fontSize="6" fill="#8b5cf6" fontFamily="sans-serif" fontWeight="bold">z</text>
          <text x="63" y="7" fontSize="5" fill="#8b5cf6" fontFamily="sans-serif" fontWeight="bold">z</text>
        </g>
      )}
    </svg>
  );
}

export default function Pet() {
  const [stock, setStock] = useState<StockState | null>(null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>('trading');
  const [anim, setAnim] = useState('anim-breathe');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistenTrade = listen<TradeStatus>('trade-status', (e) => {
      setTradeStatus(e.payload);
    });

    const unlistenStock = listen<StockState>('stock-state', (e) => {
      const s = e.payload;
      setStock(s);
      setAnim(s.status === 'up' ? 'anim-bob' : s.status === 'down' ? 'anim-shake' : 'anim-breathe');
    });

    return () => {
      unlistenTrade.then(fn => fn());
      unlistenStock.then(fn => fn());
    };
  }, []);

  const handlePointerDown = useCallback(async (e: React.PointerEvent) => {
    if (!rootRef.current) return;
    rootRef.current.setPointerCapture(e.pointerId);
    try { await getCurrentWindow().startDragging(); } catch {}
  }, []);

  const mood: Mood = tradeStatus === 'sleep'
    ? 'sleep'
    : tradeStatus === 'rest'
      ? 'coffee'
      : moodFromStatus(stock?.status);

  const currentAnim = tradeStatus === 'sleep'
    ? 'anim-sleep'
    : tradeStatus === 'rest'
      ? 'anim-coffee'
      : anim;

  return (
    <div
      ref={rootRef}
      className="pet-shell"
      data-mood={mood}
      onPointerDown={handlePointerDown}
    >
      <Particles mood={mood} />
      <div className={`pet-avatar ${currentAnim}`}>
        <Crab mood={mood} />
      </div>
    </div>
  );
}
