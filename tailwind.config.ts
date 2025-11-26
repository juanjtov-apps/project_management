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
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
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
        'dark-sm': "0 1px 2px rgba(0, 0, 0, 0.3)",
        'dark-md': "0 4px 12px rgba(0, 0, 0, 0.4)",
        'dark-lg': "0 10px 25px rgba(0, 0, 0, 0.5)",
        'dark-xl': "0 20px 40px rgba(0, 0, 0, 0.6)",
        'dark-2xl': "0 25px 50px rgba(0, 0, 0, 0.7)",
        'glow-mint': "0 0 20px rgba(74, 222, 128, 0.3)",
        'glow-orange': "0 0 20px rgba(249, 115, 22, 0.3)",
        'glow-red': "0 0 20px rgba(239, 68, 68, 0.3)",
      },
      colors: {
        // Proesphere Dark Mode Palette
        pro: {
          'bg-deep': '#0F1115',
          'surface': '#161B22',
          'surface-highlight': '#1F242C',
          'mint': '#4ADE80',
          'mint-dim': '#22C55E',
          'orange': '#F97316',
          'red': '#EF4444',
          'text-primary': '#FFFFFF',
          'text-secondary': '#9CA3AF',
          'border': '#2D333B',
        },
        // Extended Mint Scale
        mint: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          DEFAULT: '#4ADE80',
        },
        // Brand compatibility
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
          DEFAULT: '#4ADE80',
          blue: '#0F1115',
          teal: '#4ADE80',
          coral: '#F97316',
          grey: '#9CA3AF',
          white: '#FFFFFF',
          ink: '#0F1115',
          text: '#FFFFFF',
          muted: '#9CA3AF',
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
          DEFAULT: '#1F242C',
        },
        bg: '#0F1115',
        surface: '#161B22',
        text: '#FFFFFF',
        success: '#4ADE80',
        warning: '#F97316',
        danger: '#EF4444',
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
          "1": "#4ADE80",
          "2": "#F97316",
          "3": "#EF4444",
          "4": "#60A5FA",
          "5": "#A78BFA",
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
      backdropBlur: {
        xs: '2px',
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
        "fade-up": {
          from: {
            opacity: "0",
            transform: "translateY(12px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in": {
          from: {
            opacity: "0",
            transform: "translateX(-20px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "scale-in": {
          from: {
            opacity: "0",
            transform: "scale(0.95)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.4)",
          },
          "50%": {
            boxShadow: "0 0 20px 4px rgba(74, 222, 128, 0.2)",
          },
        },
        shimmer: {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.4s ease-out forwards",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
