import ModelViewer from './components/ModelViewer';

export default function Home() {
  return (
    <div className="w-full h-screen bg-blue-100">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h1 className="text-xl font-semibold text-gray-800">3D Character Model</h1>
        <p className="text-sm text-gray-600 mt-1">
          Use mouse to rotate, zoom, and pan the model
        </p>
        <p className="text-xs text-green-600 mt-2">
          Page loaded successfully - check console for debug messages
        </p>
      </div>
      <ModelViewer />
    </div>
  );
}
