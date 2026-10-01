import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useScene } from './hooks/useScene'
import { useCamera } from './hooks/useCamera'
import { HUD } from './components/HUD'
import { Panel } from './components/Panel'
import { Console } from './components/Console'
import { LockOverlay, Crosshair, ControlsHint, FlyBar } from './components/LockOverlay'
import './index.css'

export default function App() {
  const canvasRef = useRef(null)

  // UI state
  const [entered,     setEntered]     = useState(false)
  const [currentNode, setCurrentNode] = useState('core')
  const [openPanel,   setOpenPanel]   = useState('core')
  const [panelOpen,   setPanelOpen]   = useState(true)
  const [position,    setPosition]    = useState({ x: 0, y: 0, z: 22 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const [flying,      setFlying]      = useState(false)
  const [hintVisible, setHintVisible] = useState(true)

  // Hide controls hint after 8s
  useEffect(() => {
    const id = setTimeout(() => setHintVisible(false), 8000)
    return () => clearTimeout(id)
  }, [])

  // Called when camera flies to a node and arrives
  const onNodeClick = useCallback((id) => {
    setCurrentNode(id)
    setOpenPanel(id)
    setPanelOpen(true)
    setFlying(false)
  }, [])

  // Fly to node (from HUD nav, panel buttons, console)
  const handleNav = useCallback((id) => {
    setFlying(true)
    flyToNode(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── scene hook ────────────────────────────────────────────────────────────
  const { enter, exit, setLook, setKey, flyToNode, handleCanvasClick } = useScene({
    canvasRef,
    onNodeClick,
    onHover: setHoveredNode,
    onPositionUpdate: useCallback((p) => setPosition({ x: p.x, y: p.y, z: p.z }), []),
  })

  const handleEnter = useCallback(() => { setEntered(true); enter() }, [enter])
  const handleExit  = useCallback(() => { setEntered(false); exit() }, [exit])

  const handleConsole = useCallback(() => {
    document.getElementById('useros-console-input')?.focus()
  }, [])

  // ── camera hook ───────────────────────────────────────────────────────────
  const { onCanvasClick } = useCamera({
    canvasRef,
    entered,
    onEnter:  handleEnter,
    onExit:   handleExit,
    onConsole: handleConsole,
    setKey,
    setLook,
    handleCanvasClick,
  })

  const handleNavAndFly = useCallback((id) => {
    setFlying(true)
    flyToNode(id)
  }, [flyToNode])

  return (
    <>
      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, display: 'block', cursor: entered ? 'none' : 'default' }}
        onClick={onCanvasClick}
      />

      {/* CRT + vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,.05) 3px,transparent 4px)',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.72) 100%)',
      }} />

      {/* Lock overlay */}
      {!entered && <LockOverlay onEnter={handleEnter} />}

      {/* Crosshair */}
      {entered && <Crosshair />}

      {/* Fly bar */}
      <FlyBar visible={flying} />

      {/* HUD */}
      <HUD
        currentNode={currentNode}
        position={position}
        onNav={handleNavAndFly}
      />

      {/* Controls hint */}
      {entered && hintVisible && <ControlsHint />}

      {/* Content panel */}
      {panelOpen && (
        <Panel
          nodeId={openPanel}
          onClose={() => setPanelOpen(false)}
          onNav={(id) => { handleNavAndFly(id); setOpenPanel(id); setPanelOpen(true) }}
        />
      )}

      {/* Console */}
      <Console onGoto={handleNavAndFly} />
    </>
  )
}
