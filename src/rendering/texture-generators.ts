/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { staticDevicePixelRatio } from "../utils/static-dpr.js";
import { deg2rad, remap, smoothpulse } from "./animation-helpers.js";
import { roundedRectangle } from "./canvas-helper.js";

import {
  blurFactor,
  borderRadius,
  innerCircleRadius,
  numberCircleRadius,
  numberFontSizeFactor,
  numInnerRects,
  safetyBufferFactor,
  thickLine,
  thinLine,
  white
} from "./constants.js";

export type TextureGenerator = (
  idx: number,
  ctx: CanvasRenderingContext2D
) => void;

export function idleAnimationTextureGeneratorFactory(
  textureSize: number,
  cellPadding: number,
  numFrames: number
): TextureGenerator {
  const size = (textureSize - cellPadding * 2) * safetyBufferFactor;
  const halfSize = size / 2;

  return (idx: number, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, textureSize, textureSize);

    const ts = Math.floor(idx % numFrames) / numFrames;

    ctx.save();
    ctx.translate(textureSize / 2, textureSize / 2);

    roundedRectangle(
      ctx,
      -halfSize,
      -halfSize,
      size,
      size,
      size * borderRadius
    );
    ctx.clip();

    ctx.strokeStyle = white;

    ctx.lineWidth = size * thinLine;
    const magnification = remap(0, 1, 1, 1.4, smoothpulse(0, 0.5, 0.5, 1, ts));
    for (let i = 0; i < numInnerRects; i++) {
      ctx.save();
      const offset = ((numInnerRects - i) / numInnerRects) * 0.14;
      const angle =
        5 +
        i * 9 +
        (i * (i + 1)) / 2 +
        smoothpulse(0, 0.5 + offset, 0.5 + offset, 1, ts) * 180;
      ctx.rotate(deg2rad(-angle));
      const subsize = size * magnification * (0.92 - 0.13 * i);
      roundedRectangle(
        ctx,
        -subsize / 2,
        -subsize / 2,
        subsize,
        subsize,
        subsize * borderRadius
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };
}

export const enum STATIC_TEXTURE {
  OUTLINE,
  NUMBER_1, // = 1
  NUMBER_2,
  NUMBER_3,
  NUMBER_4,
  NUMBER_5,
  NUMBER_6,
  NUMBER_7,
  NUMBER_8, // = 8
  FLASH,
  MINE,
  LAST_MARKER // Not a valid frame, just a marker for the last item in the enum
}
export function staticTextureGeneratorFactory(
  textureSize: number,
  cellPadding: number
): TextureGenerator {
  const size = (textureSize - cellPadding * 2) * safetyBufferFactor;
  const halfSize = size / 2;

  // If a texture needs a glow effect, the routine can paint
  // to this canvas instead. This temporary canvas will
  // be blitted to the output canvas twice — once with a blur,
  // and once without, yielding a glow.
  const cvs2 = document.createElement("canvas");
  cvs2.width = cvs2.height = textureSize * staticDevicePixelRatio;
  const ctx2 = cvs2.getContext("2d")!;
  ctx2.scale(staticDevicePixelRatio, staticDevicePixelRatio);

  return (idx: number, ctx: CanvasRenderingContext2D) => {
    ctx2.clearRect(0, 0, textureSize, textureSize);

    ctx2.save();
    ctx.save();

    ctx.translate(textureSize / 2, textureSize / 2);
    ctx2.translate(textureSize / 2, textureSize / 2);
    if (idx === STATIC_TEXTURE.OUTLINE) {
      ctx2.strokeStyle = "white";

      // Inner circle
      ctx2.lineWidth = size * thickLine;
      const radius = size * innerCircleRadius;
      ctx2.beginPath();
      ctx2.moveTo(radius, 0);
      ctx2.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx2.closePath();
      ctx2.stroke();

      // Outline
      // Size: 650, stroke: 20, radius: 76
      roundedRectangle(
        ctx2,
        -halfSize,
        -halfSize,
        size,
        size,
        size * borderRadius
      );
      ctx2.lineWidth = size * thickLine;
      ctx2.stroke();
    } else if (idx >= 1 && idx <= 8) {
      ctx2.strokeStyle = white;
      ctx2.lineWidth = size * thinLine;
      ctx2.beginPath();
      ctx2.arc(0, 0, halfSize * numberCircleRadius, 0, 2 * Math.PI);
      ctx2.closePath();
      ctx2.stroke();

      ctx2.fillStyle = white;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.font = `${size * numberFontSizeFactor}px sans-serif`;
      ctx2.fillText(`${idx}`, 0, 0);
    } else if (idx === STATIC_TEXTURE.FLASH) {
      roundedRectangle(
        ctx2,
        -halfSize,
        -halfSize,
        size,
        size,
        size * borderRadius
      );
      ctx2.clip();
      ctx2.fillStyle = white;
      ctx2.fillRect(-halfSize, -halfSize, size, size);
    } else if (idx === STATIC_TEXTURE.MINE) {
      ctx.fillStyle = "#f00";
      ctx.beginPath();
      ctx.arc(0, 0, halfSize, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
    ctx2.restore();

    ctx.save();
    const blur = (textureSize * blurFactor).toFixed(1);
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(
      cvs2,
      0,
      0,
      cvs2.width,
      cvs2.height,
      0,
      0,
      textureSize,
      textureSize
    );
    ctx.filter = "none";
    ctx.drawImage(
      cvs2,
      0,
      0,
      cvs2.width,
      cvs2.height,
      0,
      0,
      textureSize,
      textureSize
    );
    ctx.restore();
  };
}
