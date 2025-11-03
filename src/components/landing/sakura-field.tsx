"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type SakuraFieldProps = {
  className?: string;
};

const PETAL_COUNT = 260;
const LETTER_POOL = "WORDLEOPABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GRID_SIZE = 8;
const ATLAS_SIZE = 1024;

const createLetterAtlas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create 2D context for letter atlas");
  }

  context.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${ATLAS_SIZE / GRID_SIZE * 0.64}px 'Segoe UI', 'Inter', sans-serif`;

  for (let index = 0; index < LETTER_POOL.length; index += 1) {
    const letter = LETTER_POOL[index];
    const col = index % GRID_SIZE;
    const row = Math.floor(index / GRID_SIZE);
    const cellSize = ATLAS_SIZE / GRID_SIZE;
    const centerX = col * cellSize + cellSize / 2;
    const centerY = row * cellSize + cellSize / 2;

    const gradient = context.createRadialGradient(centerX - cellSize * 0.2, centerY - cellSize * 0.2, cellSize * 0.1, centerX, centerY, cellSize * 0.7);
    gradient.addColorStop(0, "rgba(248,250,252,0.95)");
    gradient.addColorStop(0.35, "rgba(226,232,240,0.92)");
    gradient.addColorStop(0.7, "rgba(96,165,250,0.75)");
    gradient.addColorStop(1, "rgba(30,58,138,0.55)");

    context.fillStyle = gradient;
    context.shadowColor = "rgba(30,64,175,0.45)";
    context.shadowBlur = cellSize * 0.12;
    context.shadowOffsetY = cellSize * 0.06;
    context.fillText(letter, centerX, centerY + cellSize * 0.02);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
};

export function SakuraField({ className }: SakuraFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const atlasTexture = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return createLetterAtlas();
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !atlasTexture) {
      return;
    }

    let mounted = true;
    let animationFrame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 5);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PETAL_COUNT * 3);
    const seeds = new Float32Array(PETAL_COUNT);
    const scales = new Float32Array(PETAL_COUNT);
    const charIndices = new Float32Array(PETAL_COUNT);

    for (let i = 0; i < PETAL_COUNT; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = Math.random() * 6.5;
      const z = (Math.random() - 0.5) * 6;
      positions.set([x, y, z], i * 3);
      seeds[i] = Math.random() * Math.PI * 2;
      scales[i] = 0.7 + Math.random() * 0.9;
      charIndices[i] = Math.floor(Math.random() * LETTER_POOL.length);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aCharIndex", new THREE.BufferAttribute(charIndices, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uAtlas: { value: atlasTexture },
        uGridSize: { value: GRID_SIZE },
        uLetterCount: { value: LETTER_POOL.length },
      },
      vertexShader: `
        attribute float aSeed;
        attribute float aScale;
        attribute float aCharIndex;
        uniform float uTime;
        uniform float uLetterCount;
        varying float vAlpha;
        varying float vTwist;
        varying float vCharIndex;

        float easeOutExpo(float x) {
          return x == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x);
        }

        void main() {
          vec3 pos = position;
          float fall = fract((uTime * 0.058) + aSeed * 0.173);
          fall = easeOutExpo(fall);
          pos.y = 3.4 - fall * 10.2;
          pos.x += sin(uTime * 0.35 + aSeed * 6.2831) * 1.12;
          pos.z += cos(uTime * 0.3 + aSeed * 4.7123) * 0.9;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float dist = length(mvPosition.xyz);
          gl_PointSize = aScale * (168.0 / dist);
          vAlpha = smoothstep(0.0, 1.0, 1.0 - abs(pos.y) * 0.16);
          vTwist = sin((uTime * 0.95) + aSeed * 12.0);
          vCharIndex = mod(aCharIndex + floor(uTime * 1.35 + aSeed * 11.0), uLetterCount);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vTwist;
        varying float vCharIndex;
        uniform sampler2D uAtlas;
        uniform float uGridSize;

        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float petal = dot(uv, uv);
          if (petal > 1.0) {
            discard;
          }

          float grid = uGridSize;
          float col = mod(vCharIndex, grid);
          float row = floor(vCharIndex / grid);
          vec2 atlasUv = (gl_PointCoord + vec2(col, row)) / grid;
          vec4 glyph = texture(uAtlas, atlasUv);

          if (glyph.a < 0.05) {
            discard;
          }

          vec3 tintA = vec3(0.647, 0.773, 0.953);
          vec3 tintB = vec3(0.494, 0.729, 0.937);
          vec3 tintC = vec3(0.725, 0.836, 0.988);
          float tintMix = (sin(vTwist) * 0.5 + 0.5) * 0.5 + 0.25;
          vec3 color = mix(mix(tintA, tintB, tintMix), tintC, 0.32) * glyph.rgb;
          gl_FragColor = vec4(color, glyph.a * vAlpha * 0.82);
        }
      `,
    });

    const petals = new THREE.Points(geometry, material);
    petals.rotation.x = -0.2;
    scene.add(petals);

    const clock = new THREE.Clock();

    const renderScene = () => {
      if (!mounted) {
        return;
      }

      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;
      petals.rotation.y = Math.sin(elapsed * 0.07) * 0.2;

      renderer.clear();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(renderScene);
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }
      const bounds = parent.getBoundingClientRect();
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
    };

    resize();
    animationFrame = window.requestAnimationFrame(renderScene);

    resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const handleWindowResize = () => resize();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      mounted = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("resize", handleWindowResize);
      resizeObserver?.disconnect();
      geometry.dispose();
      material.dispose();
      atlasTexture.dispose();
      renderer.dispose();
    };
  }, [atlasTexture]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}