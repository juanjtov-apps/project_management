/**
 * WaveformBars — 18 CSS-animated bars with symmetric bell curve heights.
 * Idle: all bars 3px. Listening: scaleY animation, staggered.
 */

interface WaveformBarsProps {
  isListening: boolean;
}

const BAR_COUNT = 18;

// Bell curve heights for a symmetric waveform shape
const BELL_HEIGHTS = (() => {
  const mid = (BAR_COUNT - 1) / 2;
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const dist = Math.abs(i - mid) / mid;
    return 0.3 + 0.7 * Math.exp(-3 * dist * dist);
  });
})();

export function WaveformBars({ isListening }: WaveformBarsProps) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: "3px",
            height: isListening ? `${BELL_HEIGHTS[i] * 40}px` : "3px",
            backgroundColor: "#4ADE80",
            opacity: isListening ? 0.8 : 0.2,
            animation: isListening
              ? `waveAnim 1s ease-in-out ${i * 0.06}s infinite alternate`
              : "none",
            transition: "height 0.3s ease, opacity 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}
