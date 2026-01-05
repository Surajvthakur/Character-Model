'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

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
  // useGLTF returns the GLTF result directly, not an object with {scene, error}
  // To handle errors, we should wrap the parent in an ErrorBoundary or use a try-catch pattern if possible,
  // but useGLTF is a hook that throws if it fails.
  const { scene } = useGLTF('/models/columbina_rigged_free.glb');
  const meshRef = useRef();

  useEffect(() => {
    if (scene) {
      console.log('GLTF loaded successfully:', scene);
    }
  }, [scene]);

  if (!scene) {
    return null;
  }

  return (
    <primitive 
      ref={meshRef}
      object={scene} 
      scale={1} 
      position={[0, 0, 0]} 
    />
  );
}

// Loading fallback component
function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-lg text-gray-600 animate-pulse">Loading 3D model...</div>
    </div>
  );
}

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center h-full bg-red-50 p-4 rounded-lg">
      <div className="text-center">
        <div className="text-red-600 text-lg font-bold mb-2">Model Load Error</div>
        <div className="text-sm text-gray-700 bg-white p-3 border border-red-200 rounded overflow-auto max-w-md">
          {error.message}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// Simple Error Boundary
class ErrorBoundary extends (require('react').Component) {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
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
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Canvas
            shadows
            camera={{ position: [0, 0, 5], fov: 50 }}
            dpr={dpr}
            gl={{ 
              antialias: true,
              alpha: true,
              powerPreference: "high-performance"
            }}
            onError={(error) => {
              console.error('Canvas error:', error);
              setWebGLError(true);
            }}
          >
            <ContextLossHandler />
            <Suspense fallback={null}>
              <Stage intensity={0.5} environment="city" adjustCamera={true}>
                <Model />
              </Stage>
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

