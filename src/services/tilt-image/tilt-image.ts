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

import isDeviceMotionSupported from "../../feature-detection/device-motion.js";
import isGenericSensorAccelerometerSupported from "../../feature-detection/generic-sensor-accelerometer.js";
import { tiltimage } from "./style.css";

export default class TiltImage {
  static SENSOR_FREQUENCY = 10;

  private _el = document.createElement("div");
  private _target = [0, 0];
  private _current = [0, 0];
  private _started = false;
  private _accelerometer?: Accelerometer;

  constructor(private path: string, public smoothing = 20) {
    this._el.classList.add(tiltimage);
    this._el.style.backgroundImage = `url(${path})`;
    document.body.appendChild(this._el);

    this._ontilt = this._ontilt.bind(this);
  }

  async start() {
    if (this._started) {
      return;
    }
    this._started = true;
    if (!(await this._startSensor())) {
      return;
    }
    this.onrender = this.onrender.bind(this);
    this.onrender();
  }

  stop() {
    if (!this._started) {
      return;
    }
    this._started = false;
    this._stopSensor();
  }

  private async _startSensor() {
    if (await isGenericSensorAccelerometerSupported()) {
      await this._startGenericSensor();
      return true;
    } else if (await isDeviceMotionSupported()) {
      await this._startDeviceMotion();
      return true;
    }
    return false;
  }

  private async _stopSensor() {
    this._stopGenericSensor();
    this._stopDeviceMotion();
  }

  private async _startGenericSensor() {
    this._accelerometer = new Accelerometer({
      frequency: TiltImage.SENSOR_FREQUENCY
    });
    this._accelerometer.start();
    await new Promise((resolve, reject) => {
      this._accelerometer!.onactivate = resolve;
      this._accelerometer!.onerror = reject;
    });
    this._accelerometer.onreading = () => {
      this._ontilt({
        accelerationIncludingGravity: {
          x: this._accelerometer!.x,
          y: this._accelerometer!.y,
          z: this._accelerometer!.z
        }
      } as any);
    };
  }

  private async _stopGenericSensor() {
    if (this._accelerometer) {
      this._accelerometer.stop();
    }
    this._accelerometer = undefined;
  }

  private async _startDeviceMotion() {
    window.addEventListener("devicemotion", this._ontilt);
  }

  private async _stopDeviceMotion() {
    window.removeEventListener("devicemotion", this._ontilt);
  }

  private _ontilt({ accelerationIncludingGravity }: DeviceMotionEvent) {
    this._target[0] = accelerationIncludingGravity!.x!;
    this._target[1] = accelerationIncludingGravity!.y!;
  }

  private onrender() {
    this._el.style.transform = `translate(${-this._current[0]}vmax, ${
      this._current[1]
    }vmax)`;
    this._current[0] += (this._target[0] - this._current[0]) / this.smoothing;
    this._current[1] += (this._target[1] - this._current[1]) / this.smoothing;
    if (this._started) {
      requestAnimationFrame(this.onrender);
    }
  }
}
