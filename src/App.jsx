import { useRef, useState, useCallback, useEffect } from 'react'
import { useScene } from './hooks/useScene'
import { useCamera } from './hooks/useCamera'
import { HUD } from './components/HUD'
import { Panel } from './components/Panel'
import { Console } from './components/Console'
import { LockOverlay, Crosshair, ControlsHint, FlyBar } from './components/LockOverlay'
import { NODE_MAP } from './data/graph'

const HINT_MS = 8000
const COMPACT_QUERY = '(max-width: 720px)'
const PANEL_WIDTH = 440
const CAMERA_FOV_TAN = Math.tan((70 * Math.PI) / 360)

// How far to turn the camera so the focused node sits in the part of the canvas the panel leaves free.
function viewBiasFor(panelOpen) {
  if (!panelOpen) return [0, 0]
  const h = window.innerHeight
  if (window.matchMedia(COMPACT_QUERY).matches) {
    // bottom sheet: push the node into the upper part of the screen
    return [0, -Math.atan(0.55 * CAMERA_FOV_TAN)]
  }
  // side panel: shift the node left by half the panel width
  return [-Math.atan((PANEL_WIDTH * CAMERA_FOV_TAN) / h), 0]
}

export default function App() {
  const canvasRef = useRef(null)

  const [entered,     setEntered]     = useState(false)
  const [currentNode, setCurrentNode] = useState('core')
  const [openPanel,   setOpenPanel]   = useState('core')
  const [panelOpen,   setPanelOpen]   = useState(true)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [flying,      setFlying]      = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const hintShown = useRef(false)

  // Free look: inside the 3D space with nothing open. A panel takes the cursor back and holds the view still.
  const lookMode = entered && !panelOpen && !webglFailed

  const onArrive = useCallback((id) => {
    setCurrentNode(id)
    setOpenPanel(id)
    setPanelOpen(true)
  }, [])

  const onInitError = useCallback(() => setWebglFailed(true), [])

  const { setLookEnabled, setKey, nudgeLook, setViewBias, getPosition, flyToNode, pick } = useScene({
    canvasRef,
    onArrive,
    onHover: setHoveredNode,
    onFlyChange: setFlying,
    onInitError,
  })

  const handleExit = useCallback(() => setEntered(false), [])

  const { onCanvasClick, capture, captured, captureSupported } = useCamera({
    canvasRef,
    entered,
    lookMode,
    onExit: handleExit,
    setKey,
    nudgeLook,
    pick,
  })

  useEffect(() => {
    setLookEnabled(lookMode)
  }, [lookMode, setLookEnabled])

  // Entering drops the visitor straight into free look, so the intro panel steps aside.
  const handleEnter = useCallback(() => {
    if (webglFailed) return
    setEntered(true)
    setPanelOpen(false)
    capture()
  }, [capture, webglFailed])

  // Jumping to a section (top nav, panel buttons, console) opens its panel straight away,
  // and works from the splash screen too.
  const handleNav = useCallback((id) => {
    if (!NODE_MAP[id]) return
    if (!webglFailed) setEntered(true)
    setOpenPanel(id)
    setPanelOpen(true)
    flyToNode(id)
  }, [flyToNode, webglFailed])

  // Closing a panel hands control back to the mouse.
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    if (entered) capture()
  }, [entered, capture])

  // show the controls hint the first time the visitor gets free look after entering
  useEffect(() => {
    if (!entered) hintShown.current = false
  }, [entered])

  useEffect(() => {
    if (!lookMode || hintShown.current) return
    hintShown.current = true
    setHintVisible(true)
    const id = setTimeout(() => setHintVisible(false), HINT_MS)
    return () => {
      clearTimeout(id)
      setHintVisible(false)
    }
  }, [lookMode])

  useEffect(() => {
    const apply = () => setViewBias(...viewBiasFor(panelOpen))
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [panelOpen, setViewBias])

  const showOverlay = !entered && !webglFailed
  const crosshairLabel =
    captureSupported && !captured ? 'click to look around' :
    hoveredNode ? `${NODE_MAP[hoveredNode]?.label} · click to open` : null

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label="3D node graph of portfolio sections. Use the navigation bar above to open a section."
        style={{ position: 'fixed', inset: 0, display: 'block', touchAction: 'none' }}
        onClick={onCanvasClick}
      />

      {/* CRT scanlines over everything; the vignette sits under the UI so it only shades the scene */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,.05) 3px,transparent 4px)',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.72) 100%)',
      }} />

      {showOverlay && <LockOverlay onEnter={handleEnter} />}

      {lookMode && <Crosshair label={crosshairLabel} />}

      <FlyBar visible={flying} />

      <HUD currentNode={currentNode} getPosition={getPosition} onNav={handleNav} />

      {lookMode && hintVisible && <ControlsHint />}

      {panelOpen && (
        <Panel
          nodeId={openPanel}
          onClose={closePanel}
          onNav={handleNav}
          notice={webglFailed ? 'WebGL is unavailable in this browser, so the 3D view is off. Everything else works.' : null}
        />
      )}

      <Console onGoto={handleNav} />
    </>
  )
}
