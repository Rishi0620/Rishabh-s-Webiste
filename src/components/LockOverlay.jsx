import styles from './LockOverlay.module.css'
import { PROFILE } from '../data/content'

export function LockOverlay({ onEnter }) {
  return (
    <div className={styles.overlay} onClick={onEnter}>
      <div className={styles.title}>UserOS 1.0</div>
      <div className={styles.sub}>{PROFILE.name} · Software Engineer</div>
      <button className={styles.btn} autoFocus>ENTER SYSTEM</button>
      <div className={`${styles.keys} ${styles.mouseOnly}`}>
        <span><kbd>W A S D</kbd> move</span>
        <span><kbd>Mouse</kbd> look</span>
        <span><kbd>Click</kbd> node to open</span>
        <span><kbd>ESC</kbd> exit</span>
      </div>
      <div className={`${styles.keys} ${styles.touchOnly}`}>
        <span><kbd>Drag</kbd> look</span>
        <span><kbd>Tap</kbd> node to open</span>
        <span>or use the menu above</span>
      </div>
    </div>
  )
}

export function Crosshair({ label }) {
  return (
    <>
      <div className={styles.xhair} />
      {label && <div className={styles.xhairLabel}>{label} · click to open</div>}
    </>
  )
}

export function ControlsHint() {
  return (
    <div className={styles.hint}>
      <span className={styles.mouseOnly}><kbd className={styles.kbd}>W A S D</kbd> move</span>
      <span className={styles.mouseOnly}><kbd className={styles.kbd}>Mouse</kbd> look</span>
      <span className={styles.mouseOnly}><kbd className={styles.kbd}>Click</kbd> fly / open node</span>
      <span className={styles.mouseOnly}><kbd className={styles.kbd}>ESC</kbd> exit</span>
      <span className={styles.mouseOnly}><kbd className={styles.kbd}>/</kbd> console</span>
      <span className={styles.touchOnly}><kbd className={styles.kbd}>Drag</kbd> look</span>
      <span className={styles.touchOnly}><kbd className={styles.kbd}>Tap</kbd> fly / open node</span>
    </div>
  )
}

export function FlyBar({ visible }) {
  return (
    <div className={`${styles.flyBar} ${visible ? styles.flyBarVisible : ''}`} aria-hidden={!visible}>
      <span className={styles.flyDot} />
      TRAVELING
    </div>
  )
}
