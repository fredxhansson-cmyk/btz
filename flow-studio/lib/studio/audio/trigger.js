// Shared note trigger used by the realtime engine and the offline renderer,
// so choke groups and voice handling behave identically in both.
import { clamp } from '../constants';
import { playNote } from './instruments';

/**
 * Plays one note of `channel`.
 * `chokes` is a Map<groupId, {gain}> holding the voice currently ringing in
 * each choke group; a new hit in the same group fades the previous one out
 * (closed hat cutting an open hat, for example).
 */
export function triggerNote(ctx, graph, channel, note, time, secondsPerTick, buffers, chokes) {
  const dur = Math.max(0.01, note.d * secondsPerTick);
  const dest = graph.channelInput(channel.id);
  let out = dest;

  if (channel.choke && chokes) {
    const gate = ctx.createGain();
    gate.gain.value = 1;
    gate.connect(dest);
    const prev = chokes.get(channel.choke);
    if (prev) {
      prev.gain.setValueAtTime(1, Math.max(0, time - 0.0005));
      prev.gain.linearRampToValueAtTime(0, time + 0.006);
    }
    chokes.set(channel.choke, gate);
    out = gate;
  }

  const voice = playNote(ctx, out, channel, {
    time,
    key: note.k,
    vel: clamp(note.v == null ? 0.8 : note.v, 0.01, 1),
    dur,
  }, buffers);
  if (voice && voice.release) voice.release(time + dur);
  return voice;
}
