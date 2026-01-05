import ModelViewer from './components/ModelViewer';

export default function Home() {
  return (
    <div className="w-full h-screen bg-black">
      <video
  id="pose-video"
  autoPlay
  playsInline
  muted
  className="absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-white/30 z-50"
  style={{ transform: 'scaleX(-1)' }}
/>

      <ModelViewer />
    </div>
  );
}
