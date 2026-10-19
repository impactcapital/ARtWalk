import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100svh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: "48px 28px",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ar)", marginBottom: 16 }}>
        Miami · Augmented Art Walk
      </p>
      <h1 style={{
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontSize: "clamp(52px,14vw,96px)",
        fontWeight: 900,
        letterSpacing: "-0.03em",
        lineHeight: 0.92,
        marginBottom: 28,
      }}>
        <span style={{ color: "var(--accent)" }}>ARt</span>Walk<br />
        Miami
      </h1>
      <p style={{ fontSize: 17, color: "var(--fg)", opacity: 0.6, maxWidth: 340, marginBottom: 40, lineHeight: 1.6 }}>
        Walk the streets. Discover augmented art hidden across Miami's most vibrant neighborhoods.
      </p>
      <Link href="/walk" style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: "var(--accent)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        padding: "16px 28px",
        borderRadius: 8,
        textDecoration: "none",
        width: "fit-content",
      }}>
        Start Walking →
      </Link>
    </main>
  );
}
