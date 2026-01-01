// src/site.config.ts
export type Feature = { title: string; text: string };
export type FAQ = { q: string; a: string };
export type Stat = { value: string; label: string };

export type SiteConfig = {
  brand: {
    name: string;
    heroHeading: string;
    heroSub: string;
    logoSrc?: string;
  };
  stores: {
    appleUrl?: string;
    playUrl?: string;
  };

  links: {
    privacyUrl: string;
    termsUrl: string;
    contactEmail: string;
    loginUrl?: string;
    getStartedUrl?: string;
    social?: {
      twitter?: string;
      instagram?: string;
      tiktok?: string;
      linkedin?: string;
    };
  };

  assets: {
    mockupSrc: string; // "./assets/mockup.png"
    appStoreBadgeSrc?: string; // "./assets/download-on-the-app-store.svg"
    playBadgeSrc?: string; // "./assets/google-play-badge.svg"
    trustLogos?: string[]; // ["./assets/logo1.svg", ...]
  };
  /** Core features grid (cards) */
  features: Feature[];
  /** Section-level copy for Features */
  sections?: {
    features?: {
      eyebrow?: string; // e.g., "Why Basil"
      title?: string; // e.g., "Everything you need…"
      subtitle?: string; // supporting copy under title
    };
  };
  /** Extras render below the feature grid */
  extras?: {
    checklist?: string[]; // persuasive bullets
    stats?: Stat[]; // little KPI band
    faqs?: FAQ[]; // lightweight FAQ
  };
  theme: {
    colors: {
      bg: string;
      text: string;
      muted: string;
      primary: string;
      border: string;
    };
    blobs?: { a?: string; b?: string };
  };
  seo?: { title?: string; description?: string; ogImage?: string };
};

// ✅ Example configuration — edit only this per project
const config: SiteConfig = {
  brand: {
    name: "Basil",
    heroHeading: "Sell from your home.\nJoin the homemade revolution.",
    heroSub: "List items in minutes, accept secure payments, and reach local buyers.",
    logoSrc: "./assets/AppIcon.png",
  },
  stores: {
    appleUrl: "https://apps.apple.com/your-app",
    // playUrl: "https://play.google.com/store/apps/details?id=your.app",
  },
  links: {
    privacyUrl: "/privacy.html",
    termsUrl: "/terms.html",
    contactEmail: "hello@example.com",
    social: {
      instagram: "https://instagram.com/yourbrand",
      twitter: "https://twitter.com/yourbrand",
      tiktok: "https://tiktok.com/@yourbrand",
    },
  },

  assets: {
    mockupSrc: "./assets/mockup.png",
    appStoreBadgeSrc: "./assets/download-on-the-app-store.svg",
    // playBadgeSrc: "./assets/google-play-badge.svg",
    trustLogos: [
      // add/remove as needed; comment out to hide the bar
      // "./assets/logo1.svg",
      // "./assets/logo2.svg",
      // "./assets/logo3.svg",
    ],
  },
  features: [
    { title: "List in minutes", text: "Create your shop, add photos, set prices—done." },
    { title: "Safe payments", text: "Stripe-powered checkout keeps money moving securely." },
    { title: "Local discovery", text: "Reach nearby buyers who love homemade goods." },
  ],
  sections: {
    features: {
      eyebrow: "Why Basil",
      title: "Everything you need to sell from home — simply.",
      subtitle: "From fast listing to secure payments and local discovery, Basil streamlines every step so you can focus on what you make best.",
    },
  },
  extras: {
    checklist: ["List products in minutes — photos, price, and you’re live.", "Secure Stripe checkout with payout tracking.", "Local discovery tools to reach nearby buyers.", "Order management, receipts, and delivery notes.", "Clean, consistent storefronts. No design skills needed."],
    stats: [
      { value: "5 min", label: "avg. time to first listing" },
      { value: "0%", label: "coding or setup required" },
      { value: "100%", label: "payments secured by Stripe" },
    ],
    faqs: [
      { q: "How do I get paid?", a: "Payments are handled via Stripe. Funds are settled to your connected account on Stripe’s standard payout schedule." },
      { q: "Do I need a website?", a: "No — Basil hosts your storefront and product pages for you. Just share your Basil link." },
      { q: "Is Basil available on iOS and Android?", a: "Yes. You can list, manage, and fulfill orders from our mobile apps." },
      { q: "What fees are there?", a: "Card processing is handled by Stripe. Basil’s own pricing is transparent — see the Pricing section for details." },
    ],
  },
  theme: {
    colors: {
      bg: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      primary: "#2ecc71",
      border: "#e5e7eb",
    },
    blobs: {
      a: "var(--primary)",
      b: "#84fab0",
    },
  },
  seo: {
    title: "Basil – Sell from your home",
    description: "List homemade goods in minutes. Secure payments. Local buyers.",
    // ogImage: "./assets/og.jpg",
  },
};

export default config;
