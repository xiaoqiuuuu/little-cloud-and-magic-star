import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';


const createPrismGeometry = (outline, height, options = {}) => {
  const {
    topScale = 1,
    topOffsetX = 0,
    topOffsetZ = 0,
  } = options;
  const halfHeight = height / 2;
  const positions = [];
  const indices = [];
  const contour = outline.map(([x, z]) => new THREE.Vector2(x, z));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  const center = outline.reduce(
    (result, [x, z]) => ({ x: result.x + x / outline.length, z: result.z + z / outline.length }),
    { x: 0, z: 0 },
  );
  const topOutline = outline.map(([x, z]) => [
    center.x + (x - center.x) * topScale + topOffsetX,
    center.z + (z - center.z) * topScale + topOffsetZ,
  ]);

  topOutline.forEach(([x, z]) => positions.push(x, halfHeight, z));
  outline.forEach(([x, z]) => positions.push(x, -halfHeight, z));

  triangles.forEach(([a, b, c]) => {
    indices.push(a, b, c);
    indices.push(c + outline.length, b + outline.length, a + outline.length);
  });

  outline.forEach((_, index) => {
    const next = (index + 1) % outline.length;
    indices.push(index, next + outline.length, index + outline.length);
    indices.push(index, next, next + outline.length);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};


const createShipNameTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  const text = '宇宙无敌号';
  const glyphs = [...text];
  const glyphSpacing = 230;
  const centerX = canvas.width / 2;
  const baselineY = canvas.height / 2 + 24;
  const getGlyphX = (index) => (index - (glyphs.length - 1) / 2) * glyphSpacing;
  const drawGlyphs = (method, y) => {
    glyphs.forEach((glyph, index) => {
      context[method](glyph, getGlyphX(index), y);
    });
  };

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(centerX, 0);
  context.transform(1, 0, -0.065, 1, 0, 0);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 238px "Songti SC", "STSong", "SimSun", serif';
  context.lineJoin = 'miter';
  context.miterLimit = 8;

  context.shadowColor = 'rgba(0, 0, 0, 0.96)';
  context.shadowBlur = 22;
  context.shadowOffsetY = 15;
  context.strokeStyle = 'rgba(1, 8, 16, 0.98)';
  context.lineWidth = 30;
  drawGlyphs('strokeText', baselineY);

  context.shadowColor = 'rgba(74, 176, 255, 0.62)';
  context.shadowBlur = 18;
  context.shadowOffsetY = 0;
  context.strokeStyle = 'rgba(83, 128, 161, 0.92)';
  context.lineWidth = 16;
  drawGlyphs('strokeText', baselineY);

  const silver = context.createLinearGradient(0, 54, 0, 322);
  silver.addColorStop(0, '#eefaff');
  silver.addColorStop(0.2, '#778b9d');
  silver.addColorStop(0.43, '#ffffff');
  silver.addColorStop(0.62, '#91a0ad');
  silver.addColorStop(0.82, '#eaf8ff');
  silver.addColorStop(1, '#4c6172');
  context.fillStyle = silver;
  drawGlyphs('fillText', baselineY);

  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  context.lineWidth = 2.5;
  drawGlyphs('strokeText', baselineY - 2);

  context.globalCompositeOperation = 'source-atop';
  context.strokeStyle = 'rgba(6, 18, 30, 0.44)';
  context.lineWidth = 7;
  for (let index = -5; index <= 5; index += 1) {
    const x = index * 135;
    context.beginPath();
    context.moveTo(x - 68, 92);
    context.lineTo(x + 46, 310);
    context.stroke();
  }
  context.restore();

  context.globalCompositeOperation = 'source-over';
  const blade = context.createLinearGradient(70, 0, canvas.width - 70, 0);
  blade.addColorStop(0, 'rgba(151, 221, 255, 0)');
  blade.addColorStop(0.18, 'rgba(214, 244, 255, 0.88)');
  blade.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
  blade.addColorStop(0.82, 'rgba(119, 190, 231, 0.8)');
  blade.addColorStop(1, 'rgba(82, 159, 210, 0)');
  context.fillStyle = blade;
  context.beginPath();
  context.moveTo(54, 86);
  context.lineTo(1450, 56);
  context.lineTo(1338, 90);
  context.lineTo(126, 112);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(128, 328);
  context.lineTo(1400, 296);
  context.lineTo(1308, 326);
  context.lineTo(210, 350);
  context.closePath();
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
};


const createWingEngravingGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.8, 0.061, 1.25,
    2.55, 0.061, 1.98,
    2.7, 0.061, 2.51,
    -0.65, 0.061, 1.78,
  ], 3));
  // Keep the glyph baseline on the outer wing edge (the last two vertices).
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0.92,
    1, 0.92,
    1, 0.08,
    0, 0.08,
  ], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
};


const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(235, 250, 255, 1)');
  gradient.addColorStop(0.12, 'rgba(92, 200, 255, 0.96)');
  gradient.addColorStop(0.42, 'rgba(24, 107, 255, 0.48)');
  gradient.addColorStop(1, 'rgba(3, 20, 75, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};


const addEdges = (mesh, opacity = 0.2) => {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 22),
    new THREE.LineBasicMaterial({
      color: 0x55788e,
      transparent: true,
      opacity: opacity * 0.52,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.add(edges);
};


const addBox = (group, material, size, position, rotation = [0, 0, 0]) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
};


const createFlagship = () => {
  const ship = new THREE.Group();
  ship.name = '宇宙无敌号';

  const armor = new THREE.MeshPhysicalMaterial({
    color: 0x25313c,
    metalness: 0.96,
    roughness: 0.2,
    clearcoat: 0.68,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.65,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const armorLight = new THREE.MeshPhysicalMaterial({
    color: 0x52616d,
    metalness: 1,
    roughness: 0.21,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.12,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const armorDark = new THREE.MeshPhysicalMaterial({
    color: 0x050a0f,
    metalness: 0.94,
    roughness: 0.24,
    clearcoat: 0.46,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.35,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const gunmetal = new THREE.MeshPhysicalMaterial({
    color: 0x0d151d,
    metalness: 0.96,
    roughness: 0.25,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.4,
  });
  const energy = new THREE.MeshStandardMaterial({
    color: 0xa4e8ff,
    emissive: 0x168cff,
    emissiveIntensity: 5.4,
    metalness: 0.38,
    roughness: 0.16,
  });
  const windowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x06131d,
    emissive: 0x0b5278,
    emissiveIntensity: 0.9,
    metalness: 0.72,
    roughness: 0.14,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.7,
    transmission: 0.16,
    thickness: 0.08,
    transparent: true,
    opacity: 0.96,
  });
  const nameTexture = createShipNameTexture();
  const nameMaterial = new THREE.MeshBasicMaterial({
    map: nameTexture,
    color: 0xc9e7f1,
    transparent: true,
    opacity: 1,
    alphaTest: 0.025,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const mainHull = new THREE.Mesh(createPrismGeometry([
    [-7.15, 0], [-2.45, -1.08], [2.95, -1.58], [5.2, -1.1],
    [4.45, 0], [5.2, 1.1], [2.95, 1.58], [-2.45, 1.08],
  ], 1.02, { topScale: 0.84, topOffsetX: 0.26 }), armorDark);
  addEdges(mainHull, 0.28);
  ship.add(mainHull);

  const wingOutline = [
    [-5.2, 0.58], [-2.25, 0.88], [2.9, 1.36], [5.4, 3.72],
    [2.58, 3.2], [-2.05, 1.62],
  ];
  [1, -1].forEach((side) => {
    const wing = new THREE.Mesh(
      createPrismGeometry(wingOutline.map(([x, z]) => [x, z * side]), 0.38, {
        topScale: 0.9,
        topOffsetX: 0.12,
      }),
      armor,
    );
    wing.position.y = -0.12;
    addEdges(wing, 0.26);
    ship.add(wing);

    const wingArmor = new THREE.Mesh(createPrismGeometry([
      [-4.1, 0.82 * side], [-1.45, 1.08 * side], [2.35, 1.68 * side],
      [4.46, 3.08 * side], [2.18, 2.62 * side], [-1.78, 1.46 * side],
    ], 0.18, { topScale: 0.82, topOffsetX: 0.18 }), armorDark);
    wingArmor.position.y = 0.16;
    addEdges(wingArmor, 0.18);
    ship.add(wingArmor);

    const mainWingFacet = new THREE.Mesh(createPrismGeometry([
      [-3.95, 0.84 * side], [-1.25, 1.05 * side], [2.15, 1.52 * side],
      [4.48, 3.08 * side], [2.26, 3.05 * side], [-1.55, 1.72 * side],
    ], 0.11, { topScale: 0.9, topOffsetX: 0.12 }), armor);
    mainWingFacet.position.y = 0.285;
    addEdges(mainWingFacet, 0.22);
    ship.add(mainWingFacet);

    if (side === 1) {
      const wingEngraving = new THREE.Mesh(createWingEngravingGeometry(), nameMaterial);
      wingEngraving.renderOrder = 9;
      mainWingFacet.add(wingEngraving);
    }

    addBox(ship, energy, [2.25, 0.038, 0.07], [-2, 0.36, 1.16 * side], [0, -0.08 * side, 0]);
    addBox(ship, energy, [1.08, 0.036, 0.065], [3.34, 0.36, 2.98 * side], [0, -0.5 * side, 0]);
  });

  const upperArmor = new THREE.Mesh(createPrismGeometry([
    [-5.45, 0], [-1.25, -0.82], [2.75, -1.12], [4.1, -0.67],
    [3.42, 0], [4.1, 0.67], [2.75, 1.12], [-1.25, 0.82],
  ], 0.28, { topScale: 0.78, topOffsetX: 0.22 }), armor);
  upperArmor.position.y = 0.58;
  addEdges(upperArmor, 0.3);
  ship.add(upperArmor);

  const forwardCrown = new THREE.Mesh(createPrismGeometry([
    [-6.05, 0], [-2.1, -0.48], [-0.82, 0], [-2.1, 0.48],
  ], 0.1, { topScale: 0.8, topOffsetX: 0.12 }), armorLight);
  forwardCrown.position.y = 0.77;
  ship.add(forwardCrown);

  const spine = new THREE.Mesh(createPrismGeometry([
    [-4.7, 0], [-1.1, -0.3], [3.2, -0.42], [4.05, 0],
    [3.2, 0.42], [-1.1, 0.3],
  ], 0.3, { topScale: 0.7, topOffsetX: 0.28 }), armorDark);
  spine.position.y = 0.83;
  ship.add(spine);

  const bridgeBase = new THREE.Mesh(createPrismGeometry([
    [-0.85, -0.65], [2.55, -0.82], [3.2, 0], [2.55, 0.82], [-0.85, 0.65],
  ], 0.44, { topScale: 0.7, topOffsetX: 0.22 }), armor);
  bridgeBase.position.y = 1.03;
  addEdges(bridgeBase, 0.3);
  ship.add(bridgeBase);

  const bridge = new THREE.Mesh(createPrismGeometry([
    [-0.5, -0.56], [1.58, -0.62], [2.04, 0], [1.58, 0.62], [-0.5, 0.56],
  ], 0.62, { topScale: 0.68, topOffsetX: 0.18 }), armor);
  bridge.position.set(0.15, 1.45, 0);
  addEdges(bridge, 0.28);
  ship.add(bridge);
  const bridgeRoof = new THREE.Mesh(createPrismGeometry([
    [-0.18, -0.42], [1.32, -0.46], [1.65, 0], [1.32, 0.46], [-0.18, 0.42],
  ], 0.12, { topScale: 0.72, topOffsetX: 0.12 }), armorLight);
  bridgeRoof.position.set(0.38, 1.82, 0);
  ship.add(bridgeRoof);
  const commandDeck = new THREE.Mesh(createPrismGeometry([
    [-0.05, -0.38], [1.2, -0.42], [1.52, 0], [1.2, 0.42], [-0.05, 0.38],
  ], 0.42, { topScale: 0.58, topOffsetX: 0.12 }), armorDark);
  commandDeck.position.set(0.4, 1.96, 0);
  addEdges(commandDeck, 0.32);
  ship.add(commandDeck);
  const canopyWindow = new THREE.Mesh(createPrismGeometry([
    [-0.46, -0.27], [0.26, -0.3], [0.46, 0], [0.26, 0.3], [-0.46, 0.27],
  ], 0.032, { topScale: 0.9, topOffsetX: 0.02 }), windowMaterial);
  canopyWindow.position.set(0.56, 2.178, 0);
  ship.add(canopyWindow);
  addBox(ship, windowMaterial, [0.72, 0.06, 0.026], [0.48, 2.035, 0.405], [0, 0, -0.08]);
  addBox(ship, windowMaterial, [0.72, 0.06, 0.026], [0.48, 2.035, -0.405], [0, 0, -0.08]);
  const dorsalFin = new THREE.Mesh(createPrismGeometry([
    [-0.28, -0.25], [0.32, -0.28], [0.48, 0], [0.32, 0.28], [-0.28, 0.25],
  ], 1.34, { topScale: 0.38, topOffsetX: 0.08 }), gunmetal);
  dorsalFin.position.set(1.45, 2.52, 0);
  ship.add(dorsalFin);
  addBox(ship, energy, [2.85, 0.065, 0.1], [-1.42, 0.95, 0]);

  [-1, 1].forEach((side) => {
    for (let index = 0; index < 6; index += 1) {
      addBox(
        ship,
        index % 3 === 0 ? armorLight : gunmetal,
        [0.5 + (index % 2) * 0.13, 0.105, 0.2],
        [-1.72 + index * 0.75, 0.88 + (index % 2) * 0.055, side * (0.7 + index * 0.052)],
        [0, -side * 0.05, 0],
      );
    }

    [1.28, 2.45].forEach((z, engineIndex) => {
      const engine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 - engineIndex * 0.04, 0.42 - engineIndex * 0.04, 1.6, 18, 1),
        gunmetal,
      );
      engine.rotation.z = Math.PI / 2;
      engine.position.set(4.72, -0.18, side * z);
      ship.add(engine);

      const exhaust = new THREE.Mesh(new THREE.CircleGeometry(0.3 - engineIndex * 0.035, 24), energy);
      exhaust.rotation.y = Math.PI / 2;
      exhaust.position.set(5.55, -0.18, side * z);
      ship.add(exhaust);
    });

    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 2.1, 10), gunmetal);
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(-4.05, 0.18, side * 1.62);
    ship.add(cannon);
  });

  const glowTexture = createGlowTexture();
  [
    [5.76, -0.18, 1.28, 1.35], [5.76, -0.18, -1.28, 1.35],
    [5.78, -0.18, 2.45, 1.05], [5.78, -0.18, -2.45, 1.05],
  ].forEach(([x, y, z, scale]) => {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x58b9ff,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.position.set(x, y, z);
    glow.scale.set(scale * 2.2, scale * 2.2, 1);
    ship.add(glow);
  });

  const engineLight = new THREE.PointLight(0x238dff, 24, 12, 2);
  engineLight.position.set(5.1, 0, 0);
  ship.add(engineLight);

  ship.userData.glowTexture = glowTexture;
  ship.userData.nameTexture = nameTexture;
  ship.rotation.set(-0.025, -0.055, -0.014);
  return ship;
};


function XcdhFlagship3D() {
  const canvasRef = useRef(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || webglUnavailable) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        premultipliedAlpha: true,
      });
    } catch (error) {
      console.error('3D 旗舰初始化失败，已切换为静态备用画面。', error);
      setWebglUnavailable(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.environmentIntensity = 0.72;
    const environment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmremGenerator.fromScene(environment, 0.04);
    scene.environment = environmentTarget.texture;
    environment.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(-0.9, 7.9, 13.4);
    camera.lookAt(-0.4, 0.05, 0);

    scene.add(new THREE.HemisphereLight(0x9bc8e5, 0x010205, 1.1));
    const keyLight = new THREE.DirectionalLight(0xf6fbff, 5.1);
    keyLight.position.set(-7, 10, 9);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x237eff, 5.2);
    rimLight.position.set(8, 3, -9);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0xb7dfff, 9, 26, 2);
    fillLight.position.set(-4, 2.4, 8);
    scene.add(fillLight);

    const ship = createFlagship();
    ship.userData.nameTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    ship.userData.nameTexture.needsUpdate = true;
    ship.scale.setScalar(0.98);
    scene.add(ship);

    const pointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const freezeShipForVisualDebug = true;
    const handleContextLost = (event) => {
      event.preventDefault();
      setWebglUnavailable(true);
    };
    const handlePointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const startedAt = performance.now();
    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      if (!freezeShipForVisualDebug && !reducedMotion.matches) {
        ship.position.y = Math.sin(elapsed * 0.55) * 0.12;
        ship.rotation.x += ((-0.05 + pointer.y * 0.035) - ship.rotation.x) * 0.035;
        ship.rotation.y += ((-0.12 + pointer.x * 0.09) - ship.rotation.y) * 0.035;
        ship.rotation.z = -0.025 + Math.sin(elapsed * 0.34) * 0.012;
      }
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(render);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      window.removeEventListener('pointermove', handlePointerMove);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose?.();
        }
      });
      ship.userData.glowTexture?.dispose();
      ship.userData.nameTexture?.dispose();
      environmentTarget.dispose();
      renderer.dispose();
    };
  }, [webglUnavailable]);

  if (webglUnavailable) {
    return (
      <div className="xcdh-flagship-fallback-shell" aria-hidden="true">
        <img
          className="xcdh-flagship-fallback"
          src="/xcdh-flagship-cutout.svg"
          alt=""
          draggable="false"
        />
        <span>2D 兼容模式</span>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="xcdh-flagship-canvas" aria-hidden="true" />;
}


export default XcdhFlagship3D;
