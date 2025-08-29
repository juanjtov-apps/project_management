import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        'fluid-sm': 'var(--step--1)',
        'fluid-base': 'var(--step-0)',
        'fluid-lg': 'var(--step-1)',
        'fluid-xl': 'var(--step-2)',
        'fluid-2xl': 'var(--step-3)',
        'fluid-3xl': 'var(--step-4)',
        'fluid-4xl': 'var(--step-5)',
      },
      spacing: {
        'safe-left': 'var(--safe-area-inset-left)',
        'safe-right': 'var(--safe-area-inset-right)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(0, 0, 0, 0.1), 0 1px 4px -1px rgba(0, 0, 0, 0.06)",
        elevated: "0 8px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 16px -2px rgba(0, 0, 0, 0.08)",
      },
      colors: {
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
          800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))',
          950: 'hsl(var(--brand-950))',
          DEFAULT: 'hsl(var(--brand-teal))',
          // Original brand colors
          blue: 'hsl(var(--brand-blue))',
          teal: 'hsl(var(--brand-teal))',
          coral: 'hsl(var(--brand-coral))',
          grey: 'hsl(var(--brand-grey))',
          white: 'hsl(var(--brand-white))',
          ink: 'hsl(var(--brand-ink))',
          text: 'hsl(var(--text))',
          muted: 'hsl(var(--muted))',
        },
        navy: {
          50: 'hsl(var(--navy-50))',
          100: 'hsl(var(--navy-100))',
          200: 'hsl(var(--navy-200))',
          300: 'hsl(var(--navy-300))',
          400: 'hsl(var(--navy-400))',
          500: 'hsl(var(--navy-500))',
          600: 'hsl(var(--navy-600))',
          700: 'hsl(var(--navy-700))',
          800: 'hsl(var(--navy-800))',
          900: 'hsl(var(--navy-900))',
          950: 'hsl(var(--navy-950))',
          DEFAULT: 'hsl(var(--navy-600))',
        },
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        text: 'hsl(var(--text))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
