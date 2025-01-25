export class Player {
    private playbackNode: AudioWorkletNode | null = null;
    private audioContext: AudioContext | null = null;
    private gainNode: GainNode | null = null;
    private isMuted: boolean = false;

    async init(sampleRate: number) {
        this.audioContext = new AudioContext({ sampleRate });
        await this.audioContext.audioWorklet.addModule("audio-playback-worklet.js");

        this.playbackNode = new AudioWorkletNode(this.audioContext, "audio-playback-worklet");
        this.gainNode = this.audioContext.createGain();
        
        this.playbackNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    play(buffer: Int16Array) {
        if (this.playbackNode) {
            this.playbackNode.port.postMessage(buffer);
        }
    }

    stop() {
        if (this.playbackNode) {
            this.playbackNode.port.postMessage(null);
        }
    }

    setMuted(muted: boolean) {
        this.isMuted = muted;
        if (this.gainNode) {
            this.gainNode.gain.value = muted ? 0 : 1;
        }
    }

    getMuted(): boolean {
        return this.isMuted;
    }
}
