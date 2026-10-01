import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Console.module.css'
import { NODES, NODE_MAP } from '../data/graph'
import { CONTACT, PROFILE } from '../data/content'

const BOOT = [
  ['  ██╗   ██╗███████╗███████╗██████╗  ██████╗ ███████╗', 'ok', 0],
  ['  ██║   ██║███████╗█████╗  ██████╔╝██║   ██║███████╗', 'ok', 50],
  ['  ╚██████╔╝███████║███████╗██║  ██║╚██████╔╝███████║', 'ok', 100],
  ['                                           v1.0.0-rc4', 'dim', 150],
  ['', 'out', 200],
  ['[ BOOT ] Loading kernel modules:', 'sys', 280],
  ['  ├─ Personality ........................... OK', 'ok', 370],
  ['  ├─ O(1) Memory Management ............... ACTIVE', 'ok', 450],
  ['  ├─ Three.js 3D Runtime .................. OK', 'ok', 530],
  ['  ├─ CoffeeLevel.monitor .................. 76% ☕', 'ok', 610],
  ['  └─ ProcrastinationBlocker ............... ENABLED', 'ok', 690],
  ['', 'out', 740],
  ['[ NET  ] Signal lock acquired · latency 4ms ✓', 'ok', 820],
  ['System ready. Click canvas to enter 3D space.', 'sys', 900],
]

const HELP = [
  ['help',       'list available commands'],
  ['whoami',     'operator identity'],
  ['goto <node>', 'fly to node'],
  ['contact',    'open contact channels'],
  ['ls',         'list nodes'],
  ['sudo hire',  'elevated hire request (P0)'],
  ['sudo oc',    'toggle overclocked mode'],
  ['clear',      'clear console buffer'],
]

export function Console({ onGoto }) {
  const [lines, setLines]     = useState([])
  const [input, setInput]     = useState('')
  const [open, setOpen]       = useState(false)
  const [cmdStack, setCmdStack] = useState([])
  const [stackIdx, setStackIdx] = useState(-1)
  const bufRef   = useRef(null)
  const inputRef = useRef(null)

  // boot sequence
  useEffect(() => {
    BOOT.forEach(([text, cls, delay]) => {
      setTimeout(() => {
        setLines(prev => [...prev, { text, cls }])
      }, delay + 100)
    })
  }, [])

  // auto-scroll
  useEffect(() => {
    if (bufRef.current) bufRef.current.scrollTop = bufRef.current.scrollHeight
  }, [lines])

  const print = useCallback((text, cls = 'out') => {
    const arr = Array.isArray(text) ? text : [text]
    setLines(prev => [...prev, ...arr.map(t => ({ text: t, cls }))])
  }, [])

  const exec = useCallback((raw) => {
    const cmd = raw.trim()
    if (!cmd) return
    setCmdStack(s => [...s, cmd])
    setStackIdx(-1)
    print('❯ ' + cmd, 'in')

    const [head, ...rest] = cmd.toLowerCase().split(/\s+/)

    switch (head) {
      case 'help':
        print(['AVAILABLE COMMANDS:', ...HELP.map(([c, d]) => `  ${c.padEnd(16)} ${d}`), '', 'tip: ↑/↓ history · tab autocomplete'])
        break

      case 'whoami':
        print([
          `${PROFILE.name} :: ${PROFILE.role}`,
          `  degree    ▸ ${PROFILE.degree}`,
          `  gpa       ▸ ${PROFILE.gpa}`,
          `  ideology  ▸ ${PROFILE.philosophy}`,
        ])
        break

      case 'goto':
      case 'cd': {
        const target = rest[0]
        if (target && NODE_MAP[target]) {
          print(`traveling to /${target} ...`, 'sys')
          onGoto?.(target)
        } else {
          print(`node not found: ${target || '?'} — nodes: ${NODES.map(n => n.id).join(', ')}`, 'err')
        }
        break
      }

      case 'contact':
        print([
          'OPENING SECURE CHANNELS ...',
          `  email    ▸ ${CONTACT.email}`,
          `  github   ▸ ${CONTACT.github}`,
          `  linkedin ▸ ${CONTACT.linkedin}`,
          `  pgp      ▸ ${CONTACT.pgp}`,
          `  location ▸ ${CONTACT.location}`,
          'SLA: < 24h',
        ])
        break

      case 'ls':
        print('core/  about/  projects/  experience/  skills/  contact/  archive/')
        break

      case 'sudo':
        if (rest[0] === 'hire') {
          print([
            '[sudo] authenticating ... ✓',
            'ELEVATED REQUEST RECEIVED — P0',
            `  → routing → ${CONTACT.email}`,
            '  → SLA: < 24h',
            'operator has been paged.',
          ], 'ok')
        } else if (rest[0] === 'oc') {
          const on = document.body.style.filter
          document.body.style.filter = on ? '' : 'hue-rotate(32deg) saturate(1.15)'
          print(on ? 'overclocked mode disabled.' : 'OVERCLOCKED MODE — amber shift ⚡', 'ok')
        } else {
          print(`sudo: ${rest.join(' ') || '?'}: operation not permitted`, 'err')
        }
        break

      case 'clear':
        setLines([])
        break

      default:
        print(`zsh: command not found: ${head} — try 'help'`, 'err')
    }
  }, [print, onGoto])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      exec(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = stackIdx < 0 ? cmdStack.length - 1 : Math.max(0, stackIdx - 1)
      setStackIdx(next)
      setInput(cmdStack[next] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = stackIdx + 1
      if (next >= cmdStack.length) { setStackIdx(-1); setInput('') }
      else { setStackIdx(next); setInput(cmdStack[next]) }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const all = ['help', 'whoami', 'goto', 'contact', 'ls', 'sudo hire', 'sudo oc', 'clear', ...NODES.map(n => n.id)]
      const m = all.find(c => c.startsWith(input.toLowerCase()))
      if (m) setInput(m)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }, [input, cmdStack, stackIdx, exec])

  // global "/" shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const lineColor = (cls) => {
    switch (cls) {
      case 'sys': return 'var(--vio)'
      case 'ok':  return 'var(--sig)'
      case 'err': return 'var(--red)'
      case 'in':  return 'var(--txt)'
      case 'dim': return 'var(--dim)'
      default:    return 'rgba(216,236,224,.8)'
    }
  }

  return (
    <div className={styles.con}>
      <div className={styles.tab}>
        <div className={styles.tabLeft}>
          <span className={styles.onDot}>●</span>
          tty/0 · UserOS 1.0
          <span className={styles.sep}>|</span>
          <span>{lines.length} lines</span>
        </div>
        <div className={styles.tabRight}>
          <button className={styles.tabBtn} onClick={() => setOpen(o => !o)}>
            {open ? '▼ COLLAPSE' : '▲ EXPAND'}
          </button>
          <span className={styles.sep}>|</span>
          <button className={styles.tabBtn} onClick={() => setLines([])}>CLEAR</button>
        </div>
      </div>

      {open && (
        <div ref={bufRef} className={styles.buf}>
          {lines.map((l, i) => (
            <div key={i} style={{ color: lineColor(l.cls), whiteSpace: 'pre', fontFamily: 'inherit', fontSize: 10.5 }}>
              {l.text}
            </div>
          ))}
        </div>
      )}

      <div className={styles.prompt}>
        <span className={styles.promptUser}>rishabh@useros</span>
        <span className={styles.promptSep}>:</span>
        <span className={styles.promptDir}>~/portfolio</span>
        <span className={styles.promptSep}>$</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type 'help' or press / …"
          spellCheck={false}
          autoComplete="off"
        />
        <span className={styles.cursor}>▌</span>
      </div>
    </div>
  )
}
