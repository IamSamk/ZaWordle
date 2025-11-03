"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import helvetikerFont from "three/examples/fonts/helvetiker_regular.typeface.json";

type MirroredTitleProps = {
  pointer: { x: number; y: number };
  className?: string;
};

const TITLE = "WORDLE";
const LETTER_SPACING = 0.48;
const LETTER_SIZE = 1.68;
type CompileShader = Parameters<THREE.Material["onBeforeCompile"]>[0];

export function MirroredTitle({ pointer, className }: MirroredTitleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef(pointer);

  const letterData = useMemo(() => TITLE.split(""), []);
  const font = useMemo(() => {
    const loader = new FontLoader();
    type FontJson = Parameters<(typeof loader)["parse"]>[0];
    return loader.parse(helvetikerFont as FontJson);
  }, []);

  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let mounted = true;
    let animationFrame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1727, 0.32);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.78, 8.6);

  const mainGroup = new THREE.Group();
  mainGroup.position.set(0, 0.06, 0);
  mainGroup.scale.setScalar(1.05);
    scene.add(mainGroup);

    const glowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 6),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x11203a),
        transparent: true,
        opacity: 0.55,
      }),
    );
    glowPlane.position.set(0, -1.2, -0.6);
    glowPlane.rotateX(-Math.PI / 2);
    mainGroup.add(glowPlane);

    const ambient = new THREE.AmbientLight(0xf5f9ff, 0.25);
    const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x0b1220, 0.85);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(6, 8, 6);
    const rimLight = new THREE.DirectionalLight(0xa3d4ff, 0.6);
    rimLight.position.set(-4, 6, -6);
    const pointerLight = new THREE.PointLight(0xdbeafe, 2.2, 18, 2.8);
    pointerLight.position.set(0, 2, 6);

    scene.add(ambient);
    scene.add(hemi);
    scene.add(keyLight);
    scene.add(rimLight);
    scene.add(pointerLight);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envSphere = new THREE.Mesh(
      new THREE.SphereGeometry(30, 32, 32),
      new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        color: new THREE.Color(0x0a1120),
      }),
    );
    const envGradient = new THREE.Color(0x1e293b);
    envSphere.material.color.lerp(envGradient, 0.35);
    envScene.add(envSphere);
    const environment = pmrem.fromScene(envScene, 0.04).texture;

    let meshes: THREE.Mesh[] = [];
    let reflectionMeshes: THREE.Mesh[] = [];

    const createLetters = () => {
      const baseMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xe8edf7),
        metalness: 0.95,
        roughness: 0.18,
        reflectivity: 1,
        envMap: environment,
        envMapIntensity: 1.25,
        clearcoat: 0.8,
        clearcoatRoughness: 0.12,
        transmission: 0.08,
        opacity: 1,
        transparent: true,
      });

      const reflectionMaterial = baseMaterial.clone();
      reflectionMaterial.transparent = true;
      reflectionMaterial.opacity = 0.42;
      reflectionMaterial.envMapIntensity = 1.4;
      reflectionMaterial.side = THREE.FrontSide;
  reflectionMaterial.onBeforeCompile = (shader: CompileShader) => {
        shader.uniforms.uFadeStrength = { value: 0.0 };
        shader.uniforms.uFalloff = { value: 1.2 };
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>\nvarying float vWorldY;`,
        );
        shader.vertexShader = shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>\nvWorldY = worldPosition.y;`,
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>\nvarying float vWorldY;\nuniform float uFadeStrength;\nuniform float uFalloff;`,
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `float mirrorFade = smoothstep(0.0, uFalloff, -vWorldY);\nmirrorFade = clamp(mirrorFade, 0.0, 1.0);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.07, 0.15, 0.28), mirrorFade * 0.45);\ngl_FragColor.a *= mix(1.0, 0.0, mirrorFade * 0.92 + uFadeStrength);\n#include <dithering_fragment>`,
        );
  };

      const letterGeometries = letterData.map((letter) => {
        const geometry = new TextGeometry(letter, {
          font,
          size: LETTER_SIZE,
          depth: 0.42,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.12,
          bevelSize: 0.08,
          bevelSegments: 5,
        });
        geometry.computeBoundingBox();
        const bounding = geometry.boundingBox;
        if (bounding) {
          const offsetX = (bounding.max.x + bounding.min.x) / 2;
          const offsetY = bounding.min.y;
          const offsetZ = (bounding.max.z + bounding.min.z) / 2;
          geometry.translate(-offsetX, -offsetY, -offsetZ);
        }
        return geometry;
      });

      const letterWidths = letterGeometries.map((geometry) => {
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox;
        return bounds ? bounds.max.x - bounds.min.x : 0;
      });

      const totalWidth = letterWidths.reduce((acc, width) => acc + width, 0) + LETTER_SPACING * (letterData.length - 1);

      let cursor = -totalWidth / 2;

      meshes = letterGeometries.map((geometry, index) => {
        const letterMesh = new THREE.Mesh(geometry, baseMaterial.clone());
        const width = letterWidths[index];
        cursor += width / 2;
        letterMesh.position.set(cursor, 0, 0);
        cursor += width / 2 + LETTER_SPACING;
        letterMesh.castShadow = false;
        letterMesh.receiveShadow = false;
        mainGroup.add(letterMesh);
        return letterMesh;
      });

      cursor = -totalWidth / 2;
      reflectionMeshes = letterGeometries.map((geometry, index) => {
        const geometryClone = geometry.clone();
        const mirrorMesh = new THREE.Mesh(geometryClone, reflectionMaterial.clone());
        const width = letterWidths[index];
        cursor += width / 2;
        mirrorMesh.position.set(cursor, -0.28, 0);
        mirrorMesh.scale.y = -1;
        cursor += width / 2 + LETTER_SPACING;
        mirrorMesh.castShadow = false;
        mirrorMesh.receiveShadow = false;
        mainGroup.add(mirrorMesh);
        return mirrorMesh;
      });

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(totalWidth + 3.8, 0.08, 1.8),
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x0f1b2d),
          metalness: 0.2,
          roughness: 0.85,
          transparent: true,
          opacity: 0.58,
        }),
      );
      base.position.set(0, -0.42, -0.08);
      mainGroup.add(base);
    };

    createLetters();

    const clock = new THREE.Clock();

    const renderScene = () => {
      if (!mounted) {
        return;
      }

  const elapsed = clock.getElapsedTime();
  mainGroup.rotation.y = Math.sin(elapsed * 0.16) * 0.022;
  mainGroup.rotation.x = 0.082 + Math.sin(elapsed * 0.095) * 0.01;
  mainGroup.position.y = 0.05 + Math.sin(elapsed * 0.2) * 0.032;

      const pointerPosition = pointerRef.current;
      pointerLight.position.x = (pointerPosition.x - 0.5) * 11;
      pointerLight.position.y = 1.2 + (0.5 - pointerPosition.y) * 5;
      pointerLight.position.z = 6;

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(renderScene);
    };

    const resize = () => {
      const bounds = canvas.parentElement?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      const { width, height } = bounds;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
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

    const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
        return;
      }

      material.dispose();
    };

    return () => {
      mounted = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("resize", handleWindowResize);
      resizeObserver?.disconnect();
      renderer.dispose();
      pmrem.dispose();
      environment.dispose();
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        disposeMaterial(mesh.material);
      });
      reflectionMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        disposeMaterial(mesh.material);
      });
      glowPlane.geometry.dispose();
      (glowPlane.material as THREE.Material).dispose();
    };
  }, [font, letterData]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}