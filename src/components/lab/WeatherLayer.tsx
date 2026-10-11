import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactElement } from "react";
import * as THREE from "three";

export type Weather = "rain" | "fog" | "night";

export type WeatherSettings = {
  fog: { color: string; near: number; far: number } | null;
  ambientIntensity: number;
  keyLight: { color: string; intensity: number } | null;
  rainDrops: number;
};

export function weatherSettings(
  weather: Weather | null,
  reducedMotion: boolean,
): WeatherSettings {
  if (weather === null) {
    return {
      fog: null,
      ambientIntensity: 1,
      keyLight: null,
      rainDrops: 0,
    };
  }

  if (weather === "fog") {
    return {
      fog: { color: "#c9d1d8", near: 18, far: 70 },
      ambientIntensity: 0.85,
      keyLight: null,
      rainDrops: 0,
    };
  }

  if (weather === "night") {
    return {
      fog: { color: "#0b1020", near: 30, far: 110 },
      ambientIntensity: 0.35,
      keyLight: { color: "#9fb4ff", intensity: 0.6 },
      rainDrops: 0,
    };
  }

  return {
    fog: { color: "#8f9aa5", near: 24, far: 90 },
    ambientIntensity: 0.7,
    keyLight: null,
    rainDrops: reducedMotion ? 0 : 1200,
  };
}

export function WeatherLayer(props: {
  weather: Weather | null;
  reducedMotion: boolean;
}): ReactElement | null {
  const settings = weatherSettings(props.weather, props.reducedMotion);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const drops = useMemo(() => {
    if (settings.rainDrops === 0) return [];
    return Array.from({ length: settings.rainDrops }, () => ({
      x: 3.2 + (Math.random() - 0.5) * 60,
      y: Math.random() * 25 + 8,
      z: (Math.random() - 0.5) * 60,
      length: 0.8 + Math.random() * 0.9,
    }));
  }, [settings.rainDrops]);

  useFrame(({ clock }) => {
    if (!meshRef.current || settings.rainDrops === 0) return;

    const time = clock.getElapsedTime();
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      const offset = ((time * 12 + index * 0.37) % 26) - 13;
      const y = ((drop.y + offset + 30) % 35) - 5;

      dummy.position.set(drop.x, y, drop.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.06, drop.length, 0.06);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(index, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (props.weather === null) {
    return null;
  }

  return (
    <>
      {settings.fog && (
        <fog
          attach="fog"
          args={[settings.fog.color, settings.fog.near, settings.fog.far]}
        />
      )}
      {settings.keyLight && (
        <directionalLight
          color={settings.keyLight.color}
          intensity={settings.keyLight.intensity}
          position={[3, 12, 2]}
        />
      )}
      {settings.rainDrops > 0 && (
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, settings.rainDrops]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#9bb3c6" transparent opacity={0.7} />
        </instancedMesh>
      )}
    </>
  );
}
