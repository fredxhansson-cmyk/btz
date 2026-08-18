// Sample storage. The original file bytes are kept base64-encoded inside the
// project so a saved .flow.json is self-contained, and decoded lazily into
// AudioBuffers once an AudioContext exists.
import { uid } from './constants';

export const MAX_SAMPLE_BYTES = 4 * 1024 * 1024;

export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Reads a File into a project sample record. */
export async function fileToSample(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length > MAX_SAMPLE_BYTES) {
    throw new Error(`"${file.name}" ar ${(buf.length / 1048576).toFixed(1)} MB — max ar 4 MB.`);
  }
  return {
    id: uid('sm'),
    name: file.name,
    mime: file.type || 'audio/wav',
    bytes: buf.length,
    data: bytesToBase64(buf),
  };
}

export function reverseBuffer(ctx, buffer) {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0, n = src.length; i < n; i++) dst[i] = src[n - 1 - i];
  }
  return out;
}

/** Peak envelope for waveform drawing. */
export function peaks(buffer, count = 400) {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / count));
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let peak = 0;
    const start = i * step;
    for (let j = start; j < start + step && j < data.length; j++) {
      const v = Math.abs(data[j]);
      if (v > peak) peak = v;
    }
    out[i] = peak;
  }
  return out;
}
