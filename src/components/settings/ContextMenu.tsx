import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  stockName: string
  onDelete: () => void
  onClose: () => void
}

export function ContextMenu({ x, y, stockName, onDelete, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 确保菜单不超出视口
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 160),
    top: Math.min(y, window.innerHeight - 100),
  }

  return (
    <div ref={ref} className="s-context-menu" style={menuStyle} role="menu">
      <button
        className="s-context-menu-item s-context-menu-delete"
        onClick={onDelete}
        role="menuitem"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        删除 {stockName}
      </button>
    </div>
  )
}
