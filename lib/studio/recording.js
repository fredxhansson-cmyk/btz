// Helpers for the recording panel: device listing and turning a recorded
// AudioBuffer into a project sample (always stored as WAV so the project file
// does not depend on which codec the browser happened to use).
import { uid } from './constants';
import { encodeWav } from './audio/render';
import { bytesToBase64 } from './samples';

export async function listAudioInputs() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Ingang ${i + 1}` }));
  } catch (e) {
    return [];
  }
}

/** Trims leading and trailing silence and normalises to -1 dBFS. */
export function cleanBuffer(ctx, buffer, { trim = true, normalize = true, threshold = 0.003 } = {}) {
  const chans = buffer.numberOfChannels;
  const len = buffer.length;
  let start = 0;
  let end = len;
  if (trim) {
    const data = buffer.getChannelData(0);
    while (start < len && Math.abs(data[start]) < threshold) start++;
    while (end > start && Math.abs(data[end - 1]) < threshold) end--;
    start = Math.max(0, start - Math.floor(buffer.sampleRate * 0.005));
    end = Math.min(len, end + Math.floor(buffer.sampleRate * 0.02));
  }
  const outLen = Math.max(1, end - start);
  const out = ctx.createBuffer(chans, outLen, buffer.sampleRate);
  let peak = 0;
  for (let c = 0; c < chans; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < outLen; i++) {
      const v = src[start + i] || 0;
      dst[i] = v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
  }
  if (normalize && peak > 0.0001) {
    const g = 0.89 / peak;
    for (let c = 0; c < chans; c++) {
      const dst = out.getChannelData(c);
      for (let i = 0; i < outLen; i++) dst[i] *= g;
    }
  }
  return out;
}

export async function bufferToSample(buffer, name) {
  const blob = encodeWav(buffer);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    id: uid('sm'),
    name: name || 'Inspelning.wav',
    mime: 'audio/wav',
    bytes: bytes.length,
    data: bytesToBase64(bytes),
  };
}
