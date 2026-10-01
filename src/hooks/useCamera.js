import { useEffect, useRef, useCallback } from 'react'

// ── useCamera ──────────────────────────────────────────────────────────────────
// Handles all input: WASD keys, mouse look, ESC, "/" console shortcut.
// Calls back into the scene hook via setKey / setLook / handleCanvasClick.

export function useCamera({ canvasRef, entered, onEnter, onExit, onConsole, setKey, setLook, handleCanvasClick }) {
  const yawRef   = useRef(0)
  const pitchRef = useRef(0)

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 'arrowup')    setKey('w', true)
      if (k === 's' || k === 'arrowdown')  setKey('s', true)
      if (k === 'a' || k === 'arrowleft')  setKey('a', true)
      if (k === 'd' || k === 'arrowright') setKey('d', true)
      if (k === 'q') setKey('q', true)
      if (k === 'e') setKey('e', true)
      if (k === 'escape' && entered) onExit?.()
      if (k === '/') { e.preventDefault(); onConsole?.() }
    }
    const up = (e) => {
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 'arrowup')    setKey('w', false)
      if (k === 's' || k === 'arrowdown')  setKey('s', false)
      if (k === 'a' || k === 'arrowleft')  setKey('a', false)
      if (k === 'd' || k === 'arrowright') setKey('d', false)
      if (k === 'q') setKey('q', false)
      if (k === 'e') setKey('e', false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [entered, onExit, onConsole, setKey])

  // ── mouse look (position-based, no drag needed) ───────────────────────────
  useEffect(() => {
    if (!entered) return
    const move = (e) => {
      const cx = window.innerWidth  / 2
      const cy = window.innerHeight / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      yawRef.current   = -dx * 0.0028
      pitchRef.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, -dy * 0.0022))
      setLook(yawRef.current, pitchRef.current)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [entered, setLook])

  // ── pointer lock (optional enhancement on dblclick) ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dbl = () => { if (entered) canvas.requestPointerLock?.() }
    canvas.addEventListener('dblclick', dbl)

    const plMove = (e) => {
      if (document.pointerLockElement !== canvas) return
      yawRef.current   -= e.movementX * 0.002
      pitchRef.current -= e.movementY * 0.002
      pitchRef.current  = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitchRef.current))
      setLook(yawRef.current, pitchRef.current)
    }
    document.addEventListener('mousemove', plMove)
    return () => {
      canvas.removeEventListener('dblclick', dbl)
      document.removeEventListener('mousemove', plMove)
    }
  }, [canvasRef, entered, setLook])

  // ── canvas click ──────────────────────────────────────────────────────────
  const onCanvasClick = useCallback(() => {
    if (!entered) { onEnter?.(); return }
    handleCanvasClick?.()
  }, [entered, onEnter, handleCanvasClick])

  return { onCanvasClick }
}
