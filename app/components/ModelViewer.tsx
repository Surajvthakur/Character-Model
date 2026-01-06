'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Bone, Box3, MathUtils, Mesh, Sphere, Vector3 } from 'three';
// WebGL Context Loss Handler
function ContextLossHandler() {
  const { gl } = useThree();
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
      setContextLost(true);
    };

    const handleContextRestore = () => {
      console.log('WebGL context restored');
      setContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', handleContextLoss);
    canvas.addEventListener('webglcontextrestored', handleContextRestore);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLoss);
      canvas.removeEventListener('webglcontextrestored', handleContextRestore);
    };
  }, [gl]);

  return contextLost ? (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="red" />
    </mesh>
  ) : null;
}

type BoneTransform = {
  rotation: [number, number, number]; // degrees offset from bind pose
  position: [number, number, number]; // units offset from bind pose
};

type SceneBounds = {
  center: [number, number, number];
  radius: number;
};

type ModelProps = {
  onBonesReady?: (boneNames: string[]) => void;
  boneTransforms: Record<string, BoneTransform>;
  onSceneBoundsReady?: (data: SceneBounds) => void;
};

function Model({ onBonesReady, boneTransforms, onSceneBoundsReady }: ModelProps) {
  const { scene } = useGLTF('/models/columbina_rigged_free.glb');
  const bonesRef = useRef<Record<string, Bone>>({});
  const boundsSentRef = useRef(false);
  const bindPoseRef = useRef<
    Record<
      string,
      {
        rotation: { x: number; y: number; z: number };
        position: { x: number; y: number; z: number };
      }
    >
  >({});

  useEffect(() => {
    if (scene) {
      const foundBones: Record<string, Bone> = {};
      scene.traverse((child) => {
        if (child instanceof Mesh) {
          // Force vertex colors off to see if the texture appears
          child.geometry.deleteAttribute('color');

          // Ensure the material isn't completely metallic/rough
          if (child.material) {
            child.material.metalness = 0;
            child.material.roughness = 1;
          }
        }

        if ((child as Bone).isBone) {
          const bone = child as Bone;
          foundBones[bone.name] = bone;

          if (!bindPoseRef.current[bone.name]) {
            bindPoseRef.current[bone.name] = {
              rotation: {
                x: bone.rotation.x,
                y: bone.rotation.y,
                z: bone.rotation.z,
              },
              position: {
                x: bone.position.x,
                y: bone.position.y,
                z: bone.position.z,
              },
            };
          }
        }
      });

      bonesRef.current = foundBones;
      onBonesReady?.(Object.keys(foundBones).sort());

      if (!boundsSentRef.current) {
        const box = new Box3().setFromObject(scene);
        const sphere = new Sphere();
        box.getBoundingSphere(sphere);
        if (sphere.radius > 0 && onSceneBoundsReady) {
          boundsSentRef.current = true;
          onSceneBoundsReady({
            center: [sphere.center.x, sphere.center.y, sphere.center.z],
            radius: sphere.radius,
          });
        }
      }
    }
  }, [scene, onBonesReady, onSceneBoundsReady]);

  useEffect(() => {
    Object.entries(boneTransforms).forEach(([name, transform]) => {
      const bone = bonesRef.current[name];
      if (!bone) return;

      const bindPose = bindPoseRef.current[name];
      const [rx, ry, rz] = transform.rotation;
      const [px, py, pz] = transform.position;

      const baseRotX = bindPose?.rotation.x ?? bone.rotation.x;
      const baseRotY = bindPose?.rotation.y ?? bone.rotation.y;
      const baseRotZ = bindPose?.rotation.z ?? bone.rotation.z;

      const basePosX = bindPose?.position.x ?? bone.position.x;
      const basePosY = bindPose?.position.y ?? bone.position.y;
      const basePosZ = bindPose?.position.z ?? bone.position.z;

      bone.rotation.set(
        baseRotX + MathUtils.degToRad(rx),
        baseRotY + MathUtils.degToRad(ry),
        baseRotZ + MathUtils.degToRad(rz)
      );
      bone.position.set(basePosX + px, basePosY + py, basePosZ + pz);
      bone.updateMatrixWorld();
    });
  }, [boneTransforms]);

  return <primitive object={scene} />;
}

// Loading fallback component
function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-lg text-gray-600 animate-pulse">Loading 3D model...</div>
    </div>
  );
}


type BoneControlsProps = {
  bones: string[];
  selectedBone: string;
  transforms: Record<string, BoneTransform>;
  onSelectBone: (bone: string) => void;
  onChange: (
    bone: string,
    type: 'rotation' | 'position',
    axisIndex: number,
    value: number
  ) => void;
  onResetBone: (bone: string) => void;
  onResetAll: () => void;
};

function BoneControls({
  bones,
  selectedBone,
  transforms,
  onSelectBone,
  onChange,
  onResetBone,
  onResetAll,
}: BoneControlsProps) {
  const current = transforms[selectedBone];

  return (
    <div className="absolute top-4 left-4 z-10 w-80 rounded-lg bg-white/90 p-4 text-gray-900 shadow-lg backdrop-blur-sm space-y-3">
      <div className="text-sm font-semibold">Bone Pose Controls</div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Bone</label>
        <select
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
          value={selectedBone}
          onChange={(e) => onSelectBone(e.target.value)}
        >
          {bones.length === 0 && <option value="">Loading bones...</option>}
          {bones.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {current ? (
        <>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700">
              Rotation (degrees)
            </div>
            {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
              <div key={`rot-${axis}`} className="flex items-center gap-2">
                <span className="w-10 text-xs text-gray-600">Rot {axis}</span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  className="flex-1"
                  value={current.rotation[idx]}
                  onChange={(e) =>
                    onChange(selectedBone, 'rotation', idx, Number(e.target.value))
                  }
                />
                <span className="w-10 text-right text-xs text-gray-700">
                  {current.rotation[idx]}°
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700">
              Position (offset)
            </div>
            {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
              <div key={`pos-${axis}`} className="flex items-center gap-2">
                <span className="w-10 text-xs text-gray-600">Pos {axis}</span>
                <input
                  type="range"
                  min={-0.2}
                  max={0.2}
                  step={0.005}
                  className="flex-1"
                  value={current.position[idx]}
                  onChange={(e) =>
                    onChange(
                      selectedBone,
                      'position',
                      idx,
                      Number(e.target.value)
                    )
                  }
                />
                <span className="w-12 text-right text-xs text-gray-700">
                  {current.position[idx].toFixed(3)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
              onClick={() => onResetBone(selectedBone)}
              type="button"
            >
              Reset bone
            </button>
            <button
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100"
              onClick={onResetAll}
              type="button"
            >
              Reset all
            </button>
          </div>

          <p className="text-[11px] text-gray-600">
            Offsets are applied on top of the rig&apos;s bind pose. Use small
            increments to pose the model.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-600">Select a bone to start posing.</p>
      )}
    </div>
  );
}

function CameraFit({ bounds }: { bounds?: SceneBounds }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls as any);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!bounds || appliedRef.current) return;

    const radius = Math.max(bounds.radius, 0.02);
    const centerVec = new Vector3(...bounds.center);
    const distance = Math.max(radius * 1, 0.05);
    const offset = new Vector3(radius * 0.2, radius * 0.6, distance);

    camera.position.copy(centerVec.clone().add(offset));
    camera.near = Math.max(radius * 0.02, 0.005);
    camera.far = Math.max(distance * 40, 100);
    camera.updateProjectionMatrix();

    if (controls?.target) {
      controls.target.copy(centerVec);
      controls.minDistance = Math.max(radius * 0.05, 0.01);
      controls.maxDistance = Math.max(distance * 6, radius * 30);
      controls.update();
    }

    appliedRef.current = true;
  }, [bounds, camera, controls]);

  return null;
}

// Main 3D viewer component
export default function ModelViewer() {
  const [webGLError, setWebGLError] = useState(false);
  const [dpr, setDpr] = useState(1);
  const [boneTransforms, setBoneTransforms] = useState<Record<string, BoneTransform>>({});
  const [bones, setBones] = useState<string[]>([]);
  const [selectedBone, setSelectedBone] = useState<string>('');
  const [sceneBounds, setSceneBounds] = useState<SceneBounds | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDpr(Math.min(window.devicePixelRatio, 2));
    }
  }, []);

  const handleBonesReady = useCallback((boneNames: string[]) => {
    setBones(boneNames);
    setSelectedBone((prev) => prev || boneNames[0] || '');
    setBoneTransforms((prev) => {
      const next = { ...prev };
      boneNames.forEach((name) => {
        if (!next[name]) {
          next[name] = { rotation: [0, 0, 0], position: [0, 0, 0] };
        }
      });
      return next;
    });
  }, []);

  const handleSceneBoundsReady = useCallback((data: SceneBounds) => {
    setSceneBounds(data);
  }, []);

  const updateTransform = useCallback(
    (
      bone: string,
      type: 'rotation' | 'position',
      axisIndex: number,
      value: number
    ) => {
      setBoneTransforms((prev) => {
        const current = prev[bone] ?? { rotation: [0, 0, 0], position: [0, 0, 0] };
        const next: BoneTransform = {
          rotation: [...current.rotation] as [number, number, number],
          position: [...current.position] as [number, number, number],
        };
        next[type][axisIndex] = value;
        return { ...prev, [bone]: next };
      });
    },
    []
  );

  const resetBone = useCallback((bone: string) => {
    setBoneTransforms((prev) => ({
      ...prev,
      [bone]: { rotation: [0, 0, 0], position: [0, 0, 0] },
    }));
  }, []);

  const resetAllBones = useCallback(() => {
    setBoneTransforms((prev) => {
      const next: Record<string, BoneTransform> = {};
      Object.keys(prev).forEach((bone) => {
        next[bone] = { rotation: [0, 0, 0], position: [0, 0, 0] };
      });
      return next;
    });
  }, []);

  if (webGLError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">WebGL Error</h2>
          <p className="text-gray-600">Your browser might not support WebGL or hardware acceleration is disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <BoneControls
        bones={bones}
        selectedBone={selectedBone}
        transforms={boneTransforms}
        onSelectBone={setSelectedBone}
        onChange={updateTransform}
        onResetBone={resetBone}
        onResetAll={resetAllBones}
      />
      <Suspense fallback={<Loader />}>
        <Canvas
          flat
          shadows
          camera={{ position: [0, 0, 5], fov: 50 }}
          dpr={dpr}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            // Use ACESFilmicToneMapping from three.js via r3f's gl prop
            toneMapping: 7, // ACESFilmicToneMapping (Numeric value; see three/src/constants.js)
            toneMappingExposure: 0.1 // adjust this down (0.5) if it's still too bright
          }}
          onError={(error) => {
            console.error('Canvas error:', error);
            setWebGLError(true);
          }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <ContextLossHandler />
          <Suspense fallback={null}>
            <Stage
              intensity={0.5}
              environment="city"
              // Prevent Stage from re-framing the camera when the model/bones change
              adjustCamera={false}
            >
              <Model
                boneTransforms={boneTransforms}
                onBonesReady={handleBonesReady}
              onSceneBoundsReady={handleSceneBoundsReady}
              />
            </Stage>
          </Suspense>
          <CameraFit bounds={sceneBounds} />
          <OrbitControls makeDefault />
        </Canvas>
      </Suspense>
    </div>
  );
}

useGLTF.preload('/models/columbina_rigged_free.glb');
