'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh, Bone,Vector3, MathUtils} from 'three';
import { useFrame } from '@react-three/fiber';
import { useEmotionStore } from '../src/store/emotionStore';
import { applyEmotionPose } from '../src/avatar/emotionPose';
import { setupPose } from "@/app/src/pose/poseController";
import { usePoseStore } from "@/app/src/store/poseStore";

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
// Convert MediaPipe landmark to 3D vector
// MediaPipe: x (0-1 left to right), y (0-1 top to bottom), z (depth, negative = closer)
function vec(lm: any) {
  // Convert to centered coordinates: x (-0.5 to 0.5), y inverted, z as is
  return new Vector3(
    (lm.x - 0.5),      // Center horizontally
    -(lm.y - 0.5),     // Invert Y (MediaPipe Y is top-down)
    -lm.z              // Z depth
  );
}

// Calculate angle between three points (at the middle point)
function angleBetween(a: Vector3, b: Vector3, c: Vector3) {
  const v1 = a.clone().sub(b).normalize();
  const v2 = c.clone().sub(b).normalize();
  return v1.angleTo(v2);
}


export function Model() {
  const { scene } = useGLTF("/models/columbina_rigged_free.glb");
  const bones = useRef<Record<string, Bone>>({});
  const initialRotations = useRef<Record<string, { x: number; y: number; z: number }>>({});
  const emotion = useEmotionStore((s) => s.emotion);
  const landmarks = usePoseStore((s) => s.landmarks);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isBone) {
        bones.current[child.name] = child;
        // Store initial rotations
        initialRotations.current[child.name] = {
          x: child.rotation.x,
          y: child.rotation.y,
          z: child.rotation.z,
        };
      }
    });
    console.log("Bones loaded:", Object.keys(bones.current).length);
  }, [scene]);

  useFrame(() => {
    applyEmotionPose(emotion, bones.current);

    // Pose animation logic
    if (!landmarks) return;

    // Get raw landmark positions (MediaPipe coordinates)
    // x: 0-1 (left to right in image, but camera is mirrored)
    // y: 0-1 (top to bottom)
    // z: depth (negative = closer to camera)
    const lm = landmarks;

    // Get bones
    const leftUpperArm = bones.current["Bip001_L_UpperArm_057"];
    const rightUpperArm = bones.current["Bip001_R_UpperArm_0130"];
    const leftForearm = bones.current["Bip001_L_Forearm_060"];
    const rightForearm = bones.current["Bip001_R_Forearm_0133"];
    const head = bones.current["Bip001_Head_087"];
    const neck = bones.current["Bip001_Neck_086"];

    // LEFT ARM - Calculate how raised/lowered the arm is
    // When arm is down: elbow.y > shoulder.y (in MediaPipe coords where y increases downward)
    // When arm is raised: elbow.y < shoulder.y
    if (leftUpperArm) {
      const shoulderY = lm[11].y;
      const elbowY = lm[13].y;
      const shoulderX = lm[11].x;
      const elbowX = lm[13].x;
      
      // How much is the arm raised? (negative = raised above shoulder, positive = below)
      const armRaise = (elbowY - shoulderY) * Math.PI * 2;
      // How much is the arm forward/back?
      const armForward = (lm[13].z - lm[11].z) * Math.PI * 2;
      // How much is the arm out to the side vs in front?
      const armSide = (shoulderX - elbowX) * Math.PI * 2;
      
      // Apply rotation - for left arm, positive Z rotates arm down
      leftUpperArm.rotation.x = MathUtils.lerp(leftUpperArm.rotation.x, armForward, 0.2);
      leftUpperArm.rotation.z = MathUtils.lerp(leftUpperArm.rotation.z, armRaise, 0.2);
    }

    // LEFT FOREARM (elbow bend)
    if (leftForearm) {
      const elbowAngle = angleBetween(
        vec(lm[11]), // shoulder
        vec(lm[13]), // elbow
        vec(lm[15])  // wrist
      );
      // Elbow bend - closer to PI means straight, closer to 0 means bent
      const bendAmount = Math.PI - elbowAngle;
      leftForearm.rotation.y = MathUtils.lerp(leftForearm.rotation.y, -bendAmount, 0.2);
    }

    // RIGHT ARM
    if (rightUpperArm) {
      const shoulderY = lm[12].y;
      const elbowY = lm[14].y;
      const shoulderX = lm[12].x;
      const elbowX = lm[14].x;
      
      const armRaise = (elbowY - shoulderY) * Math.PI * 2;
      const armForward = (lm[14].z - lm[12].z) * Math.PI * 2;
      const armSide = (elbowX - shoulderX) * Math.PI * 2;
      
      // For right arm, negative Z rotates arm down
      rightUpperArm.rotation.x = MathUtils.lerp(rightUpperArm.rotation.x, armForward, 0.2);
      rightUpperArm.rotation.z = MathUtils.lerp(rightUpperArm.rotation.z, -armRaise, 0.2);
    }

    // RIGHT FOREARM (elbow bend)
    if (rightForearm) {
      const elbowAngle = angleBetween(
        vec(lm[12]), // shoulder
        vec(lm[14]), // elbow
        vec(lm[16])  // wrist
      );
      const bendAmount = Math.PI - elbowAngle;
      rightForearm.rotation.y = MathUtils.lerp(rightForearm.rotation.y, bendAmount, 0.2);
    }

    // HEAD tracking using nose and ears
    if (head) {
      // Left/right turn - use nose position relative to shoulders
      const noseX = lm[0].x;
      const shoulderCenterX = (lm[11].x + lm[12].x) / 2;
      const headTurn = (noseX - shoulderCenterX) * Math.PI * 3;

      // Up/down tilt - use nose Y relative to ear center
      const noseY = lm[0].y;
      const earCenterY = (lm[7].y + lm[8].y) / 2;
      const headTilt = (noseY - earCenterY) * Math.PI * 2;

      // Head roll (side tilt) - ear height difference
      const leftEarY = lm[7].y;
      const rightEarY = lm[8].y;
      const headRoll = (rightEarY - leftEarY) * Math.PI * 2;

      head.rotation.y = MathUtils.lerp(head.rotation.y, -headTurn, 0.15);
      head.rotation.x = MathUtils.lerp(head.rotation.x, headTilt, 0.15);
      head.rotation.z = MathUtils.lerp(head.rotation.z, headRoll, 0.15);
    }
  });

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


// Main 3D viewer component
export default function ModelViewer() {
  const [webGLError, setWebGLError] = useState(false);
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDpr(Math.min(window.devicePixelRatio, 2));
    }
  }, []);

  // Setup pose detection
  useEffect(() => {
    const video = document.getElementById("pose-video") as HTMLVideoElement;
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      video.srcObject = stream;
      setupPose(video, (landmarks) => {
        usePoseStore.getState().setLandmarks(landmarks);
      });
    });
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const setEmotion = useEmotionStore.getState().setEmotion;
  
      if (e.key === "1") setEmotion("neutral");
      if (e.key === "2") setEmotion("happy");
      if (e.key === "3") setEmotion("sad");
      if (e.key === "4") setEmotion("angry");
    };
  
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
            <Stage intensity={0.5} environment="city" adjustCamera={true}>
              <Model />
            </Stage>
          </Suspense>
          <OrbitControls makeDefault />
        </Canvas>
      </Suspense>
    </div>
  );
}

