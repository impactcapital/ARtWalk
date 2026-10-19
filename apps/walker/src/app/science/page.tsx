import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EcoGo · ARtWalk Miami Citizen Science",
  description:
    "Walk Miami, collect real environmental data, and earn points. EcoGo is the citizen science program inside ARtWalk Miami.",
};

export default function SciencePage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* Back */}
      <Link
        href="/"
        style={{ fontSize: 12, color: "rgba(237,232,223,0.4)", textDecoration: "none", display: "block", marginBottom: 40 }}
      >
        ← ARtWalk Miami
      </Link>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "var(--ar)", marginBottom: 14,
        }}>
          Citizen Science Program
        </p>
        <h1 style={{
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontSize: "clamp(40px,12vw,72px)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          lineHeight: 0.95,
          marginBottom: 24,
        }}>
          <span style={{ color: "var(--teal)" }}>Eco</span>Go
        </h1>
        <p style={{ fontSize: 18, color: "rgba(237,232,223,0.7)", lineHeight: 1.7, maxWidth: 560 }}>
          Every walk through Wynwood, the Design District, or Little Havana is an opportunity to
          collect real environmental data for Miami — and earn points for doing it.
        </p>
      </div>

      {/* What walkers do */}
      <Section title="What you do" color="var(--ar)">
        <p>
          ARtWalk Miami turns your walk into a field survey. When you complete a mission, you're
          collecting structured data that helps scientists, city planners, and conservation groups
          understand Miami's changing environment at street level — where no sensor network reaches.
        </p>
        <p>
          Missions take 2–5 minutes. No prior science experience required. You'll be guided step
          by step.
        </p>
      </Section>

      {/* Mission types */}
      <Section title="What we track" color="var(--teal)">
        <MissionGrid />
      </Section>

      {/* What happens to the data */}
      <Section title="Where the data goes" color="var(--accent)">
        <p>
          Every observation you submit goes through a validation pipeline. Once three independent
          walkers confirm the same thing at the same location, the data is marked as validated and
          published as an open dataset under{" "}
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</ExternalLink>
          {" "}— free for anyone to use.
        </p>
        <DataPartners />
      </Section>

      {/* SciStarter */}
      <Section title="SciStarter credit" color="var(--ar)">
        <p>
          ARtWalk Miami is a registered{" "}
          <ExternalLink href="https://scistarter.org">SciStarter</ExternalLink>{" "}
          project. Participation is credited to your SciStarter profile automatically — no extra
          sign-up required. SciStarter is the world's citizen science database, used by the White
          House Office of Science and Technology Policy, NASA, NOAA, and hundreds of universities.
        </p>
      </Section>

      {/* For schools / educators */}
      <Section title="For educators" color="var(--teal)">
        <p>
          EcoGo missions align with Next Generation Science Standards (NGSS) practices:
          asking questions, collecting field data, and analyzing results. Teachers can request a
          class code to track their students' contributions as a group.
        </p>
        <p>
          <ExternalLink href="mailto:science@artwalk.miami">science@artwalk.miami</ExternalLink>
        </p>
      </Section>

      {/* CTA */}
      <div style={{ marginTop: 48 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "var(--teal)",
            color: "#080c18",
            fontWeight: 800,
            fontSize: 15,
            padding: "16px 28px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Start an EcoGo Walk →
        </Link>
      </div>
    </main>
  );
}

function Section({
  title, color, children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        marginBottom: 16,
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 16,
        lineHeight: 1.75,
        color: "rgba(237,232,223,0.75)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {children}
      </div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: "var(--ar)", textDecoration: "none" }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const MISSIONS = [
  { icon: "🌳", label: "Urban Tree Survey", desc: "Photograph and measure Miami street trees for the city canopy record." },
  { icon: "🦎", label: "Wildlife Sighting", desc: "Log birds, lizards, and plants — synced to iNaturalist." },
  { icon: "🌊", label: "Flood Observation", desc: "Document standing water and drainage after rain." },
  { icon: "🌡️", label: "Urban Heat Check", desc: "Note surface types that trap heat in Miami's hottest blocks." },
  { icon: "🚶", label: "Sidewalk Audit", desc: "Report cracked, blocked, or missing sidewalks." },
  { icon: "🎨", label: "Public Art Check", desc: "Track the condition of Miami's outdoor murals and sculptures." },
  { icon: "💨", label: "Air Quality", desc: "Flag smoke, exhaust, or odors for Miami's air quality map." },
];

function MissionGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 4 }}>
      {MISSIONS.map((m) => (
        <div
          key={m.label}
          style={{
            padding: "14px 16px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{m.icon}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(237,232,223,0.9)", marginBottom: 3 }}>{m.label}</p>
            <p style={{ fontSize: 12, color: "rgba(237,232,223,0.45)", lineHeight: 1.5 }}>{m.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataPartners() {
  const partners = [
    { name: "iNaturalist", desc: "Biodiversity sightings auto-posted" },
    { name: "iTree Landscape", desc: "Tree survey data aligned with Miami-Dade baseline" },
    { name: "Miami-Dade County", desc: "Open GeoJSON datasets shared with city agencies" },
    { name: "SciStarter", desc: "Participation credited to your profile" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      {partners.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(237,232,223,0.8)", minWidth: 150 }}>
            {p.name}
          </span>
          <span style={{ fontSize: 13, color: "rgba(237,232,223,0.4)" }}>{p.desc}</span>
        </div>
      ))}
    </div>
  );
}
