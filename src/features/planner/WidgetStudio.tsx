"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { destinationById, photoUrl } from "../../data/destinations";
import { ACCENTS } from "../../data/trip-document";
import { DEFAULT_WIDGET, loadWidgetSettings, saveWidgetSettings, type WidgetSettings } from "./widget-settings";

type InstallTab = "html" | "wordpress" | "builders" | "link";

const INSTALL_TABS: { id: InstallTab; label: string }[] = [
  { id: "html", label: "Any website" },
  { id: "wordpress", label: "WordPress" },
  { id: "builders", label: "Shopify · Webflow · Wix" },
  { id: "link", label: "Share link" },
];

const CHANNELS = [
  { id: "web", label: "Website chat", detail: "The planner on every page, in your colours" },
  { id: "whatsapp", label: "Continue on WhatsApp", detail: "Travellers can move the chat to WhatsApp" },
  { id: "crm", label: "Leads to your CRM", detail: "Brief, plan, and contact written on each quote request" },
  { id: "callback", label: "Voice callback", detail: "Holiday Advisor calls within 10 minutes" },
] as const;

/** Website widget: brand the planner, preview the real widget, and install it with one line. */
export function WidgetStudio() {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_WIDGET);
  const [loaded, setLoaded] = useState(false);
  const [origin, setOrigin] = useState("https://suite.vibrium.ai");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [installTab, setInstallTab] = useState<InstallTab>("html");
  const [copied, setCopied] = useState<string | null>(null);
  const [channels, setChannels] = useState<Record<string, boolean>>({ web: true, whatsapp: true, crm: true, callback: true });

  useEffect(() => {
    setOrigin(window.location.origin);
    setSettings(loadWidgetSettings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveWidgetSettings(settings);
  }, [settings, loaded]);

  const update = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const validColor = /^#[0-9a-f]{6}$/i.test(settings.color) ? settings.color : "#2c70f6";

  const query = useMemo(() => {
    const params = new URLSearchParams({ name: settings.name || "Trip Planner", color: validColor });
    if (settings.greeting.trim()) params.set("greeting", settings.greeting.trim());
    return params.toString();
  }, [settings.name, settings.greeting, validColor]);

  const attrs = [
    `data-name="${escapeAttr(settings.name || "Trip Planner")}"`,
    `data-color="${validColor}"`,
    settings.label.trim() && settings.label !== "Plan my trip" ? `data-label="${escapeAttr(settings.label)}"` : null,
    settings.greeting.trim() ? `data-greeting="${escapeAttr(settings.greeting.trim())}"` : null,
    settings.position === "left" ? `data-position="left"` : null,
  ].filter(Boolean);
  const snippet = `<script src="${origin}/widget.js"\n  ${attrs.join("\n  ")}\n  async></script>`;
  const hostedLink = `${origin}/embed/trip-planner?${query}`;
  const testPage = `/widget-demo.html?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), label: settings.label, position: settings.position }).toString()}`;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="pl-stack">
      <section className="pl-intro">
        <div>
          <h2>Your trip planner, on your website</h2>
          <p>
            Paste one line on your site and every visitor can plan a holiday with your brand on it. Each quote request lands on
            the quote desk as a qualified lead with the brief and the plan already written.
          </p>
        </div>
        <dl className="pl-intro-stats">
          <div>
            <dt>Setup</dt>
            <dd>1 line</dd>
          </div>
          <div>
            <dt>Chat to lead</dt>
            <dd>23%</dd>
          </div>
          <div>
            <dt>Callback</dt>
            <dd>&lt; 10 min</dd>
          </div>
        </dl>
      </section>

      <div className="pl-widget-grid">
        <div className="pl-stack">
          <section className="card pl-card">
            <header className="pl-card-head">
              <h3>Brand it</h3>
              <p>Changes show in the preview straight away.</p>
            </header>
            <div className="pl-form">
              <label className="pl-field">
                <span>Agency name</span>
                <input value={settings.name} maxLength={40} onChange={(event) => update("name", event.target.value)} />
              </label>
              <div className="pl-field">
                <span>Brand colour</span>
                <div className="pl-swatches">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      className="pl-swatch"
                      style={{ background: accent }}
                      aria-label={`Use ${accent}`}
                      aria-pressed={validColor.toLowerCase() === accent}
                      onClick={() => update("color", accent)}
                    />
                  ))}
                  <input className="pl-hex" value={settings.color} maxLength={7} aria-label="Hex colour" onChange={(event) => update("color", event.target.value)} />
                </div>
              </div>
              <label className="pl-field">
                <span>Button label</span>
                <input value={settings.label} maxLength={30} onChange={(event) => update("label", event.target.value)} />
              </label>
              <label className="pl-field">
                <span>First message</span>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={settings.greeting}
                  placeholder="Hi! I'm your trip planner. I can suggest places, build a day-by-day plan, and give you an idea of the budget."
                  onChange={(event) => update("greeting", event.target.value)}
                />
              </label>
              <div className="pl-field">
                <span>Position</span>
                <div className="segmented" role="group" aria-label="Widget position">
                  {(["right", "left"] as const).map((side) => (
                    <button key={side} type="button" aria-pressed={settings.position === side} onClick={() => update("position", side)}>
                      Bottom {side}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="card pl-card">
            <header className="pl-card-head">
              <h3>What happens after the chat</h3>
            </header>
            <ul className="pl-toggles">
              {CHANNELS.map((channel) => (
                <li key={channel.id}>
                  <div>
                    <strong>{channel.label}</strong>
                    <small>{channel.detail}</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={channels[channel.id]}
                    aria-label={channel.label}
                    className="pl-switch"
                    disabled={channel.id === "web"}
                    onClick={() => setChannels((current) => ({ ...current, [channel.id]: !current[channel.id] }))}
                  >
                    <i aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="pl-preview" aria-label="Live preview">
          <div className="pl-browser">
            <div className="pl-browser-bar">
              <i />
              <i />
              <i />
              <span>{(settings.name || "youragency").toLowerCase().replace(/[^a-z0-9]+/g, "")}.com</span>
            </div>
            <div className="pl-site" style={{ "--brand": validColor } as CSSProperties}>
              <nav className="pl-site-nav">
                <strong>{settings.name || "Your Agency"}</strong>
                <span>Holidays</span>
                <span>Honeymoons</span>
                <span>Visa</span>
                <span>Forex</span>
              </nav>
              <div className="pl-site-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(10,20,30,.15), rgba(10,20,30,.6)), url(${photoUrl(destinationById("bali")?.photos[0] ?? "", 1200)})` }}>
                <h4>Holidays planned around you</h4>
                <p>Beaches, mountains, and cities, with an expert on call.</p>
              </div>
              <div className="pl-site-cards">
                {["maldives", "switzerland", "kerala"].map((id) => destinationById(id)?.photos[0] ?? "").map((id) => (
                  <span key={id} style={{ backgroundImage: `url(${photoUrl(id, 400)})` }} />
                ))}
              </div>
              <div className={`pl-widget pl-widget-${settings.position}`}>
                {previewOpen ? <iframe key={query} src={`/embed/trip-planner?${query}`} title="Widget preview" /> : null}
                <button type="button" className="pl-launcher" style={{ background: validColor }} onClick={() => setPreviewOpen((open) => !open)}>
                  {previewOpen ? "Close" : settings.label || "Plan my trip"}
                </button>
              </div>
            </div>
          </div>
          <p className="pl-preview-note">This is the live widget. Try it: ask for a quote and a lead appears on the quote desk flow.</p>
        </section>
      </div>

      <section className="card pl-card">
        <header className="pl-card-head pl-card-head-row">
          <div>
            <h3>Install</h3>
            <p>Add it before the closing body tag. It loads after your page, so it never slows it down.</p>
          </div>
          <a className="pl-btn" href={testPage} target="_blank" rel="noopener noreferrer">
            Open a test page
          </a>
        </header>
        <div className="segmented pl-install-tabs" role="tablist" aria-label="Install options">
          {INSTALL_TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={installTab === tab.id} onClick={() => setInstallTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {installTab === "link" ? (
          <div className="pl-code-block">
            <p className="pl-steps-lede">A hosted chat page for your Instagram bio, WhatsApp status, emails, or a QR code at the branch.</p>
            <div className="pl-code">
              <code>{hostedLink}</code>
              <button type="button" onClick={() => copy(hostedLink, "link")}>{copied === "link" ? "Copied" : "Copy"}</button>
            </div>
          </div>
        ) : (
          <div className="pl-code-block">
            {installTab === "wordpress" ? (
              <ol className="pl-steps">
                <li>In WordPress, open Appearance → Theme File Editor, or a header and footer plugin.</li>
                <li>Paste the line below into the footer, then save.</li>
              </ol>
            ) : null}
            {installTab === "builders" ? (
              <ol className="pl-steps">
                <li>Shopify: Online Store → Themes → Edit code → theme.liquid, above &lt;/body&gt;.</li>
                <li>Webflow: Site settings → Custom code → Footer code. Wix: Settings → Custom code → Body end.</li>
              </ol>
            ) : null}
            <div className="pl-code">
              <pre>{snippet}</pre>
              <button type="button" onClick={() => copy(snippet, "snippet")}>{copied === "snippet" ? "Copied" : "Copy"}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
