import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Console.module.css'
import { NODES, NODE_MAP } from '../data/graph'
import { CONTACT, PROFILE, PROJECTS } from '../data/content'
import { useCssVarHeight } from '../hooks/useCssVarHeight'

const MAX_LINES = 300

const BOOT = [
  ['  ╦ ╦┌─┐┌─┐┬─┐╔═╗╔═╗', 'ok', 0],
  ['  ║ ║└─┐├┤ ├┬┘║ ║╚═╗', 'ok', 50],
  ['  ╚═╝└─┘└─┘┴└─╚═╝╚═╝   v1.1.0', 'ok', 100],
  ['', 'out', 200],
  ['[ BOOT ] Loading kernel modules:', 'sys', 280],
  ['  ├─ Personality ........................... OK', 'ok', 370],
  ['  ├─ O(1) Memory Management ............... ACTIVE', 'ok', 450],
  ['  ├─ Three.js 3D Runtime .................. OK', 'ok', 530],
  ['  ├─ CoffeeLevel.monitor .................. 76% ☕', 'ok', 610],
  ['  └─ ProcrastinationBlocker ............... ENABLED', 'ok', 690],
  ['', 'out', 740],
  ['[ NET  ] Signal lock acquired · latency 4ms ✓', 'ok', 820],
  ["System ready. Type 'help' for commands.", 'sys', 900],
]

const HELP = [
  ['help',           'list available commands'],
  ['whoami',         'operator identity'],
  ['ls',             'list nodes'],
  ['goto <node>',    'fly to node'],
  ['projects',       'list projects'],
  ['open <project>', 'open a project\'s live site or repo'],
  ['contact',        'open contact channels'],
  ['sudo hire',      'elevated hire request (P0)'],
  ['sudo oc',        'toggle overclocked mode'],
  ['clear',          'clear console buffer'],
]

const COMMANDS = ['help', 'whoami', 'ls', 'goto', 'projects', 'open', 'contact', 'sudo', 'clear']
const NODE_IDS = NODES.map(n => n.id)

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
const PROJECT_SLUGS = PROJECTS.map(p => slug(p.name))
const projectUrl = (p) => p.links.live || p.links.repo || null

function complete(input) {
  const parts = input.toLowerCase().split(/\s+/)
  if (parts.length <= 1) return COMMANDS.find(c => c.startsWith(parts[0])) ?? null
  const [head, arg] = parts
  const pool =
    head === 'goto' || head === 'cd' ? NODE_IDS :
    head === 'open' ? PROJECT_SLUGS :
    head === 'sudo' ? ['hire', 'oc'] : []
  const match = pool.find(c => c.startsWith(arg))
  return match ? `${head} ${match}` : null
}

export function Console({ onGoto }) {
  const [lines, setLines]       = useState([])
  const [input, setInput]       = useState('')
  const [open, setOpen]         = useState(false)
  const [cmdStack, setCmdStack] = useState([])
  const [stackIdx, setStackIdx] = useState(-1)
  const rootRef  = useRef(null)
  const bufRef   = useRef(null)
  const inputRef = useRef(null)

  useCssVarHeight(rootRef, '--con-h')

  const print = useCallback((text, cls = 'out') => {
    const arr = Array.isArray(text) ? text : [text]
    setLines(prev => [...prev, ...arr.map(t => ({ text: t, cls }))].slice(-MAX_LINES))
  }, [])

  // boot sequence
  useEffect(() => {
    const timers = BOOT.map(([text, cls, delay]) => setTimeout(() => print(text, cls), delay + 100))
    return () => timers.forEach(clearTimeout)
  }, [print])

  // auto-scroll
  useEffect(() => {
    if (bufRef.current) bufRef.current.scrollTop = bufRef.current.scrollHeight
  }, [lines, open])

  const exec = useCallback((raw) => {
    const cmd = raw.trim()
    if (!cmd) return
    setCmdStack(s => [...s, cmd])
    setStackIdx(-1)
    setOpen(true)
    print('❯ ' + cmd, 'in')

    const [head, ...rest] = cmd.toLowerCase().split(/\s+/)

    switch (head) {
      case 'help':
        print(['AVAILABLE COMMANDS:', ...HELP.map(([c, d]) => `  ${c.padEnd(16)} ${d}`), '', 'tip: ↑/↓ history · tab autocomplete · esc to leave the console'])
        break

      case 'whoami':
        print([
          `${PROFILE.name} :: ${PROFILE.role}`,
          `  degree    ▸ ${PROFILE.degree}`,
          `  gpa       ▸ ${PROFILE.gpa}`,
          `  status    ▸ ${PROFILE.status}`,
          `  ideology  ▸ ${PROFILE.philosophy}`,
        ])
        break

      case 'goto':
      case 'cd': {
        const target = rest[0]?.replace(/^\/+|\/+$/g, '')
        if (target && NODE_MAP[target]) {
          print(`traveling to /${target} ...`, 'sys')
          onGoto?.(target)
        } else {
          print(`node not found: ${target || '?'} — nodes: ${NODE_IDS.join(', ')}`, 'err')
        }
        break
      }

      case 'projects':
        print([
          'ACTIVE SERVICES:',
          ...PROJECTS.map(p => `  ${slug(p.name).padEnd(16)} ${p.status.padEnd(9)} ${p.period}`),
          '',
          "tip: 'open <project>' or 'goto projects'",
        ])
        break

      case 'open': {
        const key = slug(rest.join(''))
        const project = key && PROJECTS.find(p => slug(p.name) === key)
        if (!project) {
          print(`open: no such project: ${rest.join(' ') || '?'} — try 'projects'`, 'err')
        } else if (!projectUrl(project)) {
          print(`open: ${slug(project.name)} has no public link yet — try 'goto projects'`, 'err')
        } else {
          print(`opening ${projectUrl(project)} ...`, 'sys')
          window.open(projectUrl(project), '_blank', 'noopener,noreferrer')
        }
        break
      }

      case 'contact':
        print([
          'OPENING SECURE CHANNELS ...',
          `  email    ▸ ${CONTACT.email}`,
          `  github   ▸ ${CONTACT.github}`,
          `  linkedin ▸ ${CONTACT.linkedin}`,
          `  phone    ▸ ${CONTACT.phone}`,
          `  location ▸ ${CONTACT.location}`,
          'SLA: < 24h',
        ])
        break

      case 'ls':
        print(NODE_IDS.map(id => `${id}/`).join('  '))
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
          print(on ? 'overclocked mode disabled.' : 'OVERCLOCKED MODE — colour shift ⚡', 'ok')
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
      if (e.nativeEvent.isComposing) return
      exec(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdStack.length === 0) return
      const next = stackIdx < 0 ? cmdStack.length - 1 : Math.max(0, stackIdx - 1)
      setStackIdx(next)
      setInput(cmdStack[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (stackIdx < 0) return
      const next = stackIdx + 1
      if (next >= cmdStack.length) { setStackIdx(-1); setInput('') }
      else { setStackIdx(next); setInput(cmdStack[next]) }
    } else if (e.key === 'Tab') {
      // only take Tab when there is something to complete, so keyboard users can still tab away
      const match = !e.shiftKey && input ? complete(input) : null
      if (!match || match === input) return
      e.preventDefault()
      setInput(match)
    } else if (e.key === 'Escape') {
      inputRef.current?.blur()
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }, [input, cmdStack, stackIdx, exec])

  // global "/" shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      e.preventDefault()
      setOpen(true)
      inputRef.current?.focus()
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
    <div ref={rootRef} className={styles.con}>
      <div className={styles.tab}>
        <div className={styles.tabLeft}>
          <span className={styles.onDot}>●</span>
          tty/0 · UserOS 1.0
          <span className={styles.sep}>|</span>
          <span>{lines.length} lines</span>
        </div>
        <div className={styles.tabRight}>
          <button className={styles.tabBtn} onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {open ? '▼ COLLAPSE' : '▲ EXPAND'}
          </button>
          <span className={styles.sep}>|</span>
          <button className={styles.tabBtn} onClick={() => setLines([])}>CLEAR</button>
        </div>
      </div>

      {open && (
        <div ref={bufRef} className={styles.buf} role="log" aria-live="polite">
          {lines.map((l, i) => (
            <div key={i} className={styles.line} style={{ color: lineColor(l.cls) }}>
              {l.text}
            </div>
          ))}
        </div>
      )}

      <div className={styles.prompt} onClick={() => inputRef.current?.focus()}>
        <span className={styles.promptUser}>rishabh@useros</span>
        <span className={`${styles.promptSep} ${styles.promptPath}`}>:</span>
        <span className={styles.promptDir}>~/portfolio</span>
        <span className={styles.promptSep}>$</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type 'help' or press / …"
          aria-label="Console command"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
    </div>
  )
}
