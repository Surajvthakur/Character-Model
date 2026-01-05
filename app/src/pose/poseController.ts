
const { Pose } = await import('@mediapipe/pose');
const { Camera } = await import('@mediapipe/camera_utils');
export function setupPose(
  video: HTMLVideoElement,
  onResults: (landmarks: any[]) => void
) {
  let pose: Pose | null = null;
  pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  pose.onResults((results) => {
    if (results.poseLandmarks) {
      onResults(results.poseLandmarks);
    }
  });

  const camera = new Camera(video, {
    onFrame: async () => {
      if (pose) await pose.send({ image: video });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}
