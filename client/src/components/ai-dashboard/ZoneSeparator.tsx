export default function ZoneSeparator() {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        height: 36,
        background: "linear-gradient(180deg, #161B22 0%, #0F1115 100%)",
        position: "relative",
      }}
    >
      {/* Hairline mint gradient */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent 10%, rgba(74,222,128,0.15) 50%, transparent 90%)",
        }}
      />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "8px",
          letterSpacing: "0.16em",
          textTransform: "uppercase" as const,
          color: "#9CA3AF",
        }}
      >
        CONVERSATION
      </span>
    </div>
  );
}
