import { useEffect, useRef, useCallback } from 'react'

// ── useCamera ──────────────────────────────────────────────────────────────────
// All input: WASD / arrows, mouse look, pointer lock, touch drag, ESC.
// Talks to the scene through the controls returned by useScene.

const MOVE_KEYS = {
  w: 'w', arrowup: 'w',
  s: 's', arrowdown: 's',
  a: 'a', arrowleft: 'a',
  d: 'd', arrowright: 'd',
  q: 'q',
  e: 'e',
}

const MOUSE_YAW = 0.0028
const MOUSE_PITCH = 0.0022
const LOCK_SENS = 0.002
const TOUCH_SENS = 0.005
const TAP_MAX_MOVE = 10
const TAP_MAX_MS = 400
const GHOST_CLICK_MS = 700

function isTyping(e) {
  const el = e.target
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

export function useCamera({ canvasRef, entered, onEnter, onExit, setKey, setLook, nudgeLook, rebaseLook, pick }) {
  const tracking = useRef(false)
  const lastTap = useRef(0)

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (MOVE_KEYS[k]) setKey(MOVE_KEYS[k], true)
      if (k === 'escape' && entered) onExit?.()
    }
    // key-up always clears, so a key can't stick when focus moves into the console mid-press
    const up = (e) => {
      const k = e.key.toLowerCase()
      if (MOVE_KEYS[k]) setKey(MOVE_KEYS[k], false)
    }
    const releaseAll = () => Object.values(MOVE_KEYS).forEach((k) => setKey(k, false))
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', releaseAll)
    }
  }, [entered, onExit, setKey])

  // ── mouse look ────────────────────────────────────────────────────────────
  // Default: view follows the cursor's offset from screen centre while it is over the canvas.
  // Whenever the cursor (re)joins the canvas — on entering, or coming back from the HUD, panel or
  // console — the offset is rebased instead of applied, so the view never snaps.
  // Double-click the canvas for pointer lock (relative look, unlimited turn).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    tracking.current = false

    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      if (document.pointerLockElement === canvas) {
        nudgeLook(-e.movementX * LOCK_SENS, -e.movementY * LOCK_SENS)
        return
      }
      const yaw = -(e.clientX - window.innerWidth / 2) * MOUSE_YAW
      const pitch = -(e.clientY - window.innerHeight / 2) * MOUSE_PITCH
      if (!entered || e.target !== canvas) {
        tracking.current = false
        return
      }
      if (tracking.current) setLook(yaw, pitch)
      else rebaseLook(yaw, pitch)
      tracking.current = true
    }
    const lockChange = () => {
      // leaving pointer lock: the next cursor move rebases, so the view doesn't jump
      if (document.pointerLockElement !== canvas) tracking.current = false
    }
    const dbl = () => {
      if (!entered) return
      try {
        const req = canvas.requestPointerLock?.()
        req?.catch?.(() => {})
      } catch {
        // pointer lock is an optional enhancement
      }
    }

    window.addEventListener('pointermove', move)
    document.addEventListener('pointerlockchange', lockChange)
    canvas.addEventListener('dblclick', dbl)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerlockchange', lockChange)
      canvas.removeEventListener('dblclick', dbl)
    }
  }, [canvasRef, entered, setLook, nudgeLook, rebaseLook])

  // ── touch: drag to look, tap to select ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let touch = null

    const start = (e) => {
      if (e.touches.length !== 1) { touch = null; return }
      const t = e.touches[0]
      touch = { x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, time: Date.now(), moved: false }
    }
    const move = (e) => {
      if (!touch || e.touches.length !== 1) return
      e.preventDefault()
      const t = e.touches[0]
      if (Math.hypot(t.clientX - touch.startX, t.clientY - touch.startY) > TAP_MAX_MOVE) touch.moved = true
      if (entered) nudgeLook((t.clientX - touch.x) * TOUCH_SENS, (t.clientY - touch.y) * TOUCH_SENS)
      touch.x = t.clientX
      touch.y = t.clientY
    }
    const end = () => {
      if (!touch) return
      const { x, y, moved, time } = touch
      touch = null
      if (moved || Date.now() - time > TAP_MAX_MS) return
      lastTap.current = Date.now()
      if (!entered) { onEnter?.(); return }
      pick((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1)
    }

    canvas.addEventListener('touchstart', start, { passive: true })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)
    const cancel = () => { touch = null }
    canvas.addEventListener('touchcancel', cancel)
    return () => {
      canvas.removeEventListener('touchcancel', cancel)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [canvasRef, entered, onEnter, nudgeLook, pick])

  // ── canvas click (mouse) ──────────────────────────────────────────────────
  const onCanvasClick = useCallback(() => {
    // a tap already handled by the touch path is followed by a synthetic click
    if (Date.now() - lastTap.current < GHOST_CLICK_MS) return
    if (!entered) { onEnter?.(); return }
    pick(0, 0)
  }, [entered, onEnter, pick])

  return { onCanvasClick }
}
