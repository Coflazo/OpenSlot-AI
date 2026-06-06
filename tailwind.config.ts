import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" }
    },
    extend: {
      colors: {
        // Sanzo Wada Combination #286 + companions
        peacock: {
          DEFAULT: "#00939B",
          50: "#E6F4F5",
          100: "#C8E8EA",
          200: "#92D2D6",
          300: "#5BBCC2",
          400: "#25A6AE",
          500: "#00939B",
          600: "#00767D",
          700: "#005A60",
          800: "#003E42",
          900: "#002326"
        },
        violet: {
          DEFAULT: "#40456A",
          50: "#ECEDF2",
          100: "#D3D5E0",
          200: "#A8ABC1",
          300: "#7C80A2",
          400: "#5A5E86",
          500: "#40456A",
          600: "#333756",
          700: "#262943",
          800: "#1A1C2F",
          900: "#0E0F1B"
        },
        sienna: {
          DEFAULT: "#AE5224",
          50: "#FAEEE6",
          100: "#F2D2BD",
          200: "#E2A37C",
          300: "#D27744",
          400: "#BD5E2E",
          500: "#AE5224",
          600: "#8B411D",
          700: "#673015",
          800: "#43200E",
          900: "#1F0F07"
        },
        saffron: {
          DEFAULT: "#FCB315",
          50: "#FFF6E0",
          100: "#FEE8B0",
          200: "#FED77A",
          300: "#FDC647",
          400: "#FCBC2C",
          500: "#FCB315",
          600: "#CC8E07",
          700: "#956805",
          800: "#5D4103",
          900: "#2E2001"
        },
        vert: {
          DEFAULT: "#489B6E",
          50: "#E9F4EE",
          100: "#C9E2D3",
          200: "#92C5A7",
          300: "#5DA77C",
          400: "#489B6E",
          500: "#3A8059",
          600: "#2D6446",
          700: "#214A33",
          800: "#142F21",
          900: "#081610"
        },
        ink: {
          DEFAULT: "#111314",
          50: "#F6F6F6",
          100: "#E3E3E4",
          200: "#C2C2C4",
          300: "#9D9DA1",
          400: "#6E6E73",
          500: "#3F4044",
          600: "#26282A",
          700: "#1A1B1D",
          800: "#111314",
          900: "#070808"
        },
        porcelain: "#FAF8F1",
        porcelain2: "#F3F0E5",
        stone: "#E7E1D6",
        stone2: "#D6CEC0",

        // shadcn semantic aliases (overridden to our palette)
        background: "#FAF8F1",
        foreground: "#111314",
        border: "#E7E1D6",
        input: "#E7E1D6",
        ring: "#00939B",
        card: { DEFAULT: "#FFFFFF", foreground: "#111314" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#111314" },
        primary: { DEFAULT: "#00939B", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F3F0E5", foreground: "#111314" },
        muted: { DEFAULT: "#F3F0E5", foreground: "#6E6E73" },
        accent: { DEFAULT: "#F3F0E5", foreground: "#111314" },
        destructive: { DEFAULT: "#AE5224", foreground: "#FFFFFF" }
      },
      fontFamily: {
        sans: [
          "Satoshi",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif"
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      fontSize: {
        "title-xl": ["28px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "title-lg": ["22px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "650" }],
        section: ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "650" }],
        kpi: ["32px", { lineHeight: "36px", letterSpacing: "-0.025em", fontWeight: "700" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        meta: ["12px", { lineHeight: "16px", fontWeight: "500", letterSpacing: "0.005em" }],
        btn: ["14px", { lineHeight: "20px", fontWeight: "650" }]
      },
      borderRadius: {
        card: "14px",
        btn: "10px",
        chip: "999px",
        lg: "14px",
        md: "10px",
        sm: "6px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,19,20,0.04), 0 0 0 1px rgba(231,225,214,0.6)",
        cardHover: "0 8px 24px -8px rgba(17,19,20,0.12), 0 0 0 1px rgba(231,225,214,0.6)",
        ring: "0 0 0 4px rgba(0,147,155,0.18)",
        drawer: "-20px 0 60px -20px rgba(17,19,20,0.18)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseRing: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,147,155,0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(0,147,155,0)" }
        },
        urgent: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "fade-in": "fade-in 240ms cubic-bezier(0.16,1,0.3,1) both",
        "pulse-ring": "pulseRing 2.4s ease-in-out infinite",
        urgent: "urgent 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite"
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
