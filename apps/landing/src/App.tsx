// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import config from "./site.config";

const assets = import.meta.glob("./assets/**", { eager: true, as: "url" }) as Record<string, string>;
const img = (p?: string) => (p ? assets[p.startsWith("./") ? p : `./assets/${p}`] : undefined);

function applyCssVars() {
  const c = config.theme.colors;
  const css = `:root{--bg:${c.bg};--text:${c.text};--muted:${c.muted};--primary:${c.primary};--border:${c.border}}`;
  const tag = document.createElement("style");
  tag.setAttribute("data-vars", "true");
  tag.innerHTML = css;
  document.head.appendChild(tag);
}
applyCssVars();

type StoryCard = { title: string; text: string; bullets?: never } | { title: string; bullets: string[]; text?: never };

export default function App() {
  const { brand, stores, links, assets: a, theme } = config;

  const logo = img(brand.logoSrc);
  const mockup = img(a.mockupSrc);
  const appBadge = img(a.appStoreBadgeSrc);
  const playBadge = img(a.playBadgeSrc);

  const hasApple = !!stores.appleUrl;
  const hasPlay = !!stores.playUrl;

  // Scroll reveal
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Story carousel state
  const storyRef = useRef<HTMLDivElement | null>(null);
  const [storyAtStart, setStoryAtStart] = useState(true);
  const [storyAtEnd, setStoryAtEnd] = useState(false);

  const storyCards = useMemo<StoryCard[]>(
    () => [
      { title: "The idea", text: "We noticed talented makers struggling with the business side of selling locally." },
      { title: "The problem", bullets: ["Setup was complex", "Payments were unreliable", "No local discovery"] },
      { title: "The solution", text: "A simple platform that handles everything, so creators can focus on what they do best." },
    ],
    []
  );

  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;
      const eps = 2;
      setStoryAtStart(left <= eps);
      setStoryAtEnd(left >= max - eps);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Testimonials carousel (simple)
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const testimonials = useMemo(
    () => [
      { quote: "I listed my first items in under 10 minutes and got my first local order the same week.", name: "Aoife", role: "Baker • Dublin" },
      { quote: "The storefront looks polished without me needing to design anything. That alone is worth it.", name: "Sam", role: "Woodworker • London" },
      { quote: "Payments are smooth and clear. I can focus on making things, not chasing admin.", name: "Maya", role: "Ceramics • Manchester" },
      { quote: "Local discovery actually works. I’m getting repeat buyers from nearby neighborhoods.", name: "Chris", role: "Candles • Brighton" },
    ],
    []
  );

  return (
    <main>
      {/* NAV */}
      <nav className="nav" aria-label="Primary">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label={`${brand.name} home`}>
            {logo ? <img className="logo-img" src={logo} alt={`${brand.name} logo`} /> : <span className="logo" aria-hidden="true" />}
            <span className="brand-name">{brand.name}</span>
          </a>

          <div className="nav-links" aria-label="Site">
            <a href="#top">Home</a>
            <a href="#product">Product</a>
            <a href="#about">About</a>
          </div>

          <div className="nav-cta" aria-label="Account actions">
            <a className="nav-login" href={links.loginUrl ?? "#"}>
              Login
            </a>
            <a className="nav-start" href={links.getStartedUrl ?? "#download"}>
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero anchor" id="top">
        <div className="container hero-inner">
          <div className="hero-copy" data-reveal>
            <div className="hero-badge">
              <span className="dot" aria-hidden="true" />
              Built for makers. Designed to convert.
            </div>

            <h1 className="hero-title">
              {brand.heroHeading.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                  <br />
                </span>
              ))}
            </h1>

            <p className="hero-sub">{brand.heroSub}</p>

            <div className="hero-actions">
              <a className="btn btn-primary" href={links.getStartedUrl ?? "#download"}>
                Get started
              </a>
              <a className="btn btn-ghost" href="#product">
                See how it works
              </a>
            </div>

            <div className="cta-row" id="download" aria-label="Download the app">
              {hasApple && (
                <a className="cta cta-store" href={stores.appleUrl} target="_blank" rel="noreferrer">
                  {appBadge ? <img src={appBadge} alt="Download on the App Store" className="store-badge" /> : <AppleBadgeFallback />}
                </a>
              )}
              {hasPlay && (
                <a className="cta cta-store" href={stores.playUrl} target="_blank" rel="noreferrer">
                  {playBadge ? <img src={playBadge} alt="Get it on Google Play" className="store-badge" /> : <PlayIcon />}
                </a>
              )}
              <div className="micro-copy">
                <span className="check" aria-hidden="true">
                  ✓
                </span>
                No setup. No code. Start listing today.
              </div>
            </div>
          </div>

          <div className="hero-visual" data-reveal>
            <div className="phone">
              <div className="phone-notch" />
              {mockup ? <img src={mockup} alt="App preview" className="phone-screen" /> : null}
              <div className="phone-shine" aria-hidden="true" />
            </div>

            <div className="blob blob-a" style={{ background: `radial-gradient(circle at 30% 30%, ${theme.blobs?.a ?? "var(--primary)"}, transparent 60%)` }} />
            <div className="blob blob-b" style={{ background: `radial-gradient(circle at 70% 70%, ${theme.blobs?.b ?? "#84fab0"}, transparent 60%)` }} />
          </div>
        </div>

        {a.trustLogos?.length ? (
          <div className="marquee" aria-label="As seen in" data-reveal>
            <div className="marquee-track">
              {[0, 1].map((loop) => (
                <div className="marquee-row" key={loop} aria-hidden={loop === 1}>
                  {a.trustLogos!.map((p, i) => (
                    <img key={`${loop}-${i}`} alt={`Logo ${i + 1}`} src={img(p)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* PRODUCT */}
      <section id="product" className="section section--alt anchor" aria-labelledby="features-title">
        <div className="container">
          <header className="product-head" data-reveal>
            <div className="product-copy">
              <h2 id="features-title" className="section-title">
                Everything you need to sell locally
              </h2>
              <p className="section-sub">A premium storefront, simple fulfilment, and trusted payments — designed to convert without adding busywork.</p>
            </div>

            <div className="product-badges" aria-label="Highlights">
              <span className="p-badge">Fast setup</span>
              <span className="p-badge">Stripe-backed payments</span>
              <span className="p-badge">Local discovery</span>
            </div>
          </header>

          <div className="values-grid" data-reveal>
            {config.features.map((f, i) => (
              <article key={i} className="feature-card" tabIndex={0} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="feature-top">
                  <div className="feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 7L10 17l-5-5" />
                    </svg>
                  </div>
                  <div className="feature-kicker">Feature {String(i + 1).padStart(2, "0")}</div>
                </div>

                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-text">{f.text}</p>
              </article>
            ))}
          </div>

          {config.extras?.checklist?.length || config.extras?.stats?.length ? (
            <div className="values-extras" data-reveal>
              {config.extras?.checklist?.length ? (
                <aside className="checklist" aria-label="What you get">
                  <div className="checklist-head">
                    <h4>What you get with {brand.name}</h4>
                    <p>Built to help you launch quickly and keep selling effortlessly.</p>
                  </div>

                  <ul>
                    {config.extras.checklist.map((line, idx) => (
                      <li key={idx}>
                        <span className="tick" aria-hidden="true">
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : (
                <div />
              )}

              {config.extras?.stats?.length ? (
                <aside className="values-stats" aria-label="Results">
                  <div className="stats-head">
                    <div className="stats-title">Proof, not promises</div>
                    <div className="stats-sub">A snapshot from early usage.</div>
                  </div>

                  <div className="stats-grid">
                    {config.extras.stats.map((s, idx) => (
                      <div className="stat" key={idx}>
                        <div className="num">{s.value}</div>
                        <div className="lab">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </aside>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ABOUT — Our story + Meet the team */}
      <section id="about" className="section anchor" aria-labelledby="about-title">
        <div className="container">
          <div className="about-wrap" data-reveal>
            <header className="about-head">
              <h2 id="about-title" className="section-title section-title--sm">
                Our story
              </h2>
              <p className="section-sub section-sub--sm">{brand.name} started as a simple idea: make it easier for talented people to sell locally without turning it into a full-time job.</p>
            </header>

            {/* Full-bleed Our story carousel */}
            <div className="story-bleed" data-reveal>
              <div className="story-rail story-rail--bleed">
                <div className={`story-fade story-fade-l ${storyAtStart ? "is-hidden" : ""}`} aria-hidden="true" />
                <div className={`story-fade story-fade-r ${storyAtEnd ? "is-hidden" : ""}`} aria-hidden="true" />

                <div className="story-track story-track--bleed" ref={storyRef} aria-label="Our story">
                  {storyCards.map((c, i) => (
                    <article className="story-slide" key={`${c.title}-${i}`}>
                      <div className="story-media" aria-hidden="true">
                        <div className="story-media-ph">
                          <div className="story-media-ph-mark" />
                        </div>
                      </div>

                      <div className="story-panel">
                        <div className="story-kicker">{c.title}</div>

                        {c.bullets?.length ? (
                          <ul className="story-list">
                            {c.bullets.map((b) => (
                              <li key={b}>
                                <span className="story-dot" aria-hidden="true" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="story-p">{c.text}</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* Meet the team (placeholder cards) */}
            <div className="team" data-reveal>
              <header className="team-head">
                <h3 className="team-title">Meet the team</h3>
                <p className="team-sub">A small team obsessed with craft, trust, and making local selling feel modern.</p>
              </header>

              <div className="team-grid">
                {[
                  { name: "Liam", role: "Founder", blurb: "Product, growth, and shipping fast." },
                  { name: "Ava", role: "Design", blurb: "Calm UI, premium brand, seamless flows." },
                  { name: "Noah", role: "Engineering", blurb: "Payments, performance, reliability." },
                ].map((m) => (
                  <article className="team-card" key={m.name}>
                    <div className="team-avatar" aria-hidden="true">
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="team-meta">
                      <div className="team-name">{m.name}</div>
                      <div className="team-role">{m.role}</div>
                    </div>
                    <p className="team-blurb">{m.blurb}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials" aria-labelledby="t-title">
        <div className="t-shell">
          <header className="t-head" data-reveal>
            <h2 id="t-title" className="t-title">
              Loved by makers
            </h2>
            <p className="t-sub">A few words from early sellers using {brand.name} for local orders.</p>
          </header>

          <div className="t-rail" data-reveal>
            <div className="t-fade t-fade-l" aria-hidden="true" />
            <div className="t-fade t-fade-r" aria-hidden="true" />

            <div className="t-track" ref={carouselRef} aria-label="Testimonials">
              {testimonials.map((t, i) => (
                <article className="t-card" key={`${t.name}-${i}`}>
                  <p className="t-quote">“{t.quote}”</p>

                  <div className="t-meta">
                    <div className="t-avatar" aria-hidden="true">
                      {t.name?.[0]?.toUpperCase()}
                    </div>

                    <div className="t-who">
                      <div className="t-name">{t.name}</div>
                      <div className="t-role">{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {config.extras?.faqs?.length ? (
        <section id="faq" className="section anchor" aria-labelledby="faq-title">
          <div className="container">
            <div className="faq-head" data-reveal>
              <div>
                <h2 id="faq-title" className="section-title section-title--sm">
                  Questions, answered
                </h2>
                <p className="section-sub section-sub--sm">Everything you need to know about {brand.name}. If you can’t find what you’re looking for, contact us.</p>
              </div>
            </div>

            <div className="faq-grid" data-reveal>
              {config.extras.faqs.map((item, idx) => (
                <details key={idx} className="faq-item">
                  <summary>
                    <span className="faq-q">{item.q}</span>
                    <span className="faq-icon" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="faq-a">
                    <p>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FOOTER */}
      <footer className="footer" aria-label="Footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a className="footer-logo" href="#top" aria-label={`${brand.name} home`}>
              {logo ? <img className="footer-logo-img" src={logo} alt={`${brand.name} logo`} /> : <span className="footer-mark" aria-hidden="true" />}
              <span className="footer-name">{brand.name}</span>
            </a>
            <p className="footer-blurb">Sell from your home in minutes. Secure payments, local discovery, and a clean storefront—without the hassle.</p>
          </div>

          <div className="footer-right">
            <div className="footer-downloads" aria-label="Get the app">
              {hasApple && (
                <a href={stores.appleUrl} target="_blank" rel="noreferrer">
                  {appBadge ? <img src={appBadge} alt="Download on the App Store" className="footer-store-badge" /> : <AppleBadgeFallback />}
                </a>
              )}
              {hasPlay && (
                <a href={stores.playUrl} target="_blank" rel="noreferrer">
                  {playBadge ? <img src={playBadge} alt="Get it on Google Play" className="footer-store-badge" /> : <PlayIcon />}
                </a>
              )}
            </div>

            {links.social ? (
              <div className="footer-socials" aria-label="Social media">
                {links.social.instagram && (
                  <a href={links.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                    <InstagramIcon />
                  </a>
                )}
                {links.social.twitter && (
                  <a href={links.social.twitter} target="_blank" rel="noreferrer" aria-label="Twitter">
                    <TwitterIcon />
                  </a>
                )}
                {links.social.tiktok && (
                  <a href={links.social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
                    <TikTokIcon />
                  </a>
                )}
                {links.social.linkedin && (
                  <a href={links.social.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                    <LinkedInIcon />
                  </a>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <span>
              © {new Date().getFullYear()} {brand.name}. All rights reserved.
            </span>
            <div className="footer-bottom-links">
              <a href={links.privacyUrl}>Privacy</a>
              <span className="dot">•</span>
              <a href={links.termsUrl}>Terms</a>
              <span className="dot">•</span>
              <a href={`mailto:${links.contactEmail}`}>Contact</a>
            </div>
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

function SocialIcon({ children }: { children: React.ReactNode }) {
  return <span className="social-icon">{children}</span>;
}

function InstagramIcon() {
  return (
    <SocialIcon>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" />
      </svg>
    </SocialIcon>
  );
}

function TwitterIcon() {
  return (
    <SocialIcon>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M23 4.8a9.3 9.3 0 0 1-2.7.7 4.7 4.7 0 0 0 2-2.6 9.4 9.4 0 0 1-3 1.1 4.7 4.7 0 0 0-8 4.3A13.3 13.3 0 0 1 1.6 3.2a4.7 4.7 0 0 0 1.5 6.3 4.6 4.6 0 0 1-2.1-.6v.1a4.7 4.7 0 0 0 3.8 4.6 4.7 4.7 0 0 1-2.1.1 4.7 4.7 0 0 0 4.4 3.3A9.4 9.4 0 0 1 0 19.5a13.3 13.3 0 0 0 7.2 2.1c8.6 0 13.3-7.1 13.3-13.3v-.6A9.4 9.4 0 0 0 23 4.8z" />
      </svg>
    </SocialIcon>
  );
}

function TikTokIcon() {
  return (
    <SocialIcon>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M16 3a5.4 5.4 0 0 0 4 1.7v3.3a8.7 8.7 0 0 1-4-1.1v7.2a5.9 5.9 0 1 1-5.9-5.9c.4 0 .8 0 1.2.1v3.3a2.6 2.6 0 1 0 1.9 2.5V3h2.8z" />
      </svg>
    </SocialIcon>
  );
}

function LinkedInIcon() {
  return (
    <SocialIcon>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 8.98h4v12H3zM9 8.98h3.8v1.6h.1a4.2 4.2 0 0 1 3.8-2.1c4.1 0 4.9 2.7 4.9 6.2v6.3h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9v5.7H9z" />
      </svg>
    </SocialIcon>
  );
}
