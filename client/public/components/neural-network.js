// Neural Network Background Controller
// Call initNeuralNetwork() when peer connects, stopNeuralNetwork() when peer disconnects

let neuralAnimId = null;
let neuralInitialized = false;

export async function initNeuralNetwork() {
  const canvas = document.getElementById('neural-network-canvas');
  if (!canvas) return;

  // Add Three.js importmap if not already present
  if (!document.querySelector('script[type="importmap"]')) {
    const importmap = document.createElement('script');
    importmap.type = 'importmap';
    importmap.textContent = JSON.stringify({
      imports: {
        "three": "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/"
      }
    });
    document.head.appendChild(importmap);
  }

  canvas.style.transition = 'opacity 1.2s ease';
  canvas.style.opacity = '1';

  if (neuralInitialized) return;
  neuralInitialized = true;

  // Dynamically import Three.js modules
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');

  const config = { paused: false, activePaletteIndex: 2, currentFormation: 0, numFormations: 3, densityFactor: 1 };

  // Use teal palette (index 2) to match SYNC_ROOM brand color #4CD9B0
  const colorPalettes = [
    [new THREE.Color(0x667eea), new THREE.Color(0x764ba2), new THREE.Color(0xf093fb), new THREE.Color(0x9d50bb), new THREE.Color(0x6e48aa)],
    [new THREE.Color(0xf857a6), new THREE.Color(0xff5858), new THREE.Color(0xfeca57), new THREE.Color(0xff6348), new THREE.Color(0xff9068)],
    [new THREE.Color(0x4CD9B0), new THREE.Color(0x00f2fe), new THREE.Color(0x43e97b), new THREE.Color(0x38f9d7), new THREE.Color(0x4484ce)]
  ];

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.002);
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 28);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Starfield
  function createStarfield() {
    const count = 8000;
    const positions = [], colors = [], sizes = [];
    for (let i = 0; i < count; i++) {
      const r = THREE.MathUtils.randFloat(50, 150);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      const colorChoice = Math.random();
      if (colorChoice < 0.7) colors.push(1, 1, 1);
      else if (colorChoice < 0.85) colors.push(0.7, 0.8, 1);
      else colors.push(1, 0.9, 0.8);
      sizes.push(THREE.MathUtils.randFloat(0.1, 0.3));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uTime;
        void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * 2.0 + position.x * 100.0) * 0.3 + 0.7;
        gl_PointSize = size * twinkle * (300.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
      fragmentShader: `varying vec3 vColor; void main() { vec2 center = gl_PointCoord - 0.5;
        float dist = length(center); if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist); gl_FragColor = vec4(vColor, alpha * 0.8); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  const starField = createStarfield();
  scene.add(starField);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.6; controls.minDistance = 8; controls.maxDistance = 80;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.2; controls.enablePan = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.6, 0.7);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const pulseUniforms = {
    uTime: { value: 0.0 },
    uPulsePositions: { value: [new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3)] },
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
    uPulseColors: { value: [new THREE.Color(1,1,1), new THREE.Color(1,1,1), new THREE.Color(1,1,1)] },
    uPulseSpeed: { value: 18.0 }, uBaseNodeSize: { value: 0.6 }
  };

  class Node3D {
    constructor(position, level = 0, type = 0) {
      this.position = position; this.connections = []; this.level = level; this.type = type;
      this.size = type === 0 ? THREE.MathUtils.randFloat(0.8, 1.4) : THREE.MathUtils.randFloat(0.5, 1.0);
      this.distanceFromRoot = 0;
    }
    addConnection(node, strength = 1.0) {
      if (!this.connections.some(c => c.node === node)) {
        this.connections.push({ node, strength });
        node.connections.push({ node: this, strength });
      }
    }
  }

  function generateNetwork() {
    const nodes = [];
    const rootNode = new Node3D(new THREE.Vector3(0, 0, 0), 0, 0);
    rootNode.size = 2.0; nodes.push(rootNode);
    const layers = 5, goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let layer = 1; layer <= layers; layer++) {
      const radius = layer * 4, numPoints = Math.floor(layer * 12);
      for (let i = 0; i < numPoints; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints);
        const theta = 2 * Math.PI * i / goldenRatio;
        const pos = new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
        const node = new Node3D(pos, layer, layer === layers ? 1 : 0);
        node.distanceFromRoot = radius; nodes.push(node);
        if (layer > 1) {
          const prev = nodes.filter(n => n.level === layer - 1).sort((a,b) => pos.distanceTo(a.position) - pos.distanceTo(b.position));
          for (let j = 0; j < Math.min(2, prev.length); j++) node.addConnection(prev[j], 0.8);
        } else rootNode.addConnection(node, 0.9);
      }
    }
    return { nodes, rootNode };
  }

  let nodesMesh = null, connectionsMesh = null;
  function buildScene() {
    if (nodesMesh) { scene.remove(nodesMesh); nodesMesh.geometry.dispose(); nodesMesh.material.dispose(); }
    if (connectionsMesh) { scene.remove(connectionsMesh); connectionsMesh.geometry.dispose(); connectionsMesh.material.dispose(); }
    const net = generateNetwork();
    const palette = colorPalettes[config.activePaletteIndex];
    const nodePos = [], nodeTypes = [], nodeSizes = [], nodeColors = [], dists = [];
    net.nodes.forEach(n => {
      nodePos.push(n.position.x, n.position.y, n.position.z);
      nodeTypes.push(n.type); nodeSizes.push(n.size); dists.push(n.distanceFromRoot);
      const c = palette[Math.min(n.level, palette.length-1)].clone();
      nodeColors.push(c.r, c.g, c.b);
    });
    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePos, 3));
    nodesGeo.setAttribute('nodeType', new THREE.Float32BufferAttribute(nodeTypes, 1));
    nodesGeo.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
    nodesGeo.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3));
    nodesGeo.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(dists, 1));
    const nodesMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: `attribute float nodeSize; attribute float nodeType; attribute vec3 nodeColor; attribute float distanceFromRoot;
        uniform float uTime; uniform float uBaseNodeSize; varying vec3 vColor; varying float vNodeType;
        void main() { vColor = nodeColor; vNodeType = nodeType;
        float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = nodeSize * breathe * uBaseNodeSize * (1000.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition; }`,
      fragmentShader: `varying vec3 vColor; varying float vNodeType;
        void main() { vec2 center = 2.0 * gl_PointCoord - 1.0; float dist = length(center); if (dist > 1.0) discard;
        float glow = 1.0 - smoothstep(0.0, 1.0, dist); gl_FragColor = vec4(vColor * (0.8 + glow * 0.4), glow); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    nodesMesh = new THREE.Points(nodesGeo, nodesMat);
    scene.add(nodesMesh);

    const connPos = [], starts = [], ends = [], strengths = [], connColors = [];
    const seen = new Set();
    net.nodes.forEach((node, ni) => {
      node.connections.forEach(conn => {
        const ci = net.nodes.indexOf(conn.node);
        const key = [Math.min(ni,ci), Math.max(ni,ci)].join('-');
        if (!seen.has(key)) {
          seen.add(key);
          for (let s = 0; s < 20; s++) {
            const t = s / 19;
            connPos.push(t, 0, 0);
            starts.push(node.position.x, node.position.y, node.position.z);
            ends.push(conn.node.position.x, conn.node.position.y, conn.node.position.z);
            strengths.push(conn.strength);
            const c = palette[Math.min(node.level, palette.length-1)];
            connColors.push(c.r, c.g, c.b);
          }
        }
      });
    });
    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute('position', new THREE.Float32BufferAttribute(connPos, 3));
    connGeo.setAttribute('startPoint', new THREE.Float32BufferAttribute(starts, 3));
    connGeo.setAttribute('endPoint', new THREE.Float32BufferAttribute(ends, 3));
    connGeo.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(strengths, 1));
    connGeo.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connColors, 3));
    const connMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: `attribute vec3 startPoint; attribute vec3 endPoint; attribute float connectionStrength; attribute vec3 connectionColor;
        uniform float uTime; varying vec3 vColor; varying float vStrength; varying float vPath;
        void main() { float t = position.x; vPath = t; vColor = connectionColor; vStrength = connectionStrength;
        vec3 pos = mix(startPoint, endPoint, t); gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vColor; varying float vStrength; varying float vPath;
        void main() { float flow = sin(vPath * 20.0 - uTime * 3.0) * 0.5 + 0.5;
        gl_FragColor = vec4(vColor * (0.5 + flow * 0.5), vStrength * (0.4 + flow * 0.3)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    connectionsMesh = new THREE.LineSegments(connGeo, connMat);
    scene.add(connectionsMesh);
  }

  buildScene();

  const clock = new THREE.Clock();
  function animate() {
    neuralAnimId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (nodesMesh) nodesMesh.material.uniforms.uTime.value = t;
    if (connectionsMesh) connectionsMesh.material.uniforms.uTime.value = t;
    starField.rotation.y += 0.0002;
    starField.material.uniforms.uTime.value = t;
    controls.update();
    composer.render();
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}

export function stopNeuralNetwork() {
  const canvas = document.getElementById('neural-network-canvas');
  if (canvas) { canvas.style.transition = 'opacity 1.2s ease'; canvas.style.opacity = '0'; }
  if (neuralAnimId) { cancelAnimationFrame(neuralAnimId); neuralAnimId = null; }
}
