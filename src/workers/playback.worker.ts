/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { WorkerPayload } from "./worker";
import { arrayFastResample } from "../utils/arrays";
import { PLAYBACK_WAVEFORM_SAMPLES } from "../audio/consts";
import { percentageOf, percentageWithin } from "../utils/numbers";

const ctx: Worker = self as any;

/**
 * Attempts a smooth resample of the given array. This is functionally similar to arrayFastResample
 * though can take longer due to the smoothing of data.
 * @param {number[]} input The input array to resample.
 * @param {number} points The number of samples to end up with.
 * @returns {number[]} The resampled array.
 */
export function arraySmoothingResample(input: number[], points: number): number[] {
    if (input.length === points) return input; // short-circuit a complicated call

    let samples: number[] = [];
    if (input.length > points) {
        // We're downsampling. To preserve the curve we'll actually reduce our sample
        // selection and average some points between them.

        // All we're doing here is repeatedly averaging the waveform down to near our
        // target value. We don't average down to exactly our target as the loop might
        // never end, and we can over-average the data. Instead, we'll get as far as
        // we can and do a followup fast resample (the neighbouring points will be close
        // to the actual waveform, so we can get away with this safely).
        while (samples.length > points * 2 || samples.length === 0) {
            samples = [];
            for (let i = 1; i < input.length - 1; i += 2) {
                const prevPoint = input[i - 1];
                const nextPoint = input[i + 1];
                const currPoint = input[i];
                const average = (prevPoint + nextPoint + currPoint) / 3;
                samples.push(average);
            }
            input = samples;
        }

        return arrayFastResample(samples, points);
    } else {
        // In practice there's not much purpose in burning CPU for short arrays only to
        // end up with a result that can't possibly look much different than the fast
        // resample, so just skip ahead to the fast resample.
        return arrayFastResample(input, points);
    }
}

/**
 * Rescales the input array to have values that are inclusively within the provided
 * minimum and maximum.
 * @param {number[]} input The array to rescale.
 * @param {number} newMin The minimum value to scale to.
 * @param {number} newMax The maximum value to scale to.
 * @returns {number[]} The rescaled array.
 */
export function arrayRescale(input: number[], newMin: number, newMax: number): number[] {
    const min: number = Math.min(...input);
    const max: number = Math.max(...input);
    return input.map((v) => percentageWithin(percentageOf(v, min, max), newMin, newMax));
}

export interface Request {
    data: number[];
}

export interface Response {
    waveform: number[];
}

ctx.addEventListener("message", async (event: MessageEvent<Request & WorkerPayload>): Promise<void> => {
    const { seq, data } = event.data;

    // First, convert negative amplitudes to positive so we don't detect zero as "noisy".
    const noiseWaveform = data.map((v) => Math.abs(v));

    // Then, we'll resample the waveform using a smoothing approach so we can keep the same rough shape.
    // We also rescale the waveform to be 0-1 so we end up with a clamped waveform to rely upon.
    const waveform = arrayRescale(arraySmoothingResample(noiseWaveform, PLAYBACK_WAVEFORM_SAMPLES), 0, 1);

    ctx.postMessage({ seq, waveform });
});
