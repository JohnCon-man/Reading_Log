// The study, in 3D. Two walls meet in a corner: the bookshelf stands on the
// left wall, the fireplace on the right, and the leather armchair sits in the
// corner beside a nightstand holding your current reads.
//
// World units are metres. The corner is at the origin; the left wall is the
// plane x = 0 and the right wall is the plane z = 0. The camera looks into the
// corner from the middle of the room.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fireLevel } from './stats.js';

const H = 2.9; // ceiling height
const FORCE_HQ = new URLSearchParams(location.search).has('hq');
const ASSETS = './assets';
const FILLER = ['#4f2424', '#283f33', '#26334b', '#5d4e33', '#3f2a3c', '#6a4f28', '#33302d', '#4f3322', '#234040', '#5f3426', '#3a4a35', '#71592f', '#2e2440', '#6b2a24'];

// Layout
const CHAIR = { x: 0.74, z: 0.74 };
const NIGHTSTAND = { x: 0.27, z: 1.46 };
const SHELF = { z: 2.38, width: 1.3, height: 2.25, depth: 0.36 };
const FIRE = { x: 1.86 };

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/* ───────────────────────── Canvas painting ───────────────────────── */

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

function fitText(ctx, text, maxW, size, weight = 600, family = "'EB Garamond', Georgia, serif") {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    s -= 1;
  } while (s > 8);
  return s;
}

// Paints an upright spine (title runs bottom-to-top) into the given rect.
function paintSpine(ctx, x, y, w, h, color, { title = '', author = '', seed = 1 } = {}) {
  const r = rng(seed);
  const style = seed % 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  // rounded-spine shading
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(0,0,0,.45)');
  g.addColorStop(0.3, 'rgba(255,255,255,.13)');
  g.addColorStop(0.7, 'rgba(0,0,0,.05)');
  g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // cloth grain
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < h; i += 2) {
    ctx.fillStyle = r() > 0.5 ? '#fff' : '#000';
    ctx.fillRect(x, y + i, w, 1);
  }
  ctx.globalAlpha = 1;
  const gold = '#d9b25f';
  ctx.fillStyle = gold;
  if (style === 0) {
    [0.06, 0.09, 0.88, 0.91].forEach((t) => ctx.fillRect(x, y + h * t, w, h * 0.012));
  } else if (style === 1) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(x, y + h * 0.16, w, h * 0.36);
    ctx.fillStyle = gold;
    ctx.fillRect(x, y + h * 0.16, w, h * 0.012);
    ctx.fillRect(x, y + h * 0.51, w, h * 0.012);
  } else if (style === 2) {
    ctx.strokeStyle = 'rgba(217,178,95,.7)';
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.strokeRect(x + w * 0.12, y + h * 0.04, w * 0.76, h * 0.92);
  } else {
    ctx.fillRect(x, y + h * 0.05, w, h * 0.02);
    ctx.fillRect(x, y + h * 0.93, w, h * 0.02);
  }
  if (title) {
    ctx.save();
    ctx.translate(x + w / 2, y + h * (style === 1 ? 0.62 : 0.52));
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = style === 1 ? '#f3d58a' : '#f3e2b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 2;
    const maxLen = h * (style === 1 ? 0.6 : 0.7);
    const size = fitText(ctx, title, maxLen, Math.min(w * 0.55, 30));
    if (size < w * 0.32 && title.includes(' ')) {
      // two lines
      const words = title.split(' ');
      const mid = Math.ceil(words.length / 2);
      const a = words.slice(0, mid).join(' ');
      const b = words.slice(mid).join(' ');
      const s2 = Math.min(fitText(ctx, a, maxLen, w * 0.36), fitText(ctx, b, maxLen, w * 0.36));
      ctx.font = `600 ${s2}px 'EB Garamond', Georgia, serif`;
      ctx.fillText(a, 0, -s2 * 0.55);
      ctx.fillText(b, 0, s2 * 0.55);
    } else {
      ctx.fillText(title, 0, 0);
    }
    ctx.restore();
    if (author) {
      ctx.fillStyle = 'rgba(243,226,184,.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitText(ctx, author, w * 0.86, w * 0.24, 500);
      ctx.fillText(author, x + w / 2, y + h * (style === 3 ? 0.89 : 0.955));
    }
  }
  ctx.restore();
}

function canvasTexture(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function radialSprite(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ───────────────────────── Fire shader ───────────────────────── */

const FIRE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FIRE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 1.35 + uSeed;
    float height = mix(0.42, 1.0, clamp(uPower, 0.0, 1.2));
    float y = uv.y / height;
    vec2 q = vec2(uv.x * 4.0, uv.y * 3.0 - t * 1.8);
    float n = fbm(q + vec2(fbm(q * 0.8 + t * 0.4), 0.0));
    // several tongues of flame across the width
    float tongues = 0.55 + 0.45 * sin(uv.x * 18.0 + n * 4.0 + uSeed);
    float x = (uv.x - 0.5) * 2.0;
    float width = mix(0.78, 0.06, clamp(y, 0.0, 1.0));
    float body = 1.0 - abs(x) / width;
    float f = body * (0.75 + 0.5 * tongues) - y * 0.75 + (n - 0.5) * 1.3;
    f = clamp(f, 0.0, 1.0);
    float a = smoothstep(0.02, 0.45, f) * smoothstep(1.15, 0.55, y) * smoothstep(0.04, 0.2, uv.y);
    vec3 deep = vec3(0.55, 0.06, 0.01);
    vec3 orange = vec3(1.0, 0.38, 0.05);
    vec3 core = vec3(1.0, 0.86, 0.55);
    vec3 col = mix(deep, orange, smoothstep(0.08, 0.45, f));
    col = mix(col, core, smoothstep(0.5, 0.9, f) * (1.0 - y * 0.6));
    gl_FragColor = vec4(col * a * (1.1 + 0.6 * uPower), a);
  }
`;

/* ───────────────────────── Room ───────────────────────── */

export async function createRoom(container, { onPick, onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'room-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050302');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.07;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 30);

  /* ── loading ── */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => onProgress?.(loaded / total);
  const texLoader = new THREE.TextureLoader(manager);
  const gltfLoader = new GLTFLoader(manager);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const texCache = new Map();
  function tex(name, kind, { repeat = [1, 1], color = false } = {}) {
    const key = `${name}_${kind}`;
    let base = texCache.get(key);
    if (!base) {
      base = texLoader.load(`${ASSETS}/tex/${name}_${kind}.jpg`);
      base.wrapS = base.wrapT = THREE.RepeatWrapping;
      base.anisotropy = maxAniso;
      if (color) base.colorSpace = THREE.SRGBColorSpace;
      texCache.set(key, base);
    }
    const t = base.clone();
    t.repeat.set(repeat[0], repeat[1]);
    t.needsUpdate = true;
    return t;
  }
  function pbr(name, { repeat = [1, 1], color = '#ffffff', roughness = 1, normalScale = 1, ...rest } = {}) {
    return new THREE.MeshStandardMaterial({
      map: tex(name, 'diff', { repeat, color: true }),
      normalMap: tex(name, 'nor', { repeat }),
      roughnessMap: tex(name, 'rough', { repeat }),
      normalScale: new THREE.Vector2(normalScale, normalScale),
      color,
      roughness,
      ...rest,
    });
  }
  const gltf = (id) =>
    new Promise((res, rej) =>
      gltfLoader.load(`${ASSETS}/models/${id}/${id}.gltf`, (g) => res(g.scene), undefined, rej)
    );

  const shadowy = (obj, cast = true, receive = true) => {
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = cast;
        o.receiveShadow = receive;
      }
    });
    return obj;
  };

  const box = (w, h, d, mat, x, y, z, { cast = true, receive = true } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  };

  /* ── materials ── */
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: tex('herringbone_parquet', 'diff', { repeat: [3.2, 3.2], color: true }), normalMap: tex('herringbone_parquet', 'nor', { repeat: [3.2, 3.2] }), color: '#7a5a44', roughness: 0.72, envMapIntensity: 0.4 }),
    plaster: pbr('painted_plaster_wall', { repeat: [3, 1.6], color: '#5d7360', normalScale: 0.6 }),
    panel: pbr('wooden_panels', { repeat: [3, 0.5], color: '#a07a62', roughness: 0.85 }),
    wood: pbr('dark_wood', { repeat: [1, 1], color: '#9a7a66', roughness: 0.8 }),
    woodDark: pbr('dark_wood', { repeat: [1, 2], color: '#4a3428', roughness: 0.85 }),
    brick: pbr('red_brick_03', { repeat: [1.5, 1.2], color: '#a08070', normalScale: 1.2 }),
    soot: pbr('red_brick_03', { repeat: [0.8, 0.9], color: '#2a1a14', normalScale: 1.2 }),
    slate: pbr('slate_floor_02', { repeat: [1.2, 0.5], color: '#5a5048', roughness: 0.8 }),
    rug: pbr('quatrefoil_jacquard_fabric', { repeat: [2.4, 1.6], color: '#7a4038', roughness: 1 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#1c1612', roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a050', metalness: 1, roughness: 0.32 }),
    wax: new THREE.MeshStandardMaterial({ color: '#efe3c6', roughness: 0.55 }),
  };
  M.brass.envMapIntensity = 6;

  /* ── architecture ── */
  const room = new THREE.Group();
  scene.add(room);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(3.5, 0, 3.5);
  floor.receiveShadow = true;
  room.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(3.5, H, 3.5);
  room.add(ceiling);

  // Each wall: plaster above, wooden panelling below, a chair rail, skirting, crown.
  function wall(alongX) {
    const g = new THREE.Group();
    const len = 7;
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.95), M.plaster);
    upper.position.set(len / 2, 0.95 + (H - 0.95) / 2, 0);
    const lower = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.95), M.panel);
    lower.position.set(len / 2, 0.475, 0.004);
    [upper, lower].forEach((m) => {
      m.receiveShadow = true;
      g.add(m);
    });
    g.add(box(len, 0.05, 0.03, M.wood, len / 2, 0.95, 0.015, { cast: false }));
    g.add(box(len, 0.13, 0.025, M.trim, len / 2, 0.065, 0.0125, { cast: false }));
    g.add(box(len, 0.1, 0.06, M.trim, len / 2, H - 0.05, 0.03, { cast: false }));
    if (!alongX) {
      // turn to face +x; local x then runs toward -z, so shift it back along z
      g.rotation.y = Math.PI / 2;
      g.position.z = len;
    }
    return g;
  }
  room.add(wall(true)); // right wall, plane z = 0
  room.add(wall(false)); // left wall, plane x = 0

  // Rug, laid diagonally in front of the chair.
  const rug = new THREE.Group();
  const rugBase = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), new THREE.MeshStandardMaterial({ color: '#2a1410', roughness: 1 }));
  rugBase.rotation.x = -Math.PI / 2;
  rugBase.position.y = 0.006;
  const rugTop = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.18), M.rug);
  rugTop.rotation.x = -Math.PI / 2;
  rugTop.position.y = 0.009;
  [rugBase, rugTop].forEach((m) => {
    m.receiveShadow = true;
    rug.add(m);
  });
  rug.position.set(1.55, 0, 1.55);
  rug.rotation.y = Math.PI / 4;
  room.add(rug);

  /* ── fireplace (on the right wall) ── */
  const fireplace = new THREE.Group();
  fireplace.name = 'fireplace';
  const fx = FIRE.x;
  const W = 1.5;
  const openW = 0.78;
  const openH = 0.78;
  const top = 1.12;
  const D = 0.34;
  const pillarW = (W - openW) / 2;
  fireplace.add(box(pillarW, top, D, M.brick, fx - W / 2 + pillarW / 2, top / 2, D / 2));
  fireplace.add(box(pillarW, top, D, M.brick, fx + W / 2 - pillarW / 2, top / 2, D / 2));
  fireplace.add(box(openW, top - openH, D, M.brick, fx, openH + (top - openH) / 2, D / 2));
  // firebox interior
  const back = new THREE.Mesh(new THREE.PlaneGeometry(openW, openH), M.soot);
  back.position.set(fx, openH / 2, 0.03);
  back.receiveShadow = true;
  fireplace.add(back);
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(D, openH), M.soot);
    s.rotation.y = -side * Math.PI / 2;
    s.position.set(fx + (side * openW) / 2, openH / 2, D / 2);
    fireplace.add(s);
  }
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(openW, D), M.soot);
  lid.rotation.x = Math.PI / 2;
  lid.position.set(fx, openH, D / 2);
  fireplace.add(lid);
  // chimney breast above, mantel shelf, hearth
  fireplace.add(box(W - 0.1, H - top, 0.1, M.plaster, fx, top + (H - top) / 2, 0.05, { cast: false }));
  fireplace.add(box(W + 0.22, 0.07, D + 0.12, M.wood, fx, top + 0.035, (D + 0.12) / 2));
  fireplace.add(box(W + 0.12, 0.05, D + 0.05, M.woodDark, fx, top - 0.025, (D + 0.05) / 2));
  fireplace.add(box(W + 0.3, 0.05, 0.78, M.slate, fx, 0.025, 0.39));
  // grate and logs
  const iron = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.55, metalness: 0.6 });
  for (let i = 0; i < 5; i++) fireplace.add(box(0.012, 0.012, 0.22, iron, fx - 0.22 + i * 0.11, 0.1, 0.19, { receive: false }));
  fireplace.add(box(0.5, 0.012, 0.012, iron, fx, 0.1, 0.1));
  fireplace.add(box(0.5, 0.012, 0.012, iron, fx, 0.1, 0.28));
  const bark = new THREE.MeshStandardMaterial({ color: '#140c07', roughness: 0.95, map: tex('dark_wood', 'diff', { repeat: [0.4, 1], color: true }) });
  const logGeo = new THREE.CylinderGeometry(0.042, 0.048, 0.44, 12);
  const logEnd = new THREE.MeshStandardMaterial({ color: '#2a1408', emissive: '#ff6a1a', emissiveIntensity: 0.9, roughness: 1 });
  [
    [0, 0.135, 0.13, 0.1],
    [0.02, 0.135, 0.24, -0.08],
    [-0.01, 0.205, 0.185, 0.45],
  ].forEach(([ox, oy, oz, ry]) => {
    const g = new THREE.Group();
    const l = new THREE.Mesh(logGeo, [bark, logEnd, logEnd]);
    l.rotation.z = Math.PI / 2;
    l.castShadow = true;
    g.add(l);
    g.position.set(fx + ox, oy, oz);
    g.rotation.y = ry;
    fireplace.add(g);
  });
  // glowing ember bed
  const emberCanvas = document.createElement('canvas');
  emberCanvas.width = emberCanvas.height = 128;
  {
    const c = emberCanvas.getContext('2d');
    const r = rng(5);
    c.fillStyle = '#1a0603';
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 6);
      const hot = r();
      g.addColorStop(0, hot > 0.7 ? '#ffcf6a' : hot > 0.35 ? '#ff7a1a' : '#a8300c');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.save();
      c.translate(r() * 128, r() * 128);
      c.fillStyle = g;
      c.fillRect(-6, -6, 12, 12);
      c.restore();
    }
  }
  const emberTex = canvasTexture(emberCanvas, renderer);
  const emberMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: emberTex, emissiveIntensity: 2.2, roughness: 1 });
  const embers = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.24), emberMat);
  embers.rotation.x = -Math.PI / 2;
  embers.position.set(fx, 0.11, 0.19);
  fireplace.add(embers);

  // the flames: two noise-shader sheets that turn toward the camera
  const fireMats = [0, 1].map(
    (i) =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uSeed: { value: i * 7.3 } },
        vertexShader: FIRE_VERT,
        fragmentShader: FIRE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
  );
  const flames = fireMats.map((mat, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62 - i * 0.12, 0.72), mat);
    m.position.set(fx + (i ? 0.04 : 0), 0.1 + 0.36, 0.17 - i * 0.02);
    m.renderOrder = 5;
    fireplace.add(m);
    return m;
  });
  // sparks
  const sparkCount = 26;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkLife = new Float32Array(sparkCount).map(() => Math.random());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ color: '#ffb35a', size: 0.012, map: radialSprite(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  fireplace.add(sparks);

  const fireLight = new THREE.PointLight('#ff7a2e', 6, 0, 2);
  fireLight.position.set(fx, 0.55, 0.42);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(512, 512);
  fireLight.shadow.bias = -0.002;
  fireLight.shadow.radius = 4;
  fireLight.shadow.camera.near = 0.1;
  fireplace.add(fireLight);
  const fireFill = new THREE.PointLight('#ff8a3a', 2, 0, 2);
  fireFill.position.set(fx, 0.55, 0.8);
  fireplace.add(fireFill);
  room.add(fireplace);

  // mantel: candles and the streak plaque
  const mantelY = top + 0.07;
  const candleFlames = [];
  const flameTex = radialSprite('rgba(255,236,170,1)', 'rgba(255,140,40,0)');
  for (const cx of [fx - 0.66, fx + 0.66]) {
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.02, 16), M.brass);
    holder.position.set(cx, mantelY + 0.01, 0.28);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 14), M.wax);
    candle.position.set(cx, mantelY + 0.12, 0.28);
    candle.castShadow = true;
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: '#ffd38a', blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.scale.set(0.035, 0.07, 1);
    fl.position.set(cx, mantelY + 0.25, 0.28);
    fl.material.color.multiplyScalar(4);
    candleFlames.push(fl);
    fireplace.add(holder, candle, fl);
  }
  const candleLight = new THREE.PointLight('#ffb060', 0.35, 0, 2);
  candleLight.position.set(fx, mantelY + 0.3, 0.35);
  fireplace.add(candleLight);

  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 256;
  plaqueCanvas.height = 160;
  const plaqueTex = canvasTexture(plaqueCanvas, renderer);
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.16, 0.025),
    [M.woodDark, M.woodDark, M.woodDark, M.woodDark, new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5, emissive: '#ffffff', emissiveMap: plaqueTex, emissiveIntensity: 0.12 }), M.woodDark]
  );
  plaque.position.set(fx - 0.34, mantelY + 0.085, 0.22);
  plaque.rotation.x = -0.12;
  plaque.castShadow = true;
  fireplace.add(plaque);

  function paintPlaque(streak) {
    const c = plaqueCanvas.getContext('2d');
    c.fillStyle = '#2a1a10';
    c.fillRect(0, 0, 256, 160);
    c.strokeStyle = '#c9a050';
    c.lineWidth = 8;
    c.strokeRect(8, 8, 240, 144);
    c.fillStyle = streak ? '#ff8a2a' : '#6a4a30';
    c.beginPath();
    c.moveTo(66, 30);
    c.bezierCurveTo(84, 54, 98, 66, 92, 92);
    c.bezierCurveTo(88, 112, 44, 112, 40, 92);
    c.bezierCurveTo(36, 74, 52, 66, 54, 52);
    c.bezierCurveTo(60, 62, 62, 70, 66, 74);
    c.bezierCurveTo(70, 58, 70, 44, 66, 30);
    c.fill();
    c.fillStyle = '#f3d58a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = "600 78px 'EB Garamond', Georgia, serif";
    c.fillText(String(streak), 166, 72);
    c.font = "600 22px 'EB Garamond', Georgia, serif";
    c.fillStyle = '#c9a050';
    c.fillText('DAY  STREAK', 128, 130);
    plaqueTex.needsUpdate = true;
  }

  /* ── bookshelf (on the left wall) ── */
  const shelf = new THREE.Group();
  shelf.name = 'shelf';
  // Built in a local frame (front +z, width along x), then turned to face +x.
  shelf.rotation.y = Math.PI / 2;
  shelf.position.set(0, 0, SHELF.z);
  const sw = SHELF.width;
  const sh = SHELF.height;
  const sd = SHELF.depth;
  const t = 0.035;
  const woodV = pbr('dark_wood', { repeat: [0.3, 2], color: '#8a6a56', roughness: 0.75 });
  shelf.add(box(t, sh, sd, woodV, -sw / 2 + t / 2, sh / 2, sd / 2));
  shelf.add(box(t, sh, sd, woodV, sw / 2 - t / 2, sh / 2, sd / 2));
  shelf.add(box(sw + 0.08, 0.06, sd + 0.04, M.wood, 0, sh + 0.03, sd / 2 + 0.01));
  shelf.add(box(sw + 0.04, 0.1, sd + 0.02, M.trim, 0, 0.05, sd / 2));
  shelf.add(box(sw - 2 * t, sh, 0.012, new THREE.MeshStandardMaterial({ color: '#1a100a', roughness: 0.9 }), 0, sh / 2, 0.006, { cast: false }));
  const rowBottoms = [0.12, 0.54, 0.96, 1.38, 1.8];
  rowBottoms.forEach((y) => shelf.add(box(sw - 2 * t, 0.028, sd - 0.02, M.wood, 0, y - 0.014, sd / 2)));
  // a brass library light along the top, casting down onto the books
  shelf.add(box(0.6, 0.025, 0.025, M.brass, 0, sh - 0.05, sd + 0.05, { cast: false }));
  const bulb = box(0.56, 0.012, 0.012, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd59a', emissiveIntensity: 3 }), 0, sh - 0.066, sd + 0.05, { cast: false });
  shelf.add(bulb);
  const shelfLight = new THREE.SpotLight('#ffcf8a', 11, 0, Math.PI / 3, 0.75, 2);
  shelfLight.position.set(0, sh - 0.08, sd + 0.16);
  shelfLight.target.position.set(0, 0.4, sd * 0.3);
  shelf.add(shelfLight, shelfLight.target);
  room.add(shelf);

  let booksMesh = null;
  let booksIndex = [];
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = 2048;
  atlasCanvas.height = 2048;
  const atlasTex = canvasTexture(atlasCanvas, renderer);
  const CELL_W = 64;
  const CELL_H = 256;
  const COLS = 2048 / CELL_W;
  const booksMat = new THREE.MeshStandardMaterial({ map: atlasTex, roughness: 0.7 });

  function buildShelfBooks(finished) {
    const r = rng(17);
    const ctx = atlasCanvas.getContext('2d');
    ctx.clearRect(0, 0, 2048, 2048);
    // last cell: page block
    const pagesCell = 255;
    const pcx = (pagesCell % COLS) * CELL_W;
    const pcy = Math.floor(pagesCell / COLS) * CELL_H;
    ctx.fillStyle = '#9a8a6c';
    ctx.fillRect(pcx, pcy, CELL_W, CELL_H);
    ctx.fillStyle = 'rgba(120,100,70,.25)';
    for (let i = 0; i < CELL_H; i += 3) ctx.fillRect(pcx, pcy + i, CELL_W, 1);
    const cellUV = (cell, px0, px1) => {
      const cx = (cell % COLS) * CELL_W;
      const cy = Math.floor(cell / COLS) * CELL_H;
      return [(cx + px0) / 2048, (cx + px1) / 2048, 1 - (cy + CELL_H - 2) / 2048, 1 - (cy + 2) / 2048];
    };
    const pagesUV = cellUV(pagesCell, 4, 60);

    const geos = [];
    const index = [];
    let real = 0;
    let cell = 0;
    const innerL = -sw / 2 + t + 0.01;
    const innerR = sw / 2 - t - 0.01;

    const addBook = (book, x, yBottom, thick, height, depth, color, { flat = false, lean = 0 } = {}) => {
      if (cell >= pagesCell) return;
      const myCell = cell++;
      const cx = (myCell % COLS) * CELL_W;
      const cy = Math.floor(myCell / COLS) * CELL_H;
      // 8px of solid cover colour, the rest is spine art
      ctx.fillStyle = shade(color, 0.85);
      ctx.fillRect(cx, cy, 8, CELL_H);
      paintSpine(ctx, cx + 8, cy, CELL_W - 8, CELL_H, color, {
        title: book?.title || '',
        author: book ? (book.author || '').trim().split(/\s+/).pop() : '',
        seed: book ? hashStr(book.id) : Math.floor(r() * 1e6),
      });
      const spineUV = cellUV(myCell, 9, CELL_W - 1);
      const coverUV = cellUV(myCell, 2, 6);
      const g = new THREE.BoxGeometry(thick, height, depth);
      const uv = g.attributes.uv;
      const faceUV = [coverUV, coverUV, pagesUV, pagesUV, spineUV, pagesUV];
      for (let f = 0; f < 6; f++) {
        const [u0, u1, v0, v1] = faceUV[f];
        for (let k = 0; k < 4; k++) {
          const i = f * 4 + k;
          uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
        }
      }
      const m = new THREE.Matrix4();
      if (flat) {
        m.makeRotationZ(Math.PI / 2);
        m.setPosition(x, yBottom + thick / 2, depth / 2 + 0.02);
      } else {
        m.makeRotationZ(lean);
        m.setPosition(x, yBottom + height / 2 - Math.abs(lean) * thick * 0.5, depth / 2 + 0.02);
      }
      g.applyMatrix4(m);
      geos.push(g);
      index.push(book ? book.id : null);
    };

    // fill the eye-level shelves first
    [2, 3, 1, 4, 0].forEach((row) => {
      const y = rowBottoms[row];
      let x = innerL;
      if (row === 1 || row === 3) {
        // a little horizontal stack
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          const th = 0.028 + r() * 0.012;
          const len = 0.24 - i * 0.012;
          addBook(null, x + len / 2, y + i * 0.034, th, len, 0.17, FILLER[Math.floor(r() * FILLER.length)], { flat: true });
        }
        x += 0.27;
      }
      const limit = row === 2 ? innerR - 0.2 : innerR;
      while (x < limit) {
        const book = finished[real];
        const pages = book ? Number(book.totalPages) || 280 : 0;
        const thick = book ? 0.022 + (Math.min(pages, 1000) / 1000) * 0.045 : 0.02 + r() * 0.035;
        const height = book ? 0.22 + (hashStr(book.id) % 9) * 0.009 : 0.2 + r() * 0.1;
        if (x + thick > limit) break;
        addBook(book, x + thick / 2, y, thick, Math.min(height, 0.33), Math.min(height * 0.7, sd - 0.06), book ? book.color : FILLER[Math.floor(r() * FILLER.length)]);
        if (book) real++;
        x += thick + 0.002;
      }
      if (row === 2) {
        // a leaning book and a brass globe
        addBook(null, x + 0.03, y, 0.03, 0.27, 0.19, FILLER[3], { lean: -0.25 });
      }
    });
    atlasTex.needsUpdate = true;
    if (booksMesh) {
      shelf.remove(booksMesh);
      booksMesh.geometry.dispose();
    }
    booksMesh = new THREE.Mesh(mergeGeometries(geos, false), booksMat);
    booksMesh.castShadow = true;
    booksMesh.receiveShadow = true;
    booksMesh.name = 'shelf-books';
    shelf.add(booksMesh);
    booksIndex = index;
  }

  // globe on the third shelf
  const globe = new THREE.Group();
  const globeCanvas = document.createElement('canvas');
  globeCanvas.width = 256;
  globeCanvas.height = 128;
  {
    const c = globeCanvas.getContext('2d');
    c.fillStyle = '#2c5a6e';
    c.fillRect(0, 0, 256, 128);
    const r = rng(9);
    c.fillStyle = '#8a7a48';
    for (let i = 0; i < 14; i++) {
      c.beginPath();
      c.ellipse(r() * 256, 20 + r() * 88, 10 + r() * 26, 6 + r() * 18, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  const globeBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 16), new THREE.MeshStandardMaterial({ map: canvasTexture(globeCanvas, renderer), roughness: 0.4 }));
  globeBall.position.y = 0.15;
  globeBall.rotation.z = 0.4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.004, 8, 48), M.brass);
  ring.position.y = 0.15;
  ring.rotation.y = Math.PI / 2;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.05, 0.06, 16), M.brass);
  stand.position.y = 0.03;
  globe.add(globeBall, ring, stand);
  shadowy(globe);
  globe.position.set(sw / 2 - 0.13, rowBottoms[2], sd / 2);
  shelf.add(globe);

  /* ── models ── */
  onProgress?.(0);
  const [chair, nightstand, lamp, clock, frame, plant] = await Promise.all(
    ['ArmChair_01', 'ClassicNightstand_01', 'vintage_oil_lamp', 'mantel_clock_01', 'fancy_picture_frame_01', 'potted_plant_02'].map(gltf)
  );

  chair.scale.setScalar(1.08);
  chair.position.set(CHAIR.x, 0, CHAIR.z);
  chair.rotation.y = Math.PI / 4;
  shadowy(chair);
  chair.traverse((o) => {
    if (o.isMesh) {
      o.material.envMapIntensity = 2.5;
      o.material.roughness = 1;
    }
  });
  room.add(chair);

  const stand2 = new THREE.Group();
  stand2.name = 'nightstand';
  nightstand.position.set(0, 0, 0);
  stand2.scale.setScalar(1.12);
  shadowy(nightstand);
  stand2.add(nightstand);
  stand2.position.set(NIGHTSTAND.x, 0, NIGHTSTAND.z);
  stand2.rotation.y = Math.PI / 2; // front faces +x
  room.add(stand2);
  const standTop = 0.7;

  lamp.scale.setScalar(0.9);
  lamp.position.set(-0.17, standTop, -0.07);
  shadowy(lamp, false, false);
  lamp.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.name.includes('glass')) {
      o.material.transparent = true;
      o.material.opacity = 0.28;
      o.material.depthWrite = false;
      o.material.roughness = 0.05;
      o.material.envMapIntensity = 4;
      o.renderOrder = 4;
    }
    if (o.material.name.includes('flame')) {
      o.material.emissive = new THREE.Color('#ffb050');
      o.material.emissiveIntensity = 6;
      o.material.toneMapped = true;
    }
  });
  stand2.add(lamp);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialSprite('rgba(255,200,120,.9)', 'rgba(255,160,60,0)'), blending: THREE.AdditiveBlending, depthWrite: false }));
  lampGlow.scale.set(0.3, 0.36, 1);
  lampGlow.position.set(-0.17, standTop + 0.44, -0.07);
  stand2.add(lampGlow);
  const lampLight = new THREE.PointLight('#ffb866', 2.2, 0, 2);
  lampLight.position.set(-0.17, standTop + 0.52, -0.07);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(256, 256);
  lampLight.shadow.bias = -0.003;
  stand2.add(lampLight);

  // coffee mug with steam
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#efe8da', roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const mugPts = [
    [0.0, 0.0], [0.034, 0.0], [0.037, 0.004], [0.039, 0.09], [0.036, 0.09], [0.034, 0.008], [0.0, 0.008],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const mug = new THREE.Group();
  mug.add(new THREE.Mesh(new THREE.LatheGeometry(mugPts, 32), ceramic));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 10, 24, Math.PI * 1.1), ceramic);
  handle.position.set(0.039, 0.048, 0);
  handle.rotation.z = -Math.PI / 2 - 0.15;
  mug.add(handle);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshStandardMaterial({ color: '#2a1408', roughness: 0.15 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.078;
  mug.add(coffee);
  shadowy(mug);
  mug.position.set(0.14, standTop, 0.1);
  mug.rotation.y = -0.6;
  stand2.add(mug);
  const steamTex = radialSprite('rgba(255,255,255,.55)', 'rgba(255,255,255,0)');
  const steam = Array.from({ length: 7 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.phase = i / 7;
    stand2.add(s);
    return s;
  });

  // current reads: stacked flat on the nightstand
  const currentGroup = new THREE.Group();
  stand2.add(currentGroup);
  const currentMats = [];
  function buildCurrentBooks(reading) {
    currentGroup.clear();
    currentMats.splice(0).forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    const pages = new THREE.MeshStandardMaterial({ color: '#e6d9b8', roughness: 0.9 });
    const onTop = reading.slice(0, 5);
    const below = reading.slice(5, 9);
    const place = (book, i, baseY, x0, z0) => {
      const p = Number(book.totalPages) || 300;
      const thick = 0.024 + (Math.min(p, 1000) / 1000) * 0.03;
      const len = 0.21 + (hashStr(book.id) % 5) * 0.01;
      const depth = len * 0.68;
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 96;
      const x = c.getContext('2d');
      // spine art, painted upright then rotated to lie flat
      const tmp = document.createElement('canvas');
      tmp.width = 96;
      tmp.height = 512;
      paintSpine(tmp.getContext('2d'), 0, 0, 96, 512, book.color, { title: book.title, author: (book.author || '').split(/\s+/).pop(), seed: hashStr(book.id) });
      x.translate(512, 0);
      x.rotate(Math.PI / 2);
      x.drawImage(tmp, 0, 0);
      const spineMat = new THREE.MeshStandardMaterial({ map: canvasTexture(c, renderer), roughness: 0.6 });
      const cover = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.6 });
      currentMats.push(spineMat, cover);
      // box: length along x, thickness y, depth z; spine faces +z (the nightstand front)
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, thick, depth), [pages, pages, cover, cover, spineMat, pages]);
      m.position.set(x0 + ((i * 37) % 7) * 0.004 - 0.012, baseY + thick / 2, z0 + ((i * 53) % 5) * 0.004);
      m.rotation.y = (((hashStr(book.id) % 9) - 4) / 4) * 0.07;
      m.castShadow = m.receiveShadow = true;
      m.userData.bookId = book.id;
      currentGroup.add(m);
      return thick;
    };
    let y = standTop;
    onTop.forEach((b, i) => (y += place(b, i, y, 0.06, -0.035) + 0.001));
    let y2 = 0.115;
    below.forEach((b, i) => (y2 += place(b, i + 5, y2, 0.0, 0.0) + 0.001));
    if (!reading.length) {
      // an inviting notepad with a pencil
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.2), new THREE.MeshStandardMaterial({ color: '#e9dcbc', roughness: 0.9 }));
      pad.position.set(0.05, standTop + 0.006, -0.02);
      pad.rotation.y = 0.2;
      const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 6), new THREE.MeshStandardMaterial({ color: '#c8902e' }));
      pencil.rotation.set(Math.PI / 2, 0, 0.5);
      pencil.position.set(0.06, standTop + 0.017, -0.02);
      currentGroup.add(shadowy(pad), shadowy(pencil));
    }
    return y;
  }

  clock.position.set(fx + 0.36, mantelY, 0.27);
  shadowy(clock);
  clock.traverse((o) => o.isMesh && o.material.name.includes('glass') && Object.assign(o.material, { transparent: true, opacity: 0.25 }));
  fireplace.add(clock);

  frame.scale.setScalar(1.45);
  frame.position.set(fx, 1.92, 0.1);
  shadowy(frame, false, true);
  fireplace.add(frame);

  plant.scale.setScalar(1.25);
  plant.position.set(fx + 1.05, 0, 0.42);
  plant.rotation.y = 0.8;
  shadowy(plant);
  room.add(plant);

  // a leather footstool in front of the chair
  const leather = pbr('brown_leather', { repeat: [1, 1], color: '#2a2422', roughness: 0.75 });
  leather.envMapIntensity = 2.5;
  const ottoman = new THREE.Group();
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.2, 0.4, 4, 0.06), leather);
  cushion.position.y = 0.26;
  ottoman.add(cushion);
  const legMat = new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 0.5 });
  for (const [lx, lz] of [[-0.21, -0.15], [0.21, -0.15], [-0.21, 0.15], [0.21, 0.15]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.16, 10), legMat);
    leg.position.set(lx, 0.08, lz);
    ottoman.add(leg);
  }
  for (let i = 0; i < 9; i++) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), M.brass);
    stud.position.set(-0.24 + i * 0.06, 0.2, 0.201);
    ottoman.add(stud);
  }
  shadowy(ottoman);
  ottoman.position.set(1.42, 0, 1.42);
  ottoman.rotation.y = Math.PI / 4;
  room.add(ottoman);


  /* ── lighting ── */
  scene.add(new THREE.HemisphereLight('#6a5040', '#1a0e08', 0.6));
  // soft warm bounce light filling the room
  const bounce = new THREE.PointLight('#ff9a50', 1.6, 0, 2);
  bounce.position.set(1.8, 2.3, 1.8);
  scene.add(bounce);

  /* ── camera & framing ── */
  const pivot = new THREE.Vector3();
  const home = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  let yaw = 0;
  let pitch = 0;
  let yawVel = 0;
  let pitchVel = 0;

  function frameCamera() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const aspect = w / h;
    renderer.setSize(w, h);
    composer?.setSize(w, h);
    camera.aspect = aspect;
    // keep a usable horizontal field of view on tall phones
    const hfov = THREE.MathUtils.degToRad(aspect < 1 ? 56 : 64);
    const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect));
    camera.fov = THREE.MathUtils.clamp(vfov, 48, 94);
    camera.updateProjectionMatrix();
    const portrait = aspect < 0.8;
    home.look.set(1.0, portrait ? 0.86 : 0.95, 1.0);
    const dist = portrait ? 2.8 : 3.0;
    home.pos.set(home.look.x + dist * 0.707, portrait ? 1.55 : 1.55, home.look.z + dist * 0.707);
    pivot.copy(home.pos);
  }

  /* ── post-processing ── */
  let composer = null;
  let bloom = null;
  let useComposer = true;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.5, 0.88);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  } catch {
    useComposer = false;
  }
  frameCamera();
  camera.position.copy(home.pos);
  camera.lookAt(home.look);

  /* ── labels ── */
  const labelLayer = document.createElement('div');
  labelLayer.className = 'room-labels';
  container.appendChild(labelLayer);
  const anchors = [
    { go: 'shelf', text: 'Bookshelf', pos: new THREE.Vector3(0.36, 1.45, SHELF.z - 0.35) },
    { go: 'stats', text: 'Stats & goals', pos: new THREE.Vector3(fx, top + 0.5, 0.3) },
    { go: 'current', text: 'Current reads', pos: new THREE.Vector3(NIGHTSTAND.x + 0.3, 0.42, NIGHTSTAND.z + 0.02) },
  ];
  anchors.forEach((a) => {
    a.el = document.createElement('button');
    a.el.className = 'room-label';
    a.el.dataset.go = a.go;
    a.el.innerHTML = `<i></i><span>${a.text}</span>`;
    a.el.addEventListener('click', (e) => {
      e.stopPropagation();
      pick(a.go);
    });
    labelLayer.appendChild(a.el);
  });
  const v3 = new THREE.Vector3();
  function placeLabels() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (const a of anchors) {
      v3.copy(a.pos).project(camera);
      const visible = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      const x = THREE.MathUtils.clamp((v3.x * 0.5 + 0.5) * w, 70, w - 70);
      const y = (-v3.y * 0.5 + 0.5) * h;
      a.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      a.el.style.opacity = visible ? '' : '0';
    }
  }

  /* ── interaction: drag to look around, tap to pick ── */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, moved: false };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) {
      hover(e);
      return;
    }
    const dx = e.clientX - down.lx;
    const dy = e.clientY - down.ly;
    down.lx = e.clientX;
    down.ly = e.clientY;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
    if (down.moved) {
      yawVel = dx * 0.0035;
      pitchVel = dy * 0.0025;
      yaw = THREE.MathUtils.clamp(yaw + yawVel, -0.5, 0.5);
      pitch = THREE.MathUtils.clamp(pitch + pitchVel, -0.22, 0.25);
    }
  });
  el.addEventListener('pointerup', (e) => {
    if (down && !down.moved && performance.now() - down.t < 500) {
      const hit = raycast(e);
      if (hit) pick(hit.go, hit.bookId);
    }
    down = null;
  });
  el.addEventListener('pointercancel', () => (down = null));

  const pickables = { shelf, fireplace, nightstand: stand2 };
  function raycast(e) {
    const rect = el.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([shelf, fireplace, stand2, chair], true);
    for (const h of hits) {
      if (h.object === flames[0] || h.object === flames[1] || h.object.isSprite || h.object.isPoints) continue;
      let o = h.object;
      if (o.userData.bookId) return { go: 'book', bookId: o.userData.bookId };
      if (o === booksMesh) {
        const id = booksIndex[Math.floor(h.faceIndex / 12)];
        return id ? { go: 'book', bookId: id } : { go: 'shelf' };
      }
      while (o) {
        if (o === pickables.shelf) return { go: 'shelf' };
        if (o === pickables.fireplace) return { go: 'stats' };
        if (o === pickables.nightstand) return { go: 'current' };
        if (o === chair) return null;
        o = o.parent;
      }
      return null;
    }
    return null;
  }
  function hover(e) {
    if (e.pointerType !== 'mouse') return;
    el.style.cursor = raycast(e) ? 'pointer' : 'grab';
  }

  // Fly toward what was tapped, then hand off to the app.
  let flight = null;
  const focusPoints = {
    shelf: () => ({ look: new THREE.Vector3(0.1, 1.15, SHELF.z), pos: new THREE.Vector3(1.7, 1.3, SHELF.z + 0.2) }),
    stats: () => ({ look: new THREE.Vector3(fx, 0.85, 0.1), pos: new THREE.Vector3(fx + 0.15, 1.15, 1.75) }),
    current: () => ({ look: new THREE.Vector3(NIGHTSTAND.x, 0.78, NIGHTSTAND.z), pos: new THREE.Vector3(NIGHTSTAND.x + 1.05, 1.2, NIGHTSTAND.z + 0.35) }),
  };
  function pick(go, bookId) {
    if (flight) return;
    navigator.vibrate?.(8);
    const key = go === 'book' ? (store_isShelfBook(bookId) ? 'shelf' : 'current') : go;
    const f = focusPoints[key]();
    flyTo(f.pos, f.look, 520, () => onPick?.(go, bookId));
  }
  let shelfIds = new Set();
  const store_isShelfBook = (id) => shelfIds.has(id);

  const curLook = new THREE.Vector3().copy(home.look);
  function flyTo(pos, look, ms, done) {
    flight = {
      from: camera.position.clone(),
      fromLook: curLook.clone(),
      to: pos,
      toLook: look,
      t0: performance.now(),
      ms,
      done,
    };
    start();
  }


  /* ── state from the app ── */
  let power = 1;
  function update(state, stats) {
    const finished = state.books
      .filter((b) => b.status === 'finished')
      .sort((a, b) => {
        if (!a.finishedAt !== !b.finishedAt) return a.finishedAt ? 1 : -1;
        return (a.finishedAt || '').localeCompare(b.finishedAt || '');
      });
    shelfIds = new Set(finished.map((b) => b.id));
    buildShelfBooks(finished);
    buildCurrentBooks(state.books.filter((b) => b.status === 'reading'));
    paintPlaque(stats.currentStreak);
    power = fireLevel(stats.currentStreak);
    anchors[2].el.querySelector('span').textContent = stats.reading.length ? 'Current reads' : 'Start a book';
    start();
  }

  /* ── animation ── */
  const clock3 = new THREE.Clock();
  let looping = false;
  let paused = false;
  let frames = 0;
  let slowFrames = 0;
  let last = performance.now();

  function animate(dt, time) {
    // fire
    fireMats.forEach((m) => {
      m.uniforms.uTime.value = time;
      m.uniforms.uPower.value = power;
    });
    flames.forEach((m, i) => {
      const dx = camera.position.x - m.position.x;
      const dz = camera.position.z - m.position.z;
      m.rotation.y = Math.atan2(dx, dz) + (i ? 0.5 : 0);
      m.scale.set(0.75 + power * 0.3, 0.55 + power * 0.5, 1);
      m.position.y = 0.1 + (0.36 * m.scale.y);
    });
    const flick = 0.82 + 0.1 * Math.sin(time * 13.1) + 0.08 * Math.sin(time * 7.3 + 1.3) + 0.05 * Math.sin(time * 23.7);
    fireLight.intensity = 5.5 * power * flick;
    fireFill.intensity = 2.2 * power * flick;
    fireLight.position.x = fx + Math.sin(time * 5.1) * 0.025;
    emberMat.emissiveIntensity = (1.4 + power) * (0.85 + 0.15 * Math.sin(time * 3.1));
    // sparks
    for (let i = 0; i < sparkCount; i++) {
      sparkLife[i] += dt * (0.35 + (i % 5) * 0.08);
      if (sparkLife[i] > 1) sparkLife[i] = 0;
      const l = sparkLife[i];
      sparkPos[i * 3] = fx + Math.sin(i * 12.9 + l * 6) * 0.12 * (1 - l * 0.4);
      sparkPos[i * 3 + 1] = 0.16 + l * (0.55 + power * 0.25);
      sparkPos[i * 3 + 2] = 0.16 + Math.cos(i * 4.1) * 0.06;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparks.material.opacity = Math.min(1, power);
    // candles & lamp
    candleFlames.forEach((f, i) => {
      const s = 1 + 0.12 * Math.sin(time * (9 + i * 3) + i);
      f.scale.set(0.035 * (2 - s), 0.07 * s, 1);
    });
    lampLight.intensity = 2.2 * (0.96 + 0.04 * Math.sin(time * 11.3));
    // steam
    steam.forEach((s) => {
      const p = (time * 0.22 + s.userData.phase) % 1;
      s.position.set(0.14 + Math.sin(p * 6 + s.userData.phase * 9) * 0.015, standTop + 0.1 + p * 0.22, 0.1 + Math.cos(p * 5) * 0.01);
      const sc = 0.035 + p * 0.06;
      s.scale.set(sc, sc * 1.4, 1);
      s.material.opacity = Math.sin(p * Math.PI) * 0.22;
    });
    // camera
    if (flight) {
      const k = Math.min(1, (performance.now() - flight.t0) / flight.ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(flight.from, flight.to, e);
      curLook.lerpVectors(flight.fromLook, flight.toLook, e);
      camera.lookAt(curLook);
      if (k >= 1) {
        const done = flight.done;
        flight = null;
        done?.();
      }
    } else if (!paused) {
      if (!down) {
        yawVel *= 0.9;
        pitchVel *= 0.9;
        yaw = THREE.MathUtils.clamp(yaw + yawVel, -0.5, 0.5);
        pitch = THREE.MathUtils.clamp(pitch + pitchVel, -0.22, 0.25);
      }
      const sway = Math.sin(time * 0.25) * 0.012;
      camera.position.copy(pivot);
      camera.position.y += Math.sin(time * 0.4) * 0.006;
      const dir = new THREE.Vector3().subVectors(home.look, home.pos);
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + sway);
      const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
      dir.applyAxisAngle(right, -pitch);
      curLook.copy(camera.position).add(dir);
      camera.lookAt(curLook);
    }
  }

  function render() {
    if (useComposer && composer) composer.render();
    else renderer.render(scene, camera);
    placeLabels();
  }

  function start() {
    if (looping) return;
    looping = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    animate(dt, clock3.getElapsedTime());
    render();
    // Adapt quality on slow devices: first drop bloom, then shadows.
    frames++;
    if (dt > 0.045) slowFrames++;
    if (frames === 90 && !FORCE_HQ) {
      if (slowFrames > 45 && useComposer) {
        useComposer = false;
        slowFrames = 0;
        frames = 0;
      } else if (slowFrames > 45 && renderer.shadowMap.enabled) {
        renderer.shadowMap.enabled = false;
        scene.traverse((o) => o.material && (o.material.needsUpdate = true));
      }
    }
    if (paused && !flight) {
      looping = false;
      return;
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    frameCamera();
    if (!flight && !paused) camera.position.copy(home.pos);
    render();
  });

  return {
    update,
    // Pause rendering while a page covers the room; resume with a glide home.
    setPaused(p) {
      if (p === paused) return;
      paused = p;
      if (!p) {
        if (camera.position.distanceTo(home.pos) > 0.05) {
          yaw = pitch = yawVel = pitchVel = 0;
          flight = { from: camera.position.clone(), fromLook: curLook.clone(), to: home.pos.clone(), toLook: home.look.clone(), t0: performance.now(), ms: 700 };
        }
        start();
      }
    },
    pick,
    get canvas() {
      return renderer.domElement;
    },
  };
}
