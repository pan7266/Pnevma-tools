import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Triple Factor Laser Coach by Pnevma Tools";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "#f8fafc",
          background: "linear-gradient(135deg, #16191f 0%, #23262d 58%, #2b251d 100%)",
          fontFamily: "Open Sans, Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <div
            style={{
              width: "108px",
              height: "108px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(245, 180, 91, 0.55)",
              borderRadius: "24px",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 64 64">
              <path d="M10 43L32 10l22 43H10Z" fill="none" stroke="#f5b45b" strokeWidth="4" strokeLinejoin="round" />
              <path d="M21 40h22" stroke="#66a3ff" strokeWidth="5" strokeLinecap="round" />
              <circle cx="32" cy="32" r="4" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "34px", fontWeight: 800, color: "#f5b45b" }}>Pnevma Tools</div>
            <div style={{ fontSize: "24px", color: "#aeb7c5" }}>CO2 laser recommendation workflow</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: "78px", lineHeight: 1, fontWeight: 800, letterSpacing: "0" }}>
            Triple Factor Laser Coach
          </div>
          <div style={{ maxWidth: "940px", fontSize: "32px", lineHeight: 1.28, color: "#d7dde7" }}>
            Machine motion, optics, vector geometry, and feedback corrections for laser job settings.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
