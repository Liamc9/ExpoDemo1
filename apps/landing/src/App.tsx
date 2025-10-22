import "./styles.css";
import AppStoreBadge from "./assets/download-on-the-app-store.svg"; // App Store SVG
import MockupImage from "./assets/mockup.png"; // Phone mockup image

const APPLE_URL = "https://apps.apple.com/your-app"; // <-- replace
const PLAY_URL = ""; // optional

export default function App() {
  return (
    <main>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="Basil home">
            <span className="logo" />
            <span className="brand-name">Basil</span>
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
              Sell from your home.
              <br />
              Join the homemade revolution.
            </h1>
            <p className="hero-sub">List items in minutes, accept secure payments, and reach local buyers.</p>

            <div className="cta-row" id="download">
              {/* ⬇️ Custom App Store SVG button */}
              <a className="cta cta-store" href={APPLE_URL} target="_blank" rel="noreferrer">
                <img src={AppStoreBadge} alt="Download on the App Store" className="store-badge" />
              </a>

              {PLAY_URL ? (
                <a className="cta cta-store" href={PLAY_URL} target="_blank" rel="noreferrer">
                  <PlayIcon />
                  <span>Get it on Google&nbsp;Play</span>
                </a>
              ) : null}
            </div>

            <p className="availability">Available on iOS{PLAY_URL ? " and Android" : ""}.</p>
          </div>

          {/* ✅ Updated mockup image */}
          <div className="hero-visual">
            <div className="phone">
              <div className="phone-notch" />
              <img src={MockupImage} alt="App preview" className="phone-screen" />
            </div>

            {/* soft BG blobs */}
            <div className="blob blob-a" />
            <div className="blob blob-b" />
          </div>
        </div>
      </section>

      <section id="features" className="values">
        <div className="values-grid">
          <ValueCard title="List in minutes" text="Create your shop, add photos, set prices—done." />
          <ValueCard title="Safe payments" text="Stripe-powered checkout keeps money moving securely." />
          <ValueCard title="Local discovery" text="Reach nearby buyers who love homemade goods." />
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} Basil</span>
          <div className="links">
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="mailto:hello@example.com">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 2l17 10L3 22V2zm3.5 4.2v11.6L14.8 12 6.5 6.2z" />
    </svg>
  );
}
