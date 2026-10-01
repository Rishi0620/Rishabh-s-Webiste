import { useEffect, useRef, useState } from 'react'
import styles from './HUD.module.css'
import { NODES } from '../data/graph'
import { useCssVarHeight } from '../hooks/useCssVarHeight'

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const p = n => String(n).padStart(2, '0')
  return (
    <span className={styles.tabular}>
      {`${now.getUTCFullYear()}-${p(now.getUTCMonth()+1)}-${p(now.getUTCDate())} ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}Z`}
    </span>
  )
}

function LatencyBars() {
  const [bars, setBars] = useState(() => Array.from({length:8}, () => 30+Math.random()*60))
  useEffect(() => {
    const id = setInterval(() => setBars(Array.from({length:8}, () => 20+Math.random()*80)), 700)
    return () => clearInterval(id)
  }, [])
  return (
    <div className={styles.latBar} aria-hidden="true">
      {bars.map((h, i) => (
        <span key={i} style={{height:`${h}%`, background: h > 85 ? 'var(--amb)' : 'var(--sig)'}} />
      ))}
    </div>
  )
}

// Polls the camera a few times a second instead of re-rendering the app every frame.
function Position({ getPosition }) {
  const [text, setText] = useState('x:0.0 y:0.0 z:22.0')
  useEffect(() => {
    const id = setInterval(() => {
      const p = getPosition()
      if (p) setText(`x:${p.x.toFixed(1)} y:${p.y.toFixed(1)} z:${p.z.toFixed(1)}`)
    }, 150)
    return () => clearInterval(id)
  }, [getPosition])
  return <span className={`${styles.dim} ${styles.tabular} ${styles.wideOnly}`}>{text}</span>
}

export function HUD({ currentNode, getPosition, onNav }) {
  const ref = useRef(null)
  useCssVarHeight(ref, '--hud-h')

  return (
    <header ref={ref} className={styles.hud}>
      {/* row 1 — system info */}
      <div className={styles.row1}>
        <div className={styles.left}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2" fill="var(--sig)"/>
            <circle cx="2" cy="3" r="1.4" fill="rgba(124,255,178,.5)"/>
            <circle cx="14" cy="3" r="1.4" fill="rgba(124,255,178,.5)"/>
            <circle cx="2" cy="13" r="1.4" fill="rgba(184,156,255,.45)"/>
            <circle cx="14" cy="13" r="1.4" fill="rgba(184,156,255,.45)"/>
            <line x1="8" y1="8" x2="2" y2="3" stroke="rgba(124,255,178,.3)" strokeWidth=".7"/>
            <line x1="8" y1="8" x2="14" y2="3" stroke="rgba(124,255,178,.3)" strokeWidth=".7"/>
            <line x1="8" y1="8" x2="2" y2="13" stroke="rgba(184,156,255,.25)" strokeWidth=".7"/>
            <line x1="8" y1="8" x2="14" y2="13" stroke="rgba(184,156,255,.25)" strokeWidth=".7"/>
          </svg>
          <span className={styles.brand}>UserOS 1.0</span>
          <span className={styles.sep}>|</span>
          <span className={styles.sig}>/{currentNode.toUpperCase()}</span>
          <span className={`${styles.sep} ${styles.wideOnly}`}>|</span>
          <Position getPosition={getPosition} />
        </div>
        <div className={styles.right}>
          <span className={styles.wideOnly}><LatencyBars /></span>
          <span className={`${styles.sig} ${styles.wideOnly}`}>4ms</span>
          <span className={`${styles.sep} ${styles.wideOnly}`}>|</span>
          <span className={styles.wideOnly}><Clock /></span>
          <span className={`${styles.sep} ${styles.wideOnly}`}>|</span>
          <span className={styles.pulDot} />
          <span className={styles.sig}>ONLINE</span>
        </div>
      </div>

      {/* row 2 — nav */}
      <div className={styles.row2}>
        <nav className={styles.nav} aria-label="Sections">
          {NODES.map(({ id }) => (
            <button
              key={id}
              className={`${styles.navBtn} ${id === currentNode ? styles.active : ''}`}
              aria-current={id === currentNode ? 'page' : undefined}
              onClick={() => onNav(id)}
            >
              / {id.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className={styles.chips} aria-hidden="true">
          <span className={styles.chip}>
            <span className={styles.dot} style={{background:'var(--sig)'}}/>SIGNAL.LOCK
          </span>
          <span className={styles.chip} style={{color:'var(--vio)',borderColor:'rgba(184,156,255,.2)'}}>
            <span className={styles.dot} style={{background:'var(--vio)'}}/>OBSERVER
          </span>
          <span className={styles.chip} style={{color:'var(--amb)',borderColor:'rgba(255,199,106,.2)'}}>
            <span className={styles.dot} style={{background:'var(--amb)'}}/>3D.SPACE
          </span>
        </div>
      </div>
    </header>
  )
}
