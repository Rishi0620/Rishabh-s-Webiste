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

  const onArrive = useCallback((id) => {
    setCurrentNode(id)
    setOpenPanel(id)
    setPanelOpen(true)
  }, [])

  const onInitError = useCallback(() => setWebglFailed(true), [])

  const { enter, exit, setKey, setLook, nudgeLook, rebaseLook, setViewBias, getPosition, flyToNode, pick } = useScene({
    canvasRef,
    onArrive,
    onHover: setHoveredNode,
    onFlyChange: setFlying,
    onInitError,
  })

  const handleEnter = useCallback(() => {
    if (webglFailed) return
    setEntered(true)
    enter()
  }, [enter, webglFailed])
  const handleExit = useCallback(() => {
    setEntered(false)
    exit()
    if (document.pointerLockElement) document.exitPointerLock?.()
  }, [exit])

  const { onCanvasClick } = useCamera({
    canvasRef,
    entered,
    onEnter: handleEnter,
    onExit: handleExit,
    setKey,
    setLook,
    nudgeLook,
    rebaseLook,
    pick,
  })

  // show the controls hint for a few seconds each time the visitor enters
  useEffect(() => {
    if (!entered) { setHintVisible(false); return }
    setHintVisible(true)
    const id = setTimeout(() => setHintVisible(false), HINT_MS)
    return () => clearTimeout(id)
  }, [entered])

  useEffect(() => {
    const apply = () => setViewBias(...viewBiasFor(panelOpen))
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [panelOpen, setViewBias])

  const handlePanelNav = useCallback((id) => {
    setOpenPanel(id)
    setPanelOpen(true)
    flyToNode(id)
  }, [flyToNode])

  const closePanel = useCallback(() => setPanelOpen(false), [])

  const showOverlay = !entered && !webglFailed
  // no "click to open" prompt for the node whose panel is already showing
  const alreadyOpen = panelOpen && hoveredNode === openPanel
  const crosshairLabel = hoveredNode && !alreadyOpen ? NODE_MAP[hoveredNode]?.label : null

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label="3D node graph of portfolio sections. Use the navigation bar above to open a section."
        style={{ position: 'fixed', inset: 0, display: 'block', touchAction: 'none', cursor: entered ? 'none' : 'default' }}
        onClick={onCanvasClick}
      />

      {/* CRT scanlines + vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,.05) 3px,transparent 4px)',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.72) 100%)',
      }} />

      {showOverlay && <LockOverlay onEnter={handleEnter} />}

      {entered && <Crosshair label={crosshairLabel} />}

      <FlyBar visible={flying} />

      <HUD currentNode={currentNode} getPosition={getPosition} onNav={flyToNode} />

      {entered && hintVisible && <ControlsHint />}

      {panelOpen && (
        <Panel
          nodeId={openPanel}
          onClose={closePanel}
          onNav={handlePanelNav}
          notice={webglFailed ? 'WebGL is unavailable in this browser, so the 3D view is off. Everything else works.' : null}
        />
      )}

      <Console onGoto={flyToNode} />
    </>
  )
}
