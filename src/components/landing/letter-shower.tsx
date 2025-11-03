"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type LetterShowerProps = {
  className?: string;
};

const LETTER_POOL = "WORDLEOPABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GRID_SIZE = 8;
const ATLAS_SIZE = 1024;
const LETTER_COUNT = 340;

const createLetterAtlas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create letter atlas context");
  }

  context.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${(ATLAS_SIZE / GRID_SIZE) * 0.66}px 'Inter', 'Segoe UI', sans-serif`;

  for (let index = 0; index < LETTER_POOL.length; index += 1) {
    const letter = LETTER_POOL[index];
    const col = index % GRID_SIZE;
    const row = Math.floor(index / GRID_SIZE);
    const cellSize = ATLAS_SIZE / GRID_SIZE;
    const centerX = col * cellSize + cellSize / 2;
    const centerY = row * cellSize + cellSize / 2;

    const gradient = context.createRadialGradient(
      centerX - cellSize * 0.2,
      centerY - cellSize * 0.15,
      cellSize * 0.12,
      centerX,
      centerY,
      cellSize * 0.7,
    );

    gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    gradient.addColorStop(0.35, "rgba(226, 232, 240, 0.85)");
    gradient.addColorStop(0.68, "rgba(147, 197, 253, 0.72)");
    gradient.addColorStop(1, "rgba(30, 64, 175, 0.48)");

    context.fillStyle = gradient;
    context.shadowColor = "rgba(37, 99, 235, 0.35)";
    context.shadowBlur = cellSize * 0.1;
    context.shadowOffsetY = cellSize * 0.05;
    context.fillText(letter, centerX, centerY);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
};

export function LetterShower({ className }: LetterShowerProps) {
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
    camera.position.set(0, 0, 6);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(LETTER_COUNT * 3);
    const seeds = new Float32Array(LETTER_COUNT);
    const scales = new Float32Array(LETTER_COUNT);
    const charIndices = new Float32Array(LETTER_COUNT);

    for (let i = 0; i < LETTER_COUNT; i += 1) {
      const x = (Math.random() - 0.5) * 9;
      const y = Math.random() * 6 + 2.5;
      const z = (Math.random() - 0.5) * 7;
      positions.set([x, y, z], i * 3);
      seeds[i] = Math.random() * Math.PI * 2;
      scales[i] = 0.45 + Math.random() * 0.75;
      charIndices[i] = Math.floor(Math.random() * LETTER_POOL.length);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aCharIndex", new THREE.BufferAttribute(charIndices, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
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
        varying float vCharIndex;
        varying float vTwist;

        float easeInOutQuad(float x) {
          return x < 0.5 ? 2.0 * x * x : 1.0 - pow(-2.0 * x + 2.0, 2.0) / 2.0;
        }

        void main() {
          vec3 pos = position;
          float baseHeight = pos.y;
          float cycle = fract(uTime * 0.085 + aSeed * 0.143);
          float fall = easeInOutQuad(cycle);

          pos.y = baseHeight - fall * 11.0;
          pos.x += sin(uTime * 0.44 + aSeed * 4.712) * 1.05;
          pos.z += cos(uTime * 0.38 + aSeed * 6.283) * 0.82;

          vTwist = sin(uTime * 1.35 + aSeed * 7.4);
          float sway = sin(uTime * 0.82 + aSeed * 5.6) * 0.32;
          float tilt = cos(uTime * 0.66 + aSeed * 7.1) * 0.26;

          mat2 rot = mat2(cos(sway), -sin(sway), sin(sway), cos(sway));
          pos.xz = rot * pos.xz;
          pos.yz = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * pos.yz;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float dist = length(mvPosition.xyz);
          gl_PointSize = aScale * (136.0 / dist);
          float fadeIn = smoothstep(0.0, 0.2, cycle);
          float fadeOut = smoothstep(0.0, 0.25, 1.0 - cycle);
          vAlpha = fadeIn * fadeOut;
          vCharIndex = mod(aCharIndex + floor(uTime * 0.45 + aSeed * 7.0), uLetterCount);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vCharIndex;
        varying float vTwist;
        uniform sampler2D uAtlas;
        uniform float uGridSize;

        void main() {
          vec2 uv = gl_PointCoord;
          float grid = uGridSize;
          float col = mod(vCharIndex, grid);
          float row = floor(vCharIndex / grid);
          vec2 atlasUv = (uv + vec2(col, row)) / grid;
          vec4 glyph = texture(uAtlas, atlasUv);

          if (glyph.a < 0.06) {
            discard;
          }

          float rotation = vTwist;
          vec2 centered = uv - 0.5;
          mat2 rot = mat2(
            cos(rotation), -sin(rotation),
            sin(rotation), cos(rotation)
          );
          centered = rot * centered;
          centered += 0.5;
          vec2 tintUv = clamp(centered, 0.0, 1.0);

          vec3 tintA = vec3(0.725, 0.831, 0.973);
          vec3 tintB = vec3(0.537, 0.741, 0.973);
          vec3 tintC = vec3(0.902, 0.941, 0.992);
          float mixAB = smoothstep(0.0, 1.0, tintUv.y);
          vec3 color = mix(mix(tintA, tintB, mixAB), tintC, 0.25);

          gl_FragColor = vec4(color * glyph.rgb, glyph.a * vAlpha * 0.82);
        }
      `,
    });

    const letters = new THREE.Points(geometry, material);
    letters.rotation.x = -0.18;
    scene.add(letters);

    const clock = new THREE.Clock();

    const renderScene = () => {
      if (!mounted) {
        return;
      }

      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;
      letters.rotation.y = Math.sin(elapsed * 0.14) * 0.25;
      letters.rotation.z = Math.sin(elapsed * 0.08) * 0.15;

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