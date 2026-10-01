import styles from './Panel.module.css'
import { NODES } from '../data/graph'
import { PROJECTS, EXPERIENCE, SKILLS, CONTACT, AVAILABILITY, ARCHIVE, PROFILE } from '../data/content'

const COLORS = { sig: 'var(--sig)', vio: 'var(--vio)', amb: 'var(--amb)' }
const VIO_TAG = { color: 'var(--vio)', borderColor: 'rgba(184,156,255,.22)' }

// ── shared primitives ──────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>
}

function ExtLink({ href, className, children }) {
  return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
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

function StatusPill({ color, children }) {
  return (
    <span className={styles.statusPill} style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}>
      <span className={styles.statusDot} style={{ background: color }} />
      {children}
    </span>
  )
}

function ProjectCard({ p }) {
  const ac = COLORS[p.accentColor] || COLORS.sig
  const sc = COLORS[p.statusColor] || COLORS.sig
  const { live, repo } = p.links
  return (
    <article className={styles.pCard} style={{ '--ac': ac }}>
      <div className={styles.pCardTop}>
        <div className={styles.pMeta}>
          {p.id} / {p.runtime} / {p.region}
        </div>
        <StatusPill color={sc}>{p.status}</StatusPill>
      </div>
      <h3 className={styles.pName}>{p.name}</h3>
      <p className={styles.pTag}>{p.tagline}</p>
      <div className={styles.pMetrics}>
        {Object.entries(p.metrics).map(([k, v]) => (
          <div key={k} className={styles.pMetric}>
            <div className={styles.pMetricLabel}>{k}</div>
            <div className={styles.pMetricValue}>{v}</div>
          </div>
        ))}
      </div>
      <div className={styles.pStack}>
        {p.stack.map(s => <span key={s} className={styles.tag} style={VIO_TAG}>{s}</span>)}
      </div>
      <div className={styles.pFooter}>
        <span>{p.period}</span>
        <span className={styles.pLinks}>
          {live && <ExtLink href={live} className={styles.pLink}>LIVE ↗</ExtLink>}
          {repo && <ExtLink href={repo} className={styles.pLink}>SOURCE ↗</ExtLink>}
        </span>
      </div>
    </article>
  )
}

function TraceRow({ entry, last }) {
  const isAcad = entry.kind === 'ACAD'
  const kc = isAcad ? 'var(--sig)' : 'var(--vio)'
  const running = entry.status === 'RUNNING'
  return (
    <div className={styles.trRow}>
      <div className={styles.trRail}>
        <div className={styles.trMarker} style={{
          borderColor: kc,
          background: `color-mix(in srgb, ${kc} 14%, transparent)`,
          borderRadius: isAcad ? '50%' : '0',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: isAcad ? '50%' : 0, background: kc, display: 'block' }} />
        </div>
        {!last && <div className={styles.trLine} />}
      </div>
      <div>
        <div className={styles.trCode}>
          {entry.code}
          <span style={{ color: running ? 'var(--sig)' : 'var(--dim)' }}> · {entry.status}</span>
        </div>
        <h3 className={styles.trTitle}>{entry.title}</h3>
        <div className={styles.trWhere}>{entry.where}</div>
        <p className={styles.trDetail}>{entry.detail}</p>
        <div className={styles.trKpis}>
          {entry.kpis.map((k, i) => (
            <span key={k} className={styles.kpi} style={{ color: i === 0 ? kc : 'var(--txt)' }}>{k}</span>
          ))}
        </div>
        <div className={styles.trTags}>
          {entry.tags.map(t => <span key={t} className={styles.tag} style={VIO_TAG}>{t}</span>)}
        </div>
      </div>
    </div>
  )
}

function RadarChart({ axes, values }) {
  const cx = 90, cy = 90, radius = 62, n = axes.length
  const point = (i, v) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (v / 100) * radius
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
  }
  const poly = values.map((v, i) => point(i, v).join(',')).join(' ')
  return (
    <svg viewBox="0 0 180 180" width="170" role="img" aria-label={`Focus areas: ${axes.join(', ')}`} style={{ display: 'block', margin: '0 auto 8px' }}>
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
        const [x, y] = point(i, 122)
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

function ArchiveCard({ item, tone }) {
  const color = COLORS[tone]
  return (
    <div className={styles.archiveCard} style={{
      borderColor: `color-mix(in srgb, ${color} 18%, transparent)`,
      background: `color-mix(in srgb, ${color} 3%, transparent)`,
    }}>
      <div className={styles.archiveCode}>{item.code}</div>
      <div className={styles.archiveTitle}>{item.title}</div>
      <div className={styles.archiveVenue} style={{ color }}>
        {item.venue}
        {item.url && <> · <ExtLink href={item.url} className={styles.pLink}>SOURCE ↗</ExtLink></>}
      </div>
    </div>
  )
}

// ── node panel contents ────────────────────────────────────────────────────────
function CoreContent({ onNav }) {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Operator Profile</SectionLabel>
        <div className={styles.profileRow}>
          <div className={styles.avatar} aria-hidden="true">{PROFILE.initials}</div>
          <div>
            <div className={styles.profileName}>{PROFILE.name}</div>
            <div className={styles.profileRole}>{PROFILE.role}</div>
            <div className={styles.profileDeg} style={{ color: 'var(--sig)' }}>{PROFILE.degree} · {PROFILE.graduation}</div>
          </div>
        </div>
        <p className={styles.bio}>{PROFILE.tagline}</p>
        <div className={styles.statGrid}>
          {PROFILE.stats.map(({ label, value, color }) => (
            <div key={label} className={styles.statCell}>
              <div className={styles.statLabel}>{label}</div>
              <div className={styles.statValue} style={{ color: COLORS[color] }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <SectionLabel>Navigate</SectionLabel>
        {NODES.filter(n => n.id !== 'core').map(({ id }) => (
          <button key={id} className={styles.navBtn} onClick={() => onNav(id)}>
            <span>{id}</span>
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
        <p className={styles.bodyText}>{PROFILE.bio}</p>
        <blockquote className={styles.quote}>{PROFILE.philosophy}</blockquote>
      </div>
      <div className={styles.section}>
        <SectionLabel>Now</SectionLabel>
        <ul className={styles.nowList}>
          {PROFILE.now.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div className={styles.section}>
        <SectionLabel>Profile</SectionLabel>
        {[
          ['Handle', PROFILE.handle],
          ['Degree', PROFILE.degree],
          ['GPA', PROFILE.gpa],
          ['Graduation', PROFILE.graduation],
          ['Location', PROFILE.location],
          ['Status', PROFILE.status],
        ].map(([k, v]) => (
          <div key={k} className={styles.tableRow}>
            <span className={styles.tableKey}>{k}</span>
            <span className={styles.tableVal}>{v}</span>
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <SectionLabel>Coursework</SectionLabel>
        <div className={styles.tagCloud}>
          {PROFILE.coursework.map(c => <span key={c} className={styles.tag} style={VIO_TAG}>{c}</span>)}
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
        <SectionLabel>Toolchain</SectionLabel>
        {SKILLS.toolchain.map(({ group, items }) => (
          <div key={group} className={styles.toolRow}>
            <span className={styles.toolGroup}>{group}</span>
            <div className={styles.tagCloud}>
              {items.map(t => <span key={t} className={styles.tag} style={VIO_TAG}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <SectionLabel>Cognitive Load Distribution</SectionLabel>
        <RadarChart axes={SKILLS.radar.axes} values={SKILLS.radar.values} />
      </div>
    </>
  )
}

const CONTACT_HREF = {
  email:    v => `mailto:${v}`,
  github:   v => `https://${v}`,
  linkedin: v => `https://${v}`,
  phone:    v => `tel:+1${v.replace(/\D/g, '')}`,
}

function ContactContent() {
  return (
    <>
      <div className={styles.section}>
        <SectionLabel>Secure Channels</SectionLabel>
        {Object.entries(CONTACT).map(([k, v]) => {
          const href = CONTACT_HREF[k]?.(v)
          const external = href?.startsWith('https://')
          return (
            <div key={k} className={styles.contactRow}>
              <span className={styles.contactKey}>{k}</span>
              {href
                ? <a href={href} className={styles.contactVal} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{v}</a>
                : <span className={styles.contactVal}>{v}</span>}
              {href && <span className={styles.contactArrow} aria-hidden="true">→</span>}
            </div>
          )
        })}
      </div>
      <div className={styles.section}>
        <SectionLabel>Availability</SectionLabel>
        <div className={styles.availBox}>
          <div className={styles.availStatus}>{AVAILABILITY.status}</div>
          <p className={styles.availText}>{AVAILABILITY.text}</p>
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
        {ARCHIVE.research.map(item => <ArchiveCard key={item.code} item={item} tone="vio" />)}
      </div>
      <div className={styles.section}>
        <SectionLabel>Hackathons</SectionLabel>
        {ARCHIVE.hackathons.map(item => <ArchiveCard key={item.code} item={item} tone="sig" />)}
      </div>
      <div className={styles.section}>
        <SectionLabel>Earlier Builds</SectionLabel>
        {ARCHIVE.builds.map(item => <ArchiveCard key={item.code} item={item} tone="amb" />)}
      </div>
      <div className={styles.section}>
        <SectionLabel>Honors</SectionLabel>
        {ARCHIVE.honors.map(a => (
          <div key={a.code} className={styles.awardRow}>
            <div>
              <div className={styles.archiveCode}>{a.code}</div>
              <div className={styles.archiveTitle}>{a.title}</div>
            </div>
            <div className={styles.awardVenue}>{a.venue}</div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Panel shell ────────────────────────────────────────────────────────────────
const PANEL_META = {
  core:       { kicker: 'NODE · CORE.SYS',   title: PROFILE.name           },
  about:      { kicker: 'NODE · ABOUT.ME',   title: 'Who I Am'             },
  projects:   { kicker: 'NODE · PROJECTS',   title: 'Active Services'      },
  experience: { kicker: 'NODE · EXPERIENCE', title: 'Execution Trace'      },
  skills:     { kicker: 'NODE · SKILLS',     title: 'Resource Allocation'  },
  contact:    { kicker: 'NODE · CONTACT',    title: 'Open Channels'        },
  archive:    { kicker: 'NODE · ARCHIVE',    title: 'Research & Hackathons' },
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

export function Panel({ nodeId, onClose, onNav, notice }) {
  const meta = PANEL_META[nodeId]
  const Content = CONTENT_MAP[nodeId]
  if (!meta || !Content) return null
  return (
    <aside className={styles.panel} aria-label={meta.title}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelKicker}>{meta.kicker}</div>
          <h2 className={styles.panelTitle}>{meta.title}</h2>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕ CLOSE</button>
      </div>
      {/* keyed so each section starts scrolled to the top and replays its entry animations */}
      <div key={nodeId} className={styles.panelBody}>
        {notice && <p className={styles.notice}>{notice}</p>}
        <Content onNav={onNav} />
      </div>
    </aside>
  )
}
