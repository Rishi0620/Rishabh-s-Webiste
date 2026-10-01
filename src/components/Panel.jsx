import styles from './Panel.module.css'
import { PROJECTS, EXPERIENCE, SKILLS, CONTACT, ARCHIVE, PROFILE } from '../data/content'

// ── shared primitives ──────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>
}

function SkillBar({ label, value, color, sub }) {
  return (
    <div className={styles.sk}>
      <div className={styles.skHead}>
        <span>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className={styles.skTrack}>
        <div className={styles.skFill} style={{ width: `${value}%`, background: color, boxShadow: `0 0 5px ${color}` }} />
        <div className={styles.skTicks}>
          {Array.from({ length: 10 }).map((_, i) => <span key={i} />)}
        </div>
      </div>
      {sub && <div className={styles.skSub}>{sub}</div>}
    </div>
  )
}

const STATUS_COLORS = { sig: 'var(--sig)', vio: 'var(--vio)', amb: 'var(--amb)' }

function ProjectCard({ p }) {
  const ac = STATUS_COLORS[p.accentColor] || 'var(--sig)'
  const sc = STATUS_COLORS[p.statusColor] || 'var(--sig)'
  return (
    <div className={styles.pCard} style={{ '--ac': ac }}>
      <div className={styles.pCardTop}>
        <div>
          <div className={styles.pMeta}>
            {p.id} / {p.runtime} / {p.region}
          </div>
          <div className={styles.pName}>{p.name}</div>
          <div className={styles.pTag}>{p.tagline}</div>
        </div>
        <span className={styles.statusPill} style={{ color: sc, borderColor: sc + '44' }}>
          <span className={styles.statusDot} style={{ background: sc }} />
          {p.status}
        </span>
      </div>
      <div className={styles.pMetrics}>
        {Object.entries(p.metrics).map(([k, v]) => (
          <div key={k} className={styles.pMetric}>
            <div className={styles.pMetricLabel}>{k}</div>
            <div className={styles.pMetricValue}>{v}</div>
          </div>
        ))}
      </div>
      <div className={styles.pStack}>
        {p.stack.map(s => (
          <span key={s} className={styles.tag} style={{ color: 'var(--vio)', borderColor: 'rgba(184,156,255,.22)' }}>{s}</span>
        ))}
      </div>
      <div className={styles.pFooter}>
        <span>{p.lines.toLocaleString()} LoC</span>
        <span>★ {p.stars}</span>
        {p.uptime != null && (
          <span style={{ color: p.uptime > 99.9 ? 'var(--sig)' : p.uptime > 99 ? 'var(--amb)' : 'var(--red)' }}>
            {p.uptime}% SLA
          </span>
        )}
      </div>
    </div>
  )
}

function TraceRow({ entry, last }) {
  const kc = entry.kind === 'EXP' ? 'var(--vio)' : 'var(--sig)'
  const isAcad = entry.kind === 'ACAD'
  return (
    <div className={styles.trRow}>
      <div className={styles.trRail}>
        <div className={styles.trMarker} style={{
          borderColor: kc,
          background: kc + '22',
          borderRadius: isAcad ? '50%' : '0',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: isAcad ? '50%' : 0, background: kc, display: 'block' }} />
        </div>
        {!last && <div className={styles.trLine} />}
      </div>
      <div>
        <div className={styles.trCode}>{entry.code}</div>
        <div className={styles.trTitle}>{entry.title}</div>
        <div className={styles.trWhere}>{entry.where}</div>
        <div className={styles.trDetail}>{entry.detail}</div>
        <div className={styles.trKpis}>
          {entry.kpis.map((k, i) => (
            <span key={k} className={styles.kpi} style={{ color: i === 0 ? kc : 'var(--txt)' }}>{k}</span>
          ))}
        </div>
        <div className={styles.trTags}>
          {entry.tags.map(t => (
            <span key={t} className={styles.tag} style={{ color: 'var(--vio)', borderColor: 'rgba(184,156,255,.2)' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function RadarChart({ axes, values }) {
  const size = 180, cx = 90, cy = 90, radius = 70, n = axes.length
  const point = (i, v) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (v / 100) * radius
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
  }
  const poly = values.map((v, i) => point(i, v).join(',')).join(' ')
  return (
    <svg viewBox="0 0 180 180" width="150" style={{ display: 'block', margin: '0 auto 8px' }}>
      <defs>
        <radialGradient id="rf">
          <stop offset="0%" stopColor="rgba(124,255,178,.28)" />
          <stop offset="100%" stopColor="rgba(124,255,178,.02)" />
        </radialGradient>
      </defs>
      {[.25, .5, .75, 1].map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={radius * s} fill="none"
          stroke="rgba(255,255,255,.06)" strokeDasharray={s < 1 ? '2 3' : ''} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.07)" />
      })}
      <polygon points={poly} fill="url(#rf)" stroke="#7CFFB2" strokeWidth="1.2"
        style={{ filter: 'drop-shadow(0 0 4px rgba(124,255,178,.4))' }} />
      {values.map((v, i) => {
        const [x, y] = point(i, v)
        return <circle key={i} cx={x} cy={y} r="2" fill="#7CFFB2" />
      })}
      {axes.map((label, i) => {
        const [x, y] = point(i, 120)
        return (
          <text key={label} x={x} y={y} fill="rgba(232,245,238,.82)"
            textAnchor="middle" dominantBaseline="middle"
            style={{ font: '8px JetBrains Mono, monospace' }}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── node panel contents ────────────────────────────────────────────────────────
function CoreContent({ onNav }) {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Operator Profile</SectionLabel>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>RB</div>
          <div>
            <div className={styles.profileName}>{PROFILE.name}</div>
            <div className={styles.profileRole}>{PROFILE.role}</div>
            <div className={styles.profileDeg} style={{ color: 'var(--sig)' }}>{PROFILE.degree} · {PROFILE.classOf}</div>
          </div>
        </div>
        <p className={styles.bio}>{PROFILE.tagline}</p>
        <div className={styles.statGrid}>
          {[
            ['COMMITS/WK', PROFILE.commitsPerWeek, 'var(--sig)'],
            ['REPOS',      PROFILE.repos,           'var(--vio)'],
            ['GPA',        PROFILE.gpaDisplay,       'var(--sig)'],
            ['INTERNSHIP', 'Jun 2026',               'var(--amb)'],
          ].map(([l, v, c]) => (
            <div key={l} className={styles.statCell}>
              <div className={styles.statLabel}>{l}</div>
              <div className={styles.statValue} style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <SectionLabel>Navigate</SectionLabel>
        {['about','projects','experience','skills','contact','archive'].map(id => (
          <button key={id} className={styles.navBtn} onClick={() => onNav(id)}>
            <span>{id.charAt(0).toUpperCase() + id.slice(1)}</span>
            <span>→</span>
          </button>
        ))}
      </div>
    </>
  )
}

function AboutContent() {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Identity</SectionLabel>
        <p className={styles.bodyText}>
          Third-year CS student at USF Honors College. I build on-device AI, distributed financial platforms,
          and full-stack mobile apps — from RoBERTa classifiers running on-device to stock prediction engines
          tracking 70k+ securities.
        </p>
        <blockquote className={styles.quote}>{PROFILE.philosophy}</blockquote>
      </div>
      <div className={styles.section}>
        <SectionLabel>Profile</SectionLabel>
        {[
          ['Handle', PROFILE.handle],
          ['Degree', PROFILE.degree],
          ['GPA', PROFILE.gpa],
          ['Location', 'Tampa, FL · UTC-4'],
          ['Status', PROFILE.status],
        ].map(([k, v]) => (
          <div key={k} className={styles.tableRow}>
            <span className={styles.tableKey}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <SectionLabel>Coursework</SectionLabel>
        <div className={styles.tagCloud}>
          {PROFILE.coursework.map(c => (
            <span key={c} className={styles.tag} style={{ color: 'var(--vio)', borderColor: 'rgba(184,156,255,.22)' }}>{c}</span>
          ))}
        </div>
      </div>
    </>
  )
}

function ProjectsContent() {
  return (
    <>
      {PROJECTS.map(p => <ProjectCard key={p.id} p={p} />)}
    </>
  )
}

function ExperienceContent() {
  return (
    <>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSq} style={{ background: 'var(--vio)' }} />INDUSTRY
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendCirc} style={{ background: 'var(--sig)' }} />ACADEMIC
        </span>
      </div>
      {EXPERIENCE.map((e, i) => (
        <TraceRow key={e.code} entry={e} last={i === EXPERIENCE.length - 1} />
      ))}
    </>
  )
}

function SkillsContent() {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Languages</SectionLabel>
        {SKILLS.languages.map(s => <SkillBar key={s.label} {...s} />)}
      </div>
      <div className={styles.section}>
        <SectionLabel>Frameworks & Infra</SectionLabel>
        {SKILLS.frameworks.map(s => <SkillBar key={s.label} {...s} />)}
      </div>
      <div className={styles.section}>
        <SectionLabel>Cognitive Load Distribution</SectionLabel>
        <RadarChart axes={SKILLS.radar.axes} values={SKILLS.radar.values} />
      </div>
    </>
  )
}

function ContactContent() {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Secure Channels</SectionLabel>
        {Object.entries(CONTACT).map(([k, v]) => {
          const href = k === 'email' ? `mailto:${v}` :
                       k === 'github' ? `https://${v}` :
                       k === 'linkedin' ? `https://${v}` : null
          return (
            <div key={k} className={styles.contactRow}>
              <span className={styles.contactKey}>{k}</span>
              {href
                ? <a href={href} className={styles.contactVal} target="_blank" rel="noopener noreferrer">{v}</a>
                : <span className={styles.contactVal}>{v}</span>}
              {href && <span className={styles.contactArrow}>→</span>}
            </div>
          )
        })}
      </div>
      <div className={styles.section}>
        <SectionLabel>Availability</SectionLabel>
        <div className={styles.availBox}>
          <div className={styles.availStatus}>STATUS: INCOMING INTERN · JUN 2026</div>
          <p className={styles.availText}>
            Starting J.P. Morgan Chase SEP internship Jun 2026. Open to full-time roles starting May 2027
            in software engineering, distributed systems, or applied ML. Based in Tampa, FL — open to relocation.
          </p>
        </div>
        <p className={styles.consoleTip}>
          Type <code className={styles.code}>sudo hire</code> in the console below to send a hire request.
        </p>
      </div>
    </>
  )
}

function ArchiveContent() {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Research</SectionLabel>
        {ARCHIVE.publications.map(p => (
          <div key={p.code} className={styles.archiveCard} style={{ borderColor: 'rgba(184,156,255,.18)', background: 'rgba(184,156,255,.025)' }}>
            <div className={styles.archiveCode}>{p.code}</div>
            <div className={styles.archiveTitle}>{p.title}</div>
            <div className={styles.archiveVenue} style={{ color: 'var(--vio)' }}>{p.venue}</div>
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <SectionLabel>Hackathons</SectionLabel>
        {ARCHIVE.talks.map(t => (
          <div key={t.code} className={styles.archiveCard} style={{ borderColor: 'rgba(124,255,178,.14)', background: 'rgba(124,255,178,.02)' }}>
            <div className={styles.archiveCode}>{t.code}</div>
            <div className={styles.archiveTitle}>{t.title}</div>
            <div className={styles.archiveVenue} style={{ color: 'var(--sig)' }}>{t.venue}</div>
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <SectionLabel>Awards</SectionLabel>
        {ARCHIVE.awards.map(a => (
          <div key={a.code} className={styles.awardRow}>
            <div>
              <div className={styles.archiveCode}>{a.code}</div>
              <div className={styles.archiveTitle}>{a.title}</div>
            </div>
            <div style={{ color: 'var(--amb)', fontSize: 10 }}>{a.venue}</div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Panel shell ────────────────────────────────────────────────────────────────
const PANEL_META = {
  core:       { kicker: 'NODE · CORE.SYS',   title: 'Rishabh Bhargav'     },
  about:      { kicker: 'NODE · ABOUT.ME',   title: 'Who I Am'             },
  projects:   { kicker: 'NODE · PROJECTS',   title: 'Active Services'      },
  experience: { kicker: 'NODE · EXPERIENCE', title: 'Execution Trace'      },
  skills:     { kicker: 'NODE · SKILLS',     title: 'Resource Allocation'  },
  contact:    { kicker: 'NODE · CONTACT',    title: 'Open Channels'        },
  archive:    { kicker: 'NODE · ARCHIVE',    title: 'Publications & Talks' },
}

const CONTENT_MAP = {
  core:       CoreContent,
  about:      AboutContent,
  projects:   ProjectsContent,
  experience: ExperienceContent,
  skills:     SkillsContent,
  contact:    ContactContent,
  archive:    ArchiveContent,
}

export function Panel({ nodeId, onClose, onNav }) {
  const meta = PANEL_META[nodeId]
  const Content = CONTENT_MAP[nodeId]
  if (!meta || !Content) return null
  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelKicker}>{meta.kicker}</div>
          <div className={styles.panelTitle}>{meta.title}</div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕ CLOSE</button>
      </div>
      <div className={styles.panelBody}>
        <Content onNav={onNav} />
      </div>
    </aside>
  )
}
