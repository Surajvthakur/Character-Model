'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh } from 'three';
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

// Component to load and display the GLB model
function Model() {
  const { scene } = useGLTF('/models/columbina_rigged_free.glb');

  useEffect(() => {
    if (scene) {
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
      });
    }
  }, [scene]);

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
            toneMappingExposure: 0.15 // adjust this down (0.5) if it's still too bright
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

