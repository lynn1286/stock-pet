import { useUpdater } from '../../hooks/useUpdater';

const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function UpdateBadge() {
  const updater = useUpdater();
  const { phase, progress, availableVersion } = updater;

  const visible =
    updater.enabled &&
    (phase === 'available' ||
      phase === 'downloading' ||
      phase === 'ready' ||
      (phase === 'error' && availableVersion));

  if (!visible) {
    return null;
  }

  const isUpdating = phase === 'downloading' || phase === 'ready';
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

  function handleClick() {
    if (phase === 'available' || phase === 'error') {
      void updater.downloadAndInstall();
    }
  }

  return (
    <button
      type="button"
      className={`s-update-badge${isUpdating ? ' s-update-badge--progress' : ''}`}
      onClick={handleClick}
      disabled={isUpdating}
      aria-label={isUpdating ? `正在更新 ${progress}%` : `有新版本 v${availableVersion}，点击更新`}
      title={isUpdating ? `更新中 ${progress}%` : `有新版本 v${availableVersion}`}
    >
      {isUpdating ? (
        <svg className="s-update-badge-ring" viewBox="0 0 28 28" aria-hidden>
          <circle className="s-update-badge-ring-track" cx="14" cy="14" r={RING_RADIUS} />
          <circle
            className="s-update-badge-ring-progress"
            cx="14"
            cy="14"
            r={RING_RADIUS}
            style={{ strokeDashoffset: ringOffset }}
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 22v-9" />
          <path d="M8 12l4-4 4 4" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      )}
    </button>
  );
}
