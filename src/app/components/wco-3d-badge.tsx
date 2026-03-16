import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL_URL = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCO-badge-diamond.11.glb";

export function WCO3DBadge({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    container.appendChild(renderer.domElement);

    // ── Environment map for metallic reflections ──
    // Metallic PBR materials look black without something to reflect.
    // We build a simple gradient environment using CubeRenderTarget.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    // Soft gradient dome — dark navy below, lighter steel-blue above
    const envGeo = new THREE.SphereGeometry(10, 32, 32);
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x3a6ea5) },    // steel blue highlight
        midColor: { value: new THREE.Color(0x1a2a44) },    // mid navy
        bottomColor: { value: new THREE.Color(0x080e1a) }, // dark navy floor
        brightSpot: { value: new THREE.Color(0x7cb5e8) },  // bright specular spot
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 brightSpot;
        varying vec3 vWorldPos;
        void main() {
          float y = vWorldPos.y;
          // Base gradient
          vec3 color = mix(bottomColor, midColor, smoothstep(-1.0, 0.0, y));
          color = mix(color, topColor, smoothstep(0.0, 1.0, y));
          // Bright spot upper-right for key specular highlight
          float spot = smoothstep(0.6, 1.0, dot(vWorldPos, normalize(vec3(0.5, 0.7, 0.5))));
          color = mix(color, brightSpot, spot * 0.7);
          // Secondary warm spot lower-left
          float spot2 = smoothstep(0.7, 1.0, dot(vWorldPos, normalize(vec3(-0.4, -0.2, 0.6))));
          color = mix(color, vec3(0.35, 0.3, 0.45), spot2 * 0.4);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const envMesh = new THREE.Mesh(envGeo, envMat);
    envScene.add(envMesh);

    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;

    // Cleanup env generation resources
    envGeo.dispose();
    envMat.dispose();
    pmremGenerator.dispose();

    // ── Lights — studio rig for shiny metal ──
    // Key light (strong, upper right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    // Fill light (softer, opposite side)
    const fillLight = new THREE.DirectionalLight(0xb0c8e8, 1.5);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    // Rim / back light for edge definition
    const rimLight = new THREE.DirectionalLight(0x6aa3e0, 2.0);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Ambient — keep low so directional lights create contrast
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Accent point lights for brand-color reflections
    const bluePoint = new THREE.PointLight(0x4274b9, 2.5, 20);
    bluePoint.position.set(-3, 2, 3);
    scene.add(bluePoint);

    const accentPoint = new THREE.PointLight(0x6aa3e0, 1.5, 15);
    accentPoint.position.set(3, -1, 3);
    scene.add(accentPoint);

    // Subtle warm top-down spot for crown/top highlight
    const topSpot = new THREE.SpotLight(0xffeedd, 2.0, 15, Math.PI / 6, 0.5);
    topSpot.position.set(0, 6, 2);
    topSpot.target.position.set(0, 0, 0);
    scene.add(topSpot);
    scene.add(topSpot.target);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.minPolarAngle = Math.PI / 2.2;
    controls.maxPolarAngle = Math.PI / 1.8;
    // Limit horizontal rotation to ~40 degrees from center
    controls.minAzimuthAngle = -Math.PI / 9;
    controls.maxAzimuthAngle = Math.PI / 9;
    controls.dampingFactor = 0.05;
    controls.enableDamping = true;

    // Fallback: spinning wireframe octahedron while model loads
    const fallbackGeo = new THREE.OctahedronGeometry(0.8, 0);
    const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x4274b9, wireframe: true });
    const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
    scene.add(fallbackMesh);

    let modelGroup: THREE.Group | null = null;

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        scene.remove(fallbackMesh);
        fallbackGeo.dispose();
        fallbackMat.dispose();

        modelGroup = gltf.scene;

        // Enhance materials for shiny metallic look
        modelGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && mat.isMeshStandardMaterial) {
              // Boost metalness and lower roughness for shiny metal
              mat.metalness = Math.max(mat.metalness, 0.85);
              mat.roughness = Math.min(mat.roughness, 0.25);
              // Ensure environment map is applied
              mat.envMapIntensity = 1.8;
              mat.needsUpdate = true;
            }
          }
        });

        // Auto-scale model to fit view
        const box = new THREE.Box3().setFromObject(modelGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.125 / maxDim;
        modelGroup.scale.setScalar(scale);

        // Center model
        const center = box.getCenter(new THREE.Vector3());
        modelGroup.position.sub(center.multiplyScalar(scale));

        scene.add(modelGroup);
      },
      undefined,
      (error) => {
        console.warn("[WCO 3D Badge] GLB model failed to load:", error);
        // Keep the fallback wireframe visible
      }
    );

    // Animation loop
    const startTime = performance.now();
    let animationId: number;
    // Oscillate ~40 degrees (±20°) = ±0.35 rad
    const swingAmplitude = 0.35;
    const swingSpeed = 0.6;

    function animate() {
      animationId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      // Float the fallback or model
      if (modelGroup) {
        modelGroup.rotation.y = Math.sin(elapsed * swingSpeed) * swingAmplitude;
        modelGroup.position.y = Math.sin(elapsed * 0.8) * 0.05;
      } else {
        fallbackMesh.rotation.y = Math.sin(elapsed * swingSpeed) * swingAmplitude;
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    // Cleanup
    cleanupRef.current = () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[#4274B9]/5 rounded-2xl blur-3xl pointer-events-none" />
      <div ref={containerRef} className="w-full h-full rounded-2xl" />
    </div>
  );
}