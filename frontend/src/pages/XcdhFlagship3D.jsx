import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';


const createPrismGeometry = (outline, height) => {
  const halfHeight = height / 2;
  const positions = [];
  const indices = [];
  const contour = outline.map(([x, z]) => new THREE.Vector2(x, z));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);

  outline.forEach(([x, z]) => positions.push(x, halfHeight, z));
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
      color: 0x91b5ca,
      transparent: true,
      opacity,
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

  const armor = new THREE.MeshStandardMaterial({
    color: 0x313b46,
    metalness: 0.94,
    roughness: 0.27,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const armorLight = new THREE.MeshStandardMaterial({
    color: 0x8795a2,
    metalness: 0.96,
    roughness: 0.22,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const armorDark = new THREE.MeshStandardMaterial({
    color: 0x080d13,
    metalness: 0.88,
    roughness: 0.34,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0x151d25,
    metalness: 0.92,
    roughness: 0.3,
  });
  const energy = new THREE.MeshStandardMaterial({
    color: 0xa4e8ff,
    emissive: 0x168cff,
    emissiveIntensity: 7,
    metalness: 0.38,
    roughness: 0.16,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xccefff,
    emissive: 0x2b9dff,
    emissiveIntensity: 3.8,
    metalness: 0.35,
    roughness: 0.12,
  });

  const mainHull = new THREE.Mesh(createPrismGeometry([
    [-6.5, 0], [-2.2, -1.18], [2.9, -1.7], [5.05, -1.18],
    [4.25, 0], [5.05, 1.18], [2.9, 1.7], [-2.2, 1.18],
  ], 0.92), armorDark);
  addEdges(mainHull, 0.28);
  ship.add(mainHull);

  const wingOutline = [
    [-4.65, 0.62], [-2.05, 0.94], [2.85, 1.48], [5.18, 3.92],
    [2.45, 3.38], [-1.85, 1.76],
  ];
  [1, -1].forEach((side) => {
    const wing = new THREE.Mesh(
      createPrismGeometry(wingOutline.map(([x, z]) => [x, z * side]), 0.34),
      armor,
    );
    wing.position.y = -0.12;
    addEdges(wing, 0.26);
    ship.add(wing);

    const wingArmor = new THREE.Mesh(createPrismGeometry([
      [-3.55, 0.92 * side], [-1.35, 1.18 * side], [2.48, 1.8 * side],
      [4.28, 3.23 * side], [2.2, 2.76 * side], [-1.55, 1.55 * side],
    ], 0.16), armorLight);
    wingArmor.position.y = 0.16;
    addEdges(wingArmor, 0.18);
    ship.add(wingArmor);

    addBox(ship, energy, [2.8, 0.055, 0.12], [-0.8, 0.32, 1.63 * side], [0, -0.08 * side, 0]);
    addBox(ship, energy, [1.5, 0.05, 0.1], [2.45, 0.31, 2.62 * side], [0, -0.48 * side, 0]);
  });

  const upperArmor = new THREE.Mesh(createPrismGeometry([
    [-5.45, 0], [-1.25, -0.82], [2.75, -1.12], [4.1, -0.67],
    [3.42, 0], [4.1, 0.67], [2.75, 1.12], [-1.25, 0.82],
  ], 0.24), armorLight);
  upperArmor.position.y = 0.58;
  addEdges(upperArmor, 0.3);
  ship.add(upperArmor);

  const spine = new THREE.Mesh(createPrismGeometry([
    [-4.7, 0], [-1.1, -0.3], [3.2, -0.42], [4.05, 0],
    [3.2, 0.42], [-1.1, 0.3],
  ], 0.24), armorDark);
  spine.position.y = 0.83;
  ship.add(spine);

  const bridgeBase = new THREE.Mesh(createPrismGeometry([
    [-0.85, -0.65], [2.55, -0.82], [3.2, 0], [2.55, 0.82], [-0.85, 0.65],
  ], 0.38), armor);
  bridgeBase.position.y = 1.03;
  addEdges(bridgeBase, 0.3);
  ship.add(bridgeBase);

  const bridge = addBox(ship, armorLight, [1.7, 0.58, 1.1], [0.85, 1.45, 0], [0, 0, -0.07]);
  addEdges(bridge, 0.28);
  const commandDeck = addBox(ship, armorDark, [1.08, 0.4, 0.76], [0.92, 1.92, 0], [0, 0, -0.08]);
  addEdges(commandDeck, 0.32);
  addBox(ship, windowMaterial, [0.72, 0.09, 0.8], [0.45, 2.12, 0], [0, 0, -0.08]);
  addBox(ship, gunmetal, [0.18, 1.45, 0.52], [1.55, 2.35, 0], [0, 0, -0.12]);
  addBox(ship, energy, [2.85, 0.065, 0.1], [-1.42, 0.95, 0]);

  [-1, 1].forEach((side) => {
    for (let index = 0; index < 8; index += 1) {
      addBox(
        ship,
        index % 3 === 0 ? armorLight : gunmetal,
        [0.42 + (index % 2) * 0.12, 0.16, 0.27],
        [-1.8 + index * 0.63, 0.86 + (index % 2) * 0.08, side * (0.72 + index * 0.045)],
        [0, -side * 0.05, 0],
      );
    }

    [1.28, 2.45].forEach((z, engineIndex) => {
      const engine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 - engineIndex * 0.04, 0.42 - engineIndex * 0.04, 1.6, 18, 1),
        gunmetal,
      );
      engine.rotation.z = Math.PI / 2;
      engine.position.set(4.45, -0.18, side * z);
      ship.add(engine);

      const exhaust = new THREE.Mesh(new THREE.CircleGeometry(0.3 - engineIndex * 0.035, 24), energy);
      exhaust.rotation.y = Math.PI / 2;
      exhaust.position.set(5.27, -0.18, side * z);
      ship.add(exhaust);
    });

    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 2.1, 10), gunmetal);
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(-3.65, 0.22, side * 1.72);
    ship.add(cannon);
  });

  const glowTexture = createGlowTexture();
  [
    [5.48, -0.18, 1.28, 1.35], [5.48, -0.18, -1.28, 1.35],
    [5.5, -0.18, 2.45, 1.05], [5.5, -0.18, -2.45, 1.05],
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
  engineLight.position.set(4.6, 0, 0);
  ship.add(engineLight);

  ship.userData.glowTexture = glowTexture;
  ship.rotation.set(-0.05, -0.12, -0.025);
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
    renderer.toneMappingExposure = 1.28;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(-0.7, 5.1, 15.4);
    camera.lookAt(-0.25, 0.1, 0);

    scene.add(new THREE.HemisphereLight(0x8bb7d8, 0x010205, 1.8));
    const keyLight = new THREE.DirectionalLight(0xf2f8ff, 5.6);
    keyLight.position.set(-6, 9, 8);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x176dff, 4.5);
    rimLight.position.set(7, 2, -8);
    scene.add(rimLight);

    const ship = createFlagship();
    ship.scale.setScalar(1.03);
    scene.add(ship);

    const pointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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

    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      if (!reducedMotion.matches) {
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
      renderer.dispose();
    };
  }, [webglUnavailable]);

  if (webglUnavailable) {
    return (
      <img
        className="xcdh-flagship-fallback"
        src="/xcdh-flagship-cutout.svg"
        alt=""
        draggable="false"
        aria-hidden="true"
      />
    );
  }

  return <canvas ref={canvasRef} className="xcdh-flagship-canvas" aria-hidden="true" />;
}


export default XcdhFlagship3D;
