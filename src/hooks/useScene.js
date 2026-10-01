import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { NODES, EDGES, NODE_MAP, NEON_COLORS } from '../data/graph'

const LABEL_FONT = "bold 32px 'JetBrains Mono', monospace"
const LABEL_W = 320
const LABEL_H = 64
const MAX_PITCH = Math.PI / 2 - 0.08
const FLY_SPEED = 22
const NODE_STANDOFF = 6

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function drawLabel(canvas, text, hexColor) {
  const ctx = canvas.getContext('2d')
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, LABEL_W, LABEL_H)
  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = hexColor
  ctx.shadowBlur = 22
  ctx.fillStyle = hexColor
  ctx.fillText(text, LABEL_W / 2, LABEL_H / 2)
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.85
  ctx.fillText(text, LABEL_W / 2, LABEL_H / 2)
}

function createState() {
  return {
    renderer: null,
    scene: null,
    camera: null,
    clock: null,
    raycaster: null,
    pointer: new THREE.Vector2(0, 0),
    nodeMeshes: {},
    nodeGlows: {},
    nodeRings: {},
    edgeMeshes: [],
    orbitRings: {},
    // orientation = base (set by flights) + look (set by input) + bias (set by layout)
    baseYaw: 0,
    basePitch: 0,
    lookYaw: 0,
    lookPitch: 0,
    biasYaw: 0,
    biasPitch: 0,
    biasYawTarget: 0,
    biasPitchTarget: 0,
    entered: false,
    keys: { w: false, a: false, s: false, d: false, q: false, e: false },
    fly: null,
    currentNode: 'core',
    hoveredNode: null,
    rafId: null,
  }
}

// ── main hook ─────────────────────────────────────────────────────────────────
export function useScene({ canvasRef, onArrive, onHover, onFlyChange, onInitError }) {
  const stateRef = useRef(null)
  if (!stateRef.current) stateRef.current = createState()

  const cbRef = useRef({})
  cbRef.current = { onArrive, onHover, onFlyChange, onInitError }

  // ── init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      s.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    } catch (err) {
      s.renderer = null
      cbRef.current.onInitError?.(err)
      return
    }
    let disposed = false

    s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    s.renderer.setSize(window.innerWidth, window.innerHeight)
    s.renderer.toneMapping = THREE.ACESFilmicToneMapping
    s.renderer.toneMappingExposure = 1.1

    s.scene = new THREE.Scene()
    s.scene.background = new THREE.Color(0x030509)
    s.scene.fog = new THREE.FogExp2(0x030509, 0.012)

    s.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400)
    s.camera.position.set(0, 0, 22)

    s.clock = new THREE.Clock()
    s.raycaster = new THREE.Raycaster()

    s.nodeMeshes = {}
    s.nodeGlows = {}
    s.nodeRings = {}
    s.edgeMeshes = []
    s.orbitRings = {}

    buildStars(s)
    buildNodes(s)
    buildEdges(s)
    buildOrbitRings(s)
    buildLights(s)
    updateEdgeColors(s)

    // Labels are drawn before the web font is guaranteed to exist; redraw once it loads.
    document.fonts?.load(LABEL_FONT).then(() => {
      if (disposed) return
      Object.entries(s.orbitRings).forEach(([id, ring]) => {
        drawLabel(ring.canvas, NODE_MAP[id].label, NEON_COLORS[id])
        ring.sprite.material.map.needsUpdate = true
      })
    }).catch(() => {})

    const onResize = () => {
      s.camera.aspect = window.innerWidth / window.innerHeight
      s.camera.updateProjectionMatrix()
      s.renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    const camEuler = new THREE.Euler(0, 0, 0, 'YXZ')
    const moveDir = new THREE.Vector3()

    function animate() {
      s.rafId = requestAnimationFrame(animate)
      // flights run on real time; free movement is clamped so a stalled frame can't teleport the camera
      const elapsed = s.clock.getDelta()
      const dt = Math.min(elapsed, 0.1)
      const t = s.clock.elapsedTime
      const cb = cbRef.current

      // look offset drifts back to centre while the pointer isn't driving it
      if (!s.entered) {
        const k = Math.min(1, dt * 4)
        s.lookYaw -= s.lookYaw * k
        s.lookPitch -= s.lookPitch * k
      }
      const bk = Math.min(1, dt * 3)
      s.biasYaw += (s.biasYawTarget - s.biasYaw) * bk
      s.biasPitch += (s.biasPitchTarget - s.biasPitch) * bk

      // flight
      if (s.fly) {
        const f = s.fly
        f.t = Math.min(1, f.t + elapsed / f.dur)
        s.camera.position.lerpVectors(f.fromPos, f.toPos, easeInOutCubic(f.t))
        if (f.node) {
          // turn towards the node early so it is in view for most of the trip
          const r = easeInOutCubic(Math.min(1, f.t * 1.6))
          s.baseYaw = f.fromYaw + f.dYaw * r
          s.basePitch = f.fromPitch + (f.toPitch - f.fromPitch) * r
        }
        if (f.t >= 1) {
          s.fly = null
          cb.onFlyChange?.(false)
          if (f.node) cb.onArrive?.(f.node)
        }
      }

      camEuler.set(
        clamp(s.basePitch + s.lookPitch + s.biasPitch, -MAX_PITCH, MAX_PITCH),
        s.baseYaw + s.lookYaw + s.biasYaw,
        0,
        'YXZ'
      )
      s.camera.quaternion.setFromEuler(camEuler)

      // WASD movement
      if (!s.fly && s.entered) {
        moveDir.set(
          (s.keys.d ? 1 : 0) - (s.keys.a ? 1 : 0),
          (s.keys.e ? 1 : 0) - (s.keys.q ? 1 : 0),
          (s.keys.s ? 1 : 0) - (s.keys.w ? 1 : 0)
        )
        if (moveDir.lengthSq() > 0) {
          moveDir.normalize().applyQuaternion(s.camera.quaternion).multiplyScalar(10 * dt)
          s.camera.position.add(moveDir)
        }
      }
      s.camera.updateMatrixWorld()

      // hover detection (crosshair = screen centre)
      if (s.entered) {
        s.pointer.set(0, 0)
        s.raycaster.setFromCamera(s.pointer, s.camera)
        const hits = s.raycaster.intersectObjects(Object.values(s.nodeMeshes))
        const hit = hits.length > 0 ? hits[0].object.userData.nodeId : null
        if (hit !== s.hoveredNode) {
          s.hoveredNode = hit
          cb.onHover?.(hit)
        }
      } else if (s.hoveredNode) {
        s.hoveredNode = null
        cb.onHover?.(null)
      }

      // nodes float, pulse, and swell slightly under the crosshair
      Object.entries(s.nodeMeshes).forEach(([id, mesh]) => {
        const n = NODE_MAP[id]
        const floatY = n.pos[1] + Math.sin(t * 0.7 + n.pos[0] * 0.5) * 0.35
        mesh.position.y = floatY
        s.nodeRings[id].position.y = floatY
        const scale = mesh.scale.x + ((id === s.hoveredNode ? 1.12 : 1) - mesh.scale.x) * Math.min(1, dt * 10)
        mesh.scale.setScalar(scale)

        const glow = s.nodeGlows[id]
        glow.position.y = floatY
        glow.quaternion.copy(s.camera.quaternion)
        const pulse = 1.0 + Math.sin(t * 1.8 + n.pos[0]) * 0.18
        glow.material.uniforms.intensity.value = (id === s.currentNode ? 1.5 : 0.8) * pulse
      })

      // orbit rings + label sprites
      Object.entries(s.orbitRings).forEach(([id, ring]) => {
        const n = NODE_MAP[id]
        ring.angle += ring.speed * dt
        const lx = Math.cos(ring.angle) * ring.orbitR
        const ly = Math.sin(ring.angle) * ring.orbitR
        const ry = ly * Math.cos(ring.tiltX)
        const rz = ly * Math.sin(ring.tiltX)
        const fx = lx * Math.cos(ring.tiltZ) - ry * Math.sin(ring.tiltZ)
        const fy = lx * Math.sin(ring.tiltZ) + ry * Math.cos(ring.tiltZ)
        const nodeY = s.nodeMeshes[id].position.y
        ring.sprite.position.set(n.pos[0] + fx, nodeY + fy, n.pos[2] + rz)
        // fade the label out as the camera closes in, so it never fills the screen
        const near = clamp((ring.sprite.position.distanceTo(s.camera.position) - 5) / 9, 0, 1)
        ring.sprite.material.opacity = (0.7 + Math.sin(t * 1.2 + n.pos[0]) * 0.2) * near
        ring.ringMesh.position.y = nodeY
        ring.ringMesh.material.opacity = 0.2 + Math.sin(t * 0.9 + n.pos[2]) * 0.1
        ring.ringMesh.rotation.y = t * 0.08
      })

      s.renderer.render(s.scene, s.camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(s.rafId)
      window.removeEventListener('resize', onResize)
      s.scene.traverse((obj) => {
        obj.geometry?.dispose()
        if (obj.material) {
          obj.material.map?.dispose()
          obj.material.dispose()
        }
      })
      s.renderer.dispose()
      s.renderer = null
      s.scene = null
      s.camera = null
      s.fly = null
    }
  }, [canvasRef])

  // ── exposed controls ────────────────────────────────────────────────────────
  const enter = useCallback(() => { stateRef.current.entered = true }, [])

  const exit = useCallback(() => {
    const s = stateRef.current
    s.entered = false
    Object.keys(s.keys).forEach((k) => { s.keys[k] = false })
  }, [])

  const setKey = useCallback((key, down) => {
    stateRef.current.keys[key] = down
  }, [])

  // absolute look offset (mouse position relative to screen centre)
  const setLook = useCallback((yaw, pitch) => {
    const s = stateRef.current
    s.lookYaw = yaw
    s.lookPitch = clamp(pitch, -MAX_PITCH, MAX_PITCH)
  }, [])

  // relative look (pointer lock, touch drag)
  const nudgeLook = useCallback((dYaw, dPitch) => {
    const s = stateRef.current
    const fixed = s.basePitch + s.biasPitchTarget
    s.lookYaw += dYaw
    s.lookPitch = clamp(s.lookPitch + dPitch, -MAX_PITCH - fixed, MAX_PITCH - fixed)
  }, [])

  // swap the look offset for a new one without moving the view
  const rebaseLook = useCallback((yaw, pitch) => {
    const s = stateRef.current
    s.baseYaw += s.lookYaw - yaw
    s.basePitch = clamp(s.basePitch + s.lookPitch - pitch, -MAX_PITCH, MAX_PITCH)
    s.lookYaw = yaw
    s.lookPitch = pitch
  }, [])

  // keeps the focused node clear of whatever UI is covering part of the canvas
  const setViewBias = useCallback((yaw, pitch) => {
    const s = stateRef.current
    s.biasYawTarget = yaw
    s.biasPitchTarget = pitch
  }, [])

  const getPosition = useCallback(() => stateRef.current.camera?.position ?? null, [])

  const flyToNode = useCallback((id) => {
    const s = stateRef.current
    const n = NODE_MAP[id]
    if (!n) return
    s.currentNode = id
    if (!s.camera) {
      cbRef.current.onArrive?.(id)
      return
    }
    const nodePos = new THREE.Vector3(...n.pos)
    const dir = s.camera.position.clone().sub(nodePos)
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1)
    dir.normalize()
    // stand further back on portrait screens, where the horizontal field of view is narrow
    const standoff = NODE_STANDOFF * clamp(1 / s.camera.aspect, 1, 2.2)
    const toPos = nodePos.clone().addScaledVector(dir, n.r + standoff)

    // end the flight facing the node, given wherever the pointer currently has the view offset
    const offYaw = s.entered ? s.lookYaw : 0
    const offPitch = s.entered ? s.lookPitch : 0
    const toYaw = Math.atan2(dir.x, dir.z) - offYaw
    const toPitch = clamp(Math.asin(clamp(-dir.y, -1, 1)) - offPitch, -MAX_PITCH, MAX_PITCH)

    s.fly = {
      node: id,
      fromPos: s.camera.position.clone(),
      toPos,
      fromYaw: s.baseYaw,
      dYaw: shortestAngle(s.baseYaw, toYaw),
      fromPitch: s.basePitch,
      toPitch,
      t: 0,
      dur: Math.max(0.8, s.camera.position.distanceTo(toPos) / FLY_SPEED),
    }
    updateEdgeColors(s)
    cbRef.current.onFlyChange?.(true)
  }, [])

  // click / tap: fly to the node under the given point, or forward along that ray
  const pick = useCallback((ndcX = 0, ndcY = 0) => {
    const s = stateRef.current
    if (!s.camera || !s.entered) return
    // a flight to a node always completes, so the panel and the scene can't disagree about where we are
    if (s.fly?.node) return
    s.pointer.set(ndcX, ndcY)
    s.raycaster.setFromCamera(s.pointer, s.camera)
    const hits = s.raycaster.intersectObjects(Object.values(s.nodeMeshes))
    if (hits.length > 0) {
      flyToNode(hits[0].object.userData.nodeId)
      return
    }
    const forward = 25
    s.fly = {
      node: null,
      fromPos: s.camera.position.clone(),
      toPos: s.camera.position.clone().addScaledVector(s.raycaster.ray.direction, forward),
      t: 0,
      dur: Math.max(0.5, forward / FLY_SPEED),
    }
    cbRef.current.onFlyChange?.(true)
  }, [flyToNode])

  return { enter, exit, setKey, setLook, nudgeLook, rebaseLook, setViewBias, getPosition, flyToNode, pick }
}

// ── scene builders ─────────────────────────────────────────────────────────────

function buildStars(s) {
  const geo = new THREE.BufferGeometry()
  const n = 3000
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 80 + Math.random() * 200
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
    const t = Math.random()
    col[i * 3]     = 0.5 + t * 0.5
    col[i * 3 + 1] = 0.7 + t * 0.3
    col[i * 3 + 2] = 0.7 + t * 0.3
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  // fog would otherwise swallow anything this far out
  const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.8, fog: false })
  s.scene.add(new THREE.Points(geo, mat))
}

function buildNodes(s) {
  NODES.forEach(n => {
    const [x, y, z] = n.pos
    const col = new THREE.Color(n.color)

    const geo = new THREE.SphereGeometry(n.r, 32, 32)
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: n.kind === 'core' ? 0.8 : 0.5,
      roughness: 0.3,
      metalness: 0.6,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.userData = { nodeId: n.id }
    s.scene.add(mesh)
    s.nodeMeshes[n.id] = mesh

    // glow (additive billboard)
    const glowSize = n.r * (n.kind === 'core' ? 9 : 7)
    const glowGeo = new THREE.PlaneGeometry(glowSize, glowSize)
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: col },
        intensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - vec2(0.5));
          float a = max(0.0, 1.0 - d * 2.2);
          a = pow(a, 2.2) * intensity;
          gl_FragColor = vec4(color, a * 0.55);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(x, y, z)
    s.scene.add(glow)
    s.nodeGlows[n.id] = glow

    // equatorial ring
    const ringGeo = new THREE.TorusGeometry(n.r + 0.4, 0.05, 8, 48)
    const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.set(x, y, z)
    ring.rotation.x = Math.PI / 2
    s.scene.add(ring)
    s.nodeRings[n.id] = ring

    const light = new THREE.PointLight(n.color, n.kind === 'core' ? 2.5 : 1.2, n.r * 8)
    light.position.set(x, y, z)
    s.scene.add(light)
  })
}

function buildEdges(s) {
  EDGES.forEach(([a, b]) => {
    const na = NODE_MAP[a], nb = NODE_MAP[b]
    const pts = [new THREE.Vector3(...na.pos), new THREE.Vector3(...nb.pos)]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0x4a9e72, transparent: true, opacity: 0.55 })
    const line = new THREE.Line(geo, mat)
    s.scene.add(line)
    s.edgeMeshes.push({ line, mat, a, b })
  })
}

function buildOrbitRings(s) {
  NODES.forEach((n, i) => {
    const col = NEON_COLORS[n.id]
    const orbitR = n.r + 2.8
    const tiltX  = 0.3 + (i * 0.37) % 0.8
    const tiltZ  = 0.2 + (i * 0.29) % 0.6

    const ringGeo = new THREE.TorusGeometry(orbitR, 0.04, 8, 80)
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.35 })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.position.set(...n.pos)
    ringMesh.rotation.x = tiltX
    ringMesh.rotation.z = tiltZ
    s.scene.add(ringMesh)

    const canvas = document.createElement('canvas')
    canvas.width = LABEL_W
    canvas.height = LABEL_H
    drawLabel(canvas, n.label, col)
    const spriteMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    })
    const sprite = new THREE.Sprite(spriteMat)
    const sw = n.r * 1.5
    sprite.scale.set(sw * (LABEL_W / LABEL_H), sw, 1)
    s.scene.add(sprite)

    s.orbitRings[n.id] = {
      sprite,
      canvas,
      ringMesh,
      tiltX,
      tiltZ,
      orbitR,
      angle: (i / NODES.length) * Math.PI * 2,
      speed: 0.4 + (i * 0.07) % 0.3,
    }
  })
}

function buildLights(s) {
  s.scene.add(new THREE.AmbientLight(0x111820, 1.2))
  const dLight = new THREE.DirectionalLight(0x7CFFB2, 0.4)
  dLight.position.set(10, 20, 10)
  s.scene.add(dLight)
}

function updateEdgeColors(s) {
  s.edgeMeshes.forEach(({ mat, a, b }) => {
    const act = a === s.currentNode || b === s.currentNode
    mat.color.set(act ? 0x7CFFB2 : 0x4a9e72)
    mat.opacity = act ? 0.85 : 0.55
  })
}
