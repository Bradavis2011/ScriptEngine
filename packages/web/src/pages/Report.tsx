import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ?? "https://scriptengine-production.up.railway.app";

export default function Report() {
  const { token } = useParams<{ token: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/report/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Report not found.");
        }
        return res.json();
      })
      .then((data) => setHtml(data.html))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ background: "#0B0B0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#888", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, color: "#00E5FF" }}>
            ClipScript
          </div>
          <p style={{ margin: 0 }}>Loading your report…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#0B0B0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#888", fontFamily: "system-ui, sans-serif", maxWidth: 400, padding: "0 24px" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, color: "#00E5FF" }}>
            ClipScript
          </div>
          <p style={{ color: "#e5e5e7", margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>{error}</p>
          <p style={{ margin: 0, fontSize: 14 }}>
            If you just placed your order, check back in a minute — reports take 30–60 seconds to generate.
          </p>
          <p style={{ margin: "16px 0 0", fontSize: 13 }}>
            Questions?{" "}
            <a href="mailto:hello@clipscriptai.com" style={{ color: "#00E5FF" }}>
              hello@clipscriptai.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (!html) return null;

  // Render the full HTML from the API directly
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ all: "initial", display: "block" } as any}
    />
  );
}
