import { useEffect, useRef, useState, useCallback } from 'react'

// ── useCamera ──────────────────────────────────────────────────────────────────
// All input: WASD / arrows, captured-mouse look, touch drag, ESC.
// Talks to the scene through the controls returned by useScene.
//
// lookMode = the visitor is inside the 3D space with no panel open. In that mode the cursor is
// captured (pointer lock) and mouse movement turns the camera with no limit, like a PC game.
// Opening a panel ends lookMode: the cursor comes back and the view holds still.

const MOVE_KEYS = {
  w: 'w', arrowup: 'w',
  s: 's', arrowdown: 's',
  a: 'a', arrowleft: 'a',
  d: 'd', arrowright: 'd',
  q: 'q',
  e: 'e',
}

const LOOK_SENS = 0.0022
const TOUCH_SENS = 0.005
const TAP_MAX_MOVE = 10
const TAP_MAX_MS = 400
const GHOST_CLICK_MS = 700

function isTyping(e) {
  const el = e.target
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

function canCapture(canvas) {
  return typeof canvas?.requestPointerLock === 'function' && window.matchMedia('(pointer: fine)').matches
}

const toNdcX = (x) => (x / window.innerWidth) * 2 - 1
const toNdcY = (y) => -(y / window.innerHeight) * 2 + 1

export function useCamera({ canvasRef, entered, lookMode, onExit, setKey, nudgeLook, pick }) {
  const [captured, setCaptured] = useState(false)
  const [captureSupported, setCaptureSupported] = useState(false)
  const lastTap = useRef(0)
  const wantCapture = useRef(false)
  const expectRelease = useRef(false)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const lookModeRef = useRef(lookMode)
  lookModeRef.current = lookMode

  // Must be called from a click or key handler: browsers only capture the cursor on a user gesture.
  const capture = useCallback(() => {
    const canvas = canvasRef.current
    if (!canCapture(canvas)) return
    wantCapture.current = true
    if (document.pointerLockElement === canvas) return
    try {
      const req = canvas.requestPointerLock()
      req?.catch?.(() => {})
    } catch {
      // refused (e.g. straight after Esc); the next click on the canvas retries
    }
  }, [canvasRef])

  const release = useCallback(() => {
    wantCapture.current = false
    if (document.pointerLockElement === canvasRef.current) {
      expectRelease.current = true
      document.exitPointerLock()
    }
  }, [canvasRef])

  useEffect(() => {
    if (!lookMode) release()
  }, [lookMode, release])

  useEffect(() => {
    setCaptureSupported(canCapture(canvasRef.current))
  }, [canvasRef])

  // ── captured mouse ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const move = (e) => {
      if (document.pointerLockElement !== canvas) return
      nudgeLook(-e.movementX * LOOK_SENS, -e.movementY * LOOK_SENS)
    }
    const lockChange = () => {
      const locked = document.pointerLockElement === canvas
      setCaptured(locked)
      if (locked) {
        // granted after a panel opened or the visitor left: hand the cursor straight back
        if (!wantCapture.current) release()
        return
      }
      if (expectRelease.current) {
        expectRelease.current = false
        return
      }
      // the browser freed the cursor itself (Esc, or the window lost focus): leave the 3D space
      if (wantCapture.current) {
        wantCapture.current = false
        onExitRef.current?.()
      }
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('pointerlockchange', lockChange)
    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('pointerlockchange', lockChange)
    }
  }, [canvasRef, nudgeLook, release])

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (MOVE_KEYS[k]) setKey(MOVE_KEYS[k], true)
      // only reaches us when the cursor isn't captured; a captured Esc arrives as a lock change
      if (k === 'escape' && entered) onExitRef.current?.()
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
  }, [entered, setKey])

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
      nudgeLook((t.clientX - touch.x) * TOUCH_SENS, (t.clientY - touch.y) * TOUCH_SENS)
      touch.x = t.clientX
      touch.y = t.clientY
    }
    const end = () => {
      if (!touch) return
      const { x, y, moved, time } = touch
      touch = null
      if (!entered || moved || Date.now() - time > TAP_MAX_MS) return
      lastTap.current = Date.now()
      // with a panel open only nodes respond, so a stray tap can't send the camera off
      pick(toNdcX(x), toNdcY(y), !lookModeRef.current)
    }
    const cancel = () => { touch = null }

    canvas.addEventListener('touchstart', start, { passive: true })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)
    canvas.addEventListener('touchcancel', cancel)
    return () => {
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
      canvas.removeEventListener('touchcancel', cancel)
    }
  }, [canvasRef, entered, nudgeLook, pick])

  // ── canvas click (mouse) ──────────────────────────────────────────────────
  const onCanvasClick = useCallback((e) => {
    // a tap already handled by the touch path is followed by a synthetic click
    if (Date.now() - lastTap.current < GHOST_CLICK_MS) return
    if (!entered) return
    const canvas = canvasRef.current
    if (lookMode) {
      // captured: the crosshair is the pointer
      if (document.pointerLockElement === canvas) { pick(0, 0); return }
      // not captured yet (the browser refused, or freed it): this click takes the cursor back
      if (canCapture(canvas)) { capture(); return }
    }
    // the cursor is visible, so act on whatever it clicked; with a panel open only nodes respond
    pick(toNdcX(e.clientX), toNdcY(e.clientY), !lookMode)
  }, [canvasRef, entered, lookMode, capture, pick])

  return { onCanvasClick, capture, captured, captureSupported }
}
