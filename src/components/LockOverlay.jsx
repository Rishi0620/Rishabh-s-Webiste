import styles from './LockOverlay.module.css'

export function LockOverlay({ onEnter }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.title}>UserOS 1.0</div>
      <div className={styles.sub}>System Architect's Command Center · Rishabh Mehta</div>
      <button className={styles.btn} onClick={onEnter}>ENTER SYSTEM</button>
      <div className={styles.keys}>
        <kbd>W A S D</kbd> move ·
        <kbd>Mouse</kbd> look ·
        <kbd>Click</kbd> node to open ·
        <kbd>ESC</kbd> exit
      </div>
    </div>
  )
}

export function Crosshair() {
  return <div className={styles.xhair} />
}

export function ControlsHint() {
  return (
    <div className={styles.hint}>
      <span><kbd className={styles.kbd}>W A S D</kbd> move</span>
      <span><kbd className={styles.kbd}>Mouse</kbd> look</span>
      <span><kbd className={styles.kbd}>Click</kbd> fly / open node</span>
      <span><kbd className={styles.kbd}>ESC</kbd> exit</span>
      <span><kbd className={styles.kbd}>/</kbd> console</span>
    </div>
  )
}

export function FlyBar({ visible }) {
  return (
    <div className={`${styles.flyBar} ${visible ? styles.flyBarVisible : ''}`}>
      <span className={styles.flyDot} />
      TRAVELING
    </div>
  )
}
