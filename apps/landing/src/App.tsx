// src/App.tsx
import "./styles.css";
import config from "./site.config";

const assetUrls = import.meta.glob("./assets/**", { eager: true, as: "url" }) as Record<string, string>;

function resolveAsset(path?: string) {
  if (!path) return undefined;
  // normalise to a "./assets/..." key
  const key = path.startsWith("./") ? path : `./assets/${path}`;
  return assetUrls[key];
}

function applyCssVars() {
  const { bg, text, muted, primary, border } = config.theme.colors;
  const css = `:root{--bg:${bg};--text:${text};--muted:${muted};--primary:${primary};--border:${border}}`;
  const tag = document.createElement("style");
  tag.setAttribute("data-vars", "true");
  tag.innerHTML = css;
  document.head.appendChild(tag);
}
applyCssVars();

export default function App() {
  const { brand, stores, links, assets, theme } = config;
  const hasApple = !!stores.appleUrl;
  const hasPlay = !!stores.playUrl;

  const logoSrc = resolveAsset(brand.logoSrc);
  const mockupSrc = resolveAsset(assets.mockupSrc);
  const appStoreBadgeSrc = resolveAsset(assets.appStoreBadgeSrc);
  const playBadgeSrc = resolveAsset(assets.playBadgeSrc);

  return (
    <main>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label={`${brand.name} home`}>
            {logoSrc ? <img className="logo-img" src={logoSrc} alt={`${brand.name} logo`} /> : <span className="logo" />}
            <span className="brand-name">{brand.name}</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="top">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 className="hero-title">
              {brand.heroHeading.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                  <br />
                </span>
              ))}
            </h1>
            <p className="hero-sub">{brand.heroSub}</p>

            <div className="cta-row" id="download">
              {hasApple && (
                <a className="cta cta-store" href={stores.appleUrl} target="_blank" rel="noreferrer">
                  {appStoreBadgeSrc ? <img src={appStoreBadgeSrc} alt="Download on the App Store" className="store-badge" /> : <AppleBadgeFallback />}
                </a>
              )}

              {hasPlay && (
                <a className="cta cta-store" href={stores.playUrl} target="_blank" rel="noreferrer">
                  {playBadgeSrc ? <img src={playBadgeSrc} alt="Get it on Google Play" className="store-badge" /> : <PlayIcon />}
                </a>
              )}
            </div>
          </div>

          <div className="hero-visual">
            <div className="phone">
              <div className="phone-notch" />
              <img src={mockupSrc} alt="App preview" className="phone-screen" />
            </div>

            {/* Background blobs */}
            <div
              className="blob blob-a"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${theme.blobs?.a ?? "var(--primary)"}, transparent 60%)`,
              }}
            />
            <div
              className="blob blob-b"
              style={{
                background: `radial-gradient(circle at 70% 70%, ${theme.blobs?.b ?? "#84fab0"}, transparent 60%)`,
              }}
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="values" aria-labelledby="features-title">
        {/* Section header from config */}
        <header className="values-head">
          {config.sections?.features?.eyebrow && <span className="values-eyebrow">{config.sections.features.eyebrow}</span>}
          <h2 id="features-title" className="values-title">
            {config.sections?.features?.title ?? "Features that help you sell"}
          </h2>
          {config.sections?.features?.subtitle && <p className="values-sub">{config.sections.features.subtitle}</p>}
        </header>

        {/* Grid from config.features */}
        <div className="values-grid">
          {config.features.map((f, i) => (
            <div key={i} className="card" tabIndex={0}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>

        {/* Checklist + Stats from config.extras */}
        {(config.extras?.checklist?.length || config.extras?.stats?.length) && (
          <div className="values-extras" aria-label="What you get">
            {/* Checklist */}
            {config.extras?.checklist?.length ? (
              <div className="checklist">
                <h4>What you get with {config.brand.name}</h4>
                <ul>
                  {config.extras.checklist.map((line, idx) => (
                    <li key={idx}>
                      <span className="tick">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div />
            )}

            {/* Stats band */}
            {config.extras?.stats?.length ? (
              <div className="values-stats" role="group" aria-label="Results">
                {config.extras.stats.map((s, idx) => (
                  <div className="stat" key={idx}>
                    <div className="num">{s.value}</div>
                    <div className="lab">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Trust logos (optional) */}
        {config.assets.trustLogos && config.assets.trustLogos.length > 0 && (
          <div className="values-trust" aria-label="As seen in">
            {config.assets.trustLogos.map((logo, i) => {
              const src = resolveAsset(logo);
              return <img key={i} alt={`Logo ${i + 1}`} src={src} />;
            })}
          </div>
        )}

        {/* FAQ (from config.extras.faqs) */}
        {config.extras?.faqs?.length ? (
          <section className="values-faq" aria-labelledby="faq-title">
            <h3 id="faq-title" className="values-title" style={{ fontSize: "clamp(22px,3vw,28px)", marginBottom: 12 }}>
              Frequently asked
            </h3>
            <div className="faq-grid">
              {config.extras.faqs.map((item, idx) => (
                <details key={idx}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          <div className="links">
            <a href={links.privacyUrl}>Privacy</a>
            <a href={links.termsUrl}>Terms</a>
            <a href={`mailto:${links.contactEmail}`}>Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PlayIcon() {
  return (
    <svg width="182" height="54" viewBox="0 0 182 54" fill="none" xmlns="http://www.w3.org/2000/svg" className="store-badge">
      <rect x="0.5" y="0.5" width="181" height="53" rx="11.5" stroke="currentColor" />
      <g transform="translate(12,10)">
        <polygon points="0,16 0,0 20,10" fill="currentColor" opacity="0.9" />
        <text x="28" y="16" fontFamily="Inter, system-ui" fontSize="14" fontWeight="700" fill="currentColor">
          Get it on Google Play
        </text>
      </g>
    </svg>
  );
}

function AppleBadgeFallback() {
  return (
    <svg width="150" height="44" viewBox="0 0 150 44" xmlns="http://www.w3.org/2000/svg" className="store-badge">
      <rect width="150" height="44" rx="12" fill="#000" />
      <text x="16" y="27" fontFamily="Inter, system-ui" fontSize="14" fontWeight="700" fill="#fff">
        Download on the App Store
      </text>
    </svg>
  );
}
