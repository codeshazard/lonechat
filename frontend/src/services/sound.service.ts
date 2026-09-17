/**
 * Plays a pleasant, subtle two-tone chime using Web Audio API when matched.
 */
export function playMatchSound(): void {
    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        const now = ctx.currentTime;

        // Two-tone chime: 880Hz -> 587Hz
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(587, now + 0.25);

        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        oscillator.start(now);
        oscillator.stop(now + 0.45);
    } catch (_err) {
        // Silently ignore if audio context is blocked by browser policy
    }
}
