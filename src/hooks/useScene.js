import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { NODES, EDGES, NODE_MAP, NEON_COLORS } from '../data/graph'

// ── canvas texture for neon label sprite ──────────────────────────────────────
function makeTextTexture(text, hexColor) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 320, 64)
  ctx.font = "bold 32px 'JetBrains Mono', monospace"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = hexColor
  ctx.shadowBlur = 22
  ctx.fillStyle = hexColor
  ctx.fillText(text, 160, 32)
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.85
  ctx.fillText(text, 160, 32)
  return new THREE.CanvasTexture(canvas)
}

// ── ease function ──────────────────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ── main hook ─────────────────────────────────────────────────────────────────
export function useScene({ canvasRef, onNodeClick, onHover, onPositionUpdate }) {
  const stateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    clock: null,
    nodeMeshes: {},
    nodeGlows: {},
    edgeMeshes: [],
    orbitRings: {},
    // camera control
    yaw: 0,
    pitch: 0,
    entered: false,
    keys: { w: false, a: false, s: false, d: false, q: false, e: false },
    // fly
    flyTarget: null,
    flyStart: null,
    flyT: 0,
    flyDur: 1.0,
    currentNode: 'core',
    // raycaster
    raycaster: null,
    screenCenter: new THREE.Vector2(0, 0),
    hoveredNode: null,
    // animation frame
    rafId: null,
  })

  // ── init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    // renderer
    s.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    s.renderer.setSize(window.innerWidth, window.innerHeight)
    s.renderer.toneMapping = THREE.ACESFilmicToneMapping
    s.renderer.toneMappingExposure = 1.1

    // scene + camera
    s.scene = new THREE.Scene()
    s.scene.background = new THREE.Color(0x030509)
    s.scene.fog = new THREE.FogExp2(0x030509, 0.012)

    s.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400)
    s.camera.position.set(0, 0, 22)

    s.clock = new THREE.Clock()
    s.raycaster = new THREE.Raycaster()

    // build scene objects
    buildStars(s)
    buildNodes(s)
    buildEdges(s)
    buildOrbitRings(s)
    buildLights(s)

    // update active edges
    updateEdgeColors(s)

    // resize
    const onResize = () => {
      s.camera.aspect = window.innerWidth / window.innerHeight
      s.camera.updateProjectionMatrix()
      s.renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // animate
    const camEuler = new THREE.Euler(0, 0, 0, 'YXZ')
    const moveDir = new THREE.Vector3()

    function animate() {
      s.rafId = requestAnimationFrame(animate)
      const dt = s.clock.getDelta()
      const t = s.clock.getElapsedTime()

      // camera look
      camEuler.set(s.pitch, s.yaw, 0, 'YXZ')
      s.camera.quaternion.setFromEuler(camEuler)

      // WASD movement
      if (!s.flyTarget && s.entered) {
        const speed = 10 * dt
        moveDir.set(
          (s.keys.d ? 1 : 0) - (s.keys.a ? 1 : 0),
          (s.keys.e ? 1 : 0) - (s.keys.q ? 1 : 0),
          (s.keys.s ? 1 : 0) - (s.keys.w ? 1 : 0)
        )
        if (moveDir.length() > 0) {
          moveDir.normalize().applyQuaternion(s.camera.quaternion).multiplyScalar(speed)
          s.camera.position.add(moveDir)
        }
      }

      // fly animation
      if (s.flyTarget) {
        s.flyT += dt / s.flyDur
        const et = easeInOutCubic(Math.min(s.flyT, 1))
        s.camera.position.lerpVectors(s.flyStart, s.flyTarget, et)
        if (s.flyT >= 1) s.flyTarget = null
      }

      // glow sprites face camera + pulse
      Object.entries(s.nodeGlows).forEach(([id, glow]) => {
        glow.quaternion.copy(s.camera.quaternion)
        const n = NODE_MAP[id]
        const pulse = 1.0 + Math.sin(t * 1.8 + n.pos[0]) * 0.18
        glow.material.uniforms.intensity.value = (id === s.currentNode ? 1.5 : 0.8) * pulse
      })

      // node float
      Object.entries(s.nodeMeshes).forEach(([id, mesh]) => {
        const n = NODE_MAP[id]
        const floatY = n.pos[1] + Math.sin(t * 0.7 + n.pos[0] * 0.5) * 0.35
        mesh.position.y = floatY
        s.nodeGlows[id].position.y = floatY
      })

      // orbit rings + label sprites
      Object.entries(s.orbitRings).forEach(([id, ring]) => {
        const n = NODE_MAP[id]
        ring.angle += ring.speed * dt
        const a = ring.angle
        const r = ring.orbitR
        const lx = Math.cos(a) * r
        const ly = Math.sin(a) * r
        const rx = lx
        const ry = ly * Math.cos(ring.tiltX)
        const rz = ly * Math.sin(ring.tiltX)
        const fx = rx * Math.cos(ring.tiltZ) - ry * Math.sin(ring.tiltZ)
        const fy = rx * Math.sin(ring.tiltZ) + ry * Math.cos(ring.tiltZ)
        const fz = rz
        const nodeY = s.nodeMeshes[id]?.position.y ?? n.pos[1]
        ring.sprite.position.set(n.pos[0] + fx, nodeY + fy, n.pos[2] + fz)
        ring.sprite.material.opacity = 0.7 + Math.sin(t * 1.2 + n.pos[0]) * 0.2
        ring.ringMesh.material.opacity = 0.2 + Math.sin(t * 0.9 + n.pos[2]) * 0.1
        ring.ringMesh.rotation.y = t * 0.08
      })

      // hover detection
      if (s.entered) {
        s.raycaster.setFromCamera(s.screenCenter, s.camera)
        const hits = s.raycaster.intersectObjects(Object.values(s.nodeMeshes))
        const hit = hits.length > 0 ? hits[0].object.userData.nodeId : null
        if (hit !== s.hoveredNode) {
          s.hoveredNode = hit
          onHover?.(hit)
        }
      }

      // HUD position update
      onPositionUpdate?.(s.camera.position)

      s.renderer.render(s.scene, s.camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(s.rafId)
      window.removeEventListener('resize', onResize)
      s.renderer.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── exposed controls ────────────────────────────────────────────────────────
  const enter = useCallback(() => {
    stateRef.current.entered = true
  }, [])

  const exit = useCallback(() => {
    stateRef.current.entered = false
  }, [])

  const setLook = useCallback((yaw, pitch) => {
    stateRef.current.yaw = yaw
    stateRef.current.pitch = pitch
  }, [])

  const setKey = useCallback((key, down) => {
    stateRef.current.keys[key] = down
  }, [])

  const flyToNode = useCallback((id) => {
    const s = stateRef.current
    const n = NODE_MAP[id]
    if (!n) return
    const np = new THREE.Vector3(...n.pos)
    const dir = s.camera.position.clone().sub(np).normalize()
    if (dir.length() < 0.01) dir.set(0, 0, 1)
    const target = np.clone().add(dir.multiplyScalar(n.r + 6))
    s.flyStart = s.camera.position.clone()
    s.flyTarget = target
    s.flyT = 0
    s.flyDur = Math.max(0.8, s.camera.position.distanceTo(target) / 22)
    s.currentNode = id
    updateEdgeColors(s)
    setTimeout(() => onNodeClick?.(id), s.flyDur * 1000 + 80)
  }, [onNodeClick])

  const flyToPoint = useCallback((forward = 25) => {
    const s = stateRef.current
    const dir = new THREE.Vector3()
    s.camera.getWorldDirection(dir)
    const target = s.camera.position.clone().add(dir.multiplyScalar(forward))
    s.flyStart = s.camera.position.clone()
    s.flyTarget = target
    s.flyT = 0
    s.flyDur = Math.max(0.5, forward / 22)
  }, [])

  const handleCanvasClick = useCallback(() => {
    const s = stateRef.current
    if (!s.entered) return
    s.raycaster.setFromCamera(s.screenCenter, s.camera)
    const hits = s.raycaster.intersectObjects(Object.values(s.nodeMeshes))
    if (hits.length > 0) {
      flyToNode(hits[0].object.userData.nodeId)
    } else {
      flyToPoint()
    }
  }, [flyToNode, flyToPoint])

  return { enter, exit, setLook, setKey, flyToNode, handleCanvasClick }
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
  const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.8 })
  s.scene.add(new THREE.Points(geo, mat))
}

function buildNodes(s) {
  NODES.forEach(n => {
    const [x, y, z] = n.pos
    const col = new THREE.Color(n.color)

    // sphere
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

    // glow (additive sprite)
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

    // torus ring around sphere
    const ringGeo = new THREE.TorusGeometry(n.r + 0.4, 0.05, 8, 48)
    const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.set(x, y, z)
    ring.rotation.x = Math.PI / 2
    s.scene.add(ring)

    // point light
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

    // orbit path ring (thin torus)
    const ringGeo = new THREE.TorusGeometry(orbitR, 0.04, 8, 80)
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.35 })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.position.set(...n.pos)
    ringMesh.rotation.x = tiltX
    ringMesh.rotation.z = tiltZ
    s.scene.add(ringMesh)

    // text sprite
    const tex = makeTextTexture(n.label, col)
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    })
    const sprite = new THREE.Sprite(spriteMat)
    const sw = n.r * 1.5
    sprite.scale.set(sw * (320 / 64), sw, 1)
    s.scene.add(sprite)

    s.orbitRings[n.id] = {
      sprite,
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
