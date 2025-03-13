import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "250px",
      base: "420px",
      keymanager: "540px",
      extension: "579px",
      extension2: "588px",
      md: "768px",
      lg: "1100px",
      xl: "1400px",
      xxl: "1800px"
    },
    borderRadius: {
      "1000": "1000px",
      "200": "16px",
      "150": "12px",
      "100": "8px",
      "50": "4px",
      "25": "2px",
      full: "360px"
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))"
      },
      boxShadow: {
        "bottom-100": "0px 1px 2px 0px rgba(27, 36, 44, 0.12)",
        "bottom-200":
          "0px 2px 8px -1px rgba(27, 36, 44, 0.08), 0px 2px 2px -1px rgba(27, 36, 44, 0.04)",
        "bottom-300":
          "0px 8px 16px -2px rgba(27, 36, 44, 0.12), 0px 2px 2px -1px rgba(27, 35, 44, 0.04)",
        "bottom-400":
          "0px 16px 24px -6px rgba(27, 36, 44, 0.16), 0px 2px 2px -1px rgba(27, 36, 44, 0.04)",
        "top-100": "0px -1px 2px 0px rgba(27, 36, 44, 0.12)",
        "top-200":
          "0px -2px 8px -1px rgba(27, 36, 44, 0.08), 0px -2px 2px -1px rgba(27, 36, 44, 0.04)",
        "top-300":
          "0px -8px 16px -2px rgba(27, 36, 44, 0.12), 0px -2px 2px -1px rgba(27, 35, 44, 0.04)",
        "top-400":
          "0px -16px 24px -6px rgba(27, 36, 44, 0.16), 0px -2px 2px -1px rgba(27, 36, 44, 0.04)"
      },
      fontFamily: {
        // Adding AtiplaND
        atipland: ["AtiplaND", "sans-serif"],
        // Adding Satoshi variations
        "satoshi-variable": ["Satoshi-Variable", "sans-serif"],
        "satoshi-variableitalic": ["Satoshi-VariableItalic", "sans-serif"],
        "satoshi-light": ["Satoshi-Light", "sans-serif"],
        "satoshi-lightitalic": ["Satoshi-LightItalic", "sans-serif"],
        "satoshi-regular": ["Satoshi-Regular", "sans-serif"],
        "satoshi-italic": ["Satoshi-Italic", "sans-serif"],
        "satoshi-medium": ["Satoshi-Medium", "sans-serif"],
        "satoshi-mediumitalic": ["Satoshi-MediumItalic", "sans-serif"],
        "satoshi-bold": ["Satoshi-Bold", "sans-serif"],
        "satoshi-bolditalic": ["Satoshi-BoldItalic", "sans-serif"],
        "satoshi-black": ["Satoshi-Black", "sans-serif"],
        "satoshi-blackitalic": ["Satoshi-BlackItalic", "sans-serif"]
      },
      fontSize: {
        xsmall: "0.625rem",
        small: "0.75rem",
        base: "0.875rem",
        large: "1rem",
        xlarge: "1.125rem",
        logo: "1.25rem",
        header: "2rem"
      },
      lineHeight: {
        caption: "1rem",
        small: "1.25rem",
        base: "1.5rem",
        header: "2.75rem"
      },
      fontWeight: {
        regular: "400",
        semibold: "600"
      },
      keyframes: {
        // Currency dropdown animation
        "popup-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "popup-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" }
        },

        // Keymanager dropdown animation
        reveal: {
          "0%": { maxHeight: "0" },
          "100%": { maxHeight: "1500px" }
        },
        conceal: {
          "0%": { maxHeight: "1500px" },
          "100%": { maxHeight: "0" }
        },

        // Keymanager Add Controller
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        fadeOut: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
      },

      animation: {
        // Currency dropdown animation
        "popup-in": "popup-in 0.2s ease-out forwards",
        "popup-out": "popup-out 0.2s ease-out forwards",

        // Keymanager dropdown animation
        reveal: "reveal 0.5s ease-in-out forwards",
        conceal: "conceal 0.5s ease-in-out forwards",

        // Keymanager Add Controller
        "fade-in": "fadeIn 0.2s ease-in-out forwards",
        "fade-out": "fadeOut 0.2s ease-in-out forwards"
      }
    },
    colors: {
      // light mode | dark mode
      "primary-50": "#FFF7F7",
      "primary-100": "#FDDCDB",
      "primary-200": "#FCB8BE",
      "primary-300": "#F893A6",
      "primary-400": "#F2779A",
      "primary-500": "#EA4C89",
      "primary-600": "#C9377E",
      "primary-700": "#A82672",
      "primary-800": "#871864",
      "primary-900": "#700E5B",

      "secondary-50": "#EEFFFD",
      "secondary-100": "#DEFCF8",
      "secondary-200": "#BEFAF7",
      "secondary-300": "#9BEFF1",
      "secondary-400": "#7EDAE4",
      "secondary-500": "#55BDD3",
      "secondary-600": "#3E97B5",
      "secondary-700": "#2A7497",
      "secondary-800": "#1B547A",
      "secondary-900": "#103C65",

      "positive-50": "#F7FFF1",
      "positive-100": "#EEFCE5",
      "positive-200": "#DAF9CD",
      "positive-300": "#BCEDAE",
      "positive-400": "#9CDC93",
      "positive-500": "#72C56E",
      "positive-600": "#50A953",
      "positive-700": "#378D41",
      "positive-800": "#237233",
      "positive-900": "#155E2A",

      "negative-50": "#FFF4EC",
      "negative-100": "#FEE6D7",
      "negative-200": "#FEC7AF",
      "negative-300": "#FCA186",
      "negative-400": "#FA7D68",
      "negative-500": "#F84337",
      "negative-600": "#D5282B",
      "negative-700": "#B21B2B",
      "negative-800": "#8F1129",
      "negative-900": "#770A27",

      "warning-50": "#FFFBEE",
      "warning-100": "#FEF6D9",
      "warning-200": "#FEEBB3",
      "warning-300": "#FDDC8D",
      "warning-400": "#FBCD70",
      "warning-500": "#FAB642",
      "warning-600": "#D79330",
      "warning-700": "#B37221",
      "warning-800": "#905515",
      "warning-900": "#77400C",

      "neutral-0": "#FFFFFF",
      "neutral-25": "#E8E8E8",
      "neutral-50": "#F8F8F8",
      "neutral-100": "#F1F1F1",
      "neutral-200": "#D6D8DB",
      "neutral-300": "#BABCBE",
      "neutral-400": "#7D8286",
      "neutral-500": "#41474D",
      "neutral-600": "#383F45",
      "neutral-700": "#2B3239",
      "neutral-800": "#1C2126",
      "neutral-900": "#171B1F",

      "background-darktheme": "#1C2126",

      background: "#f8fafb",
      black: "#000000",
      white: "#ffffff",
      pink: "#EE6EA3",
      lightPink: "rgb(255, 160, 213)",
      green: "#4cca61",
      red: "#ca4c4c",
      lightGrey: "#E0E0E0"
    },
    gridTemplateColumns: {
      "desktop-layout": `
        [full-width-start] minmax(var(--padding-inline-desktop), 1fr) 
        [breakout-start] minmax(0, var(--breakout-size)) 
        [content-start] min(100% - (var(--padding-inline-desktop) * 2), var(--content-max-width))
        [content-end] 
        minmax(0, var(--breakout-size)) [breakout-end] 
        minmax(var(--padding-inline-desktop), 1fr) [full-width-end]
        `,
      "tablet-layout": `
        [full-width-start] minmax(var(--padding-inline-tablet), 1fr) 
        [content-start] min(100% - (var(--padding-inline-tablet) * 2), var(--content-max-width))
        [content-end] 
        minmax(var(--padding-inline-tablet), 1fr) [full-width-end]
        `,
      "mobile-layout": `
        [full-width-start] minmax(var(--padding-inline-mobile), 1fr) 
        [content-start] min(100% - (var(--padding-inline-mobile) * 2), var(--content-max-width))
        [content-end] 
        minmax(var(--padding-inline-mobile), 1fr) [full-width-end]`,
      "global-grid-desktop": "repeat(12,minmax(0,1fr))",
      "global-grid-tablet": "repeat(8,minmax(0,1fr))",
      "global-grid-mobile": "repeat(4,minmax(0,1fr))",
      "3": "repeat(3, minmax(0, 1fr))",
      "2": "repeat(2, minmax(0, 1fr))",
      "nft-1": "repeat(4, minmax(200px, 1fr))",
      "nft-2": "repeat(auto-fill, minmax(200px, 1fr))"
    },
    gridColumn: {
      "full-width": "full-width-start / full-width-end",
      content: "content-start / content-end",
      breakout: "breakout-start / breakout-end"
    }
  },
  plugins: [],
};
export default config;
