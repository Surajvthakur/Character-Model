import { Bone, MathUtils } from "three";
import type { Emotion } from "../store/emotionStore";

export function applyEmotionPose(
  emotion: Emotion,
  bones: Record<string, Bone>
) {
  const head = bones["Bip001_Head_087"];
  const neck = bones["Bip001_Neck_086"];
  const spine = bones["Bip001_Spine2_052"];

  if (!head || !neck || !spine) return;

  // Target rotations
  let headX = 0,
    headY = 0,
    spineX = 0;

  switch (emotion) {
    case "happy":
      headX = -0.25;
      spineX = 0.15;
      break;

    case "sad":
      headX = 0.4;
      spineX = -0.25;
      break;

    case "angry":
      headX = 0.15;
      headY = 0.25;
      spineX = -0.2;
      break;

    case "neutral":
    default:
      break;
  }

  // Smooth interpolation (VERY IMPORTANT)
  head.rotation.x = MathUtils.lerp(head.rotation.x, headX, 0.1);
  head.rotation.y = MathUtils.lerp(head.rotation.y, headY, 0.1);
  spine.rotation.x = MathUtils.lerp(spine.rotation.x, spineX, 0.1);
}
