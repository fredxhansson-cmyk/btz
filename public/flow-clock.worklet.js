// Drives the sequencer's lookahead scheduler from the audio thread, so
// playback keeps its timing even when the browser throttles timers in a
// background tab. Posts a tick roughly every 11 ms and outputs silence.
class FlowClock extends AudioWorkletProcessor {
  constructor() {
    super();
    this.count = 0;
  }

  process() {
    this.count += 1;
    if (this.count % 4 === 0) this.port.postMessage(0);
    return true;
  }
}

registerProcessor('flow-clock', FlowClock);
