import { themeConfig } from '@make-software/cspr-design';
const dexColors = {
  // --- Core Surfaces ---
  obsidian: '#0B0F14',       // Deepest layer (Body background)
  obsidianSoft: '#121824',   // Mid layer (Cards, Modals)
  obsidianLight: '#1C2533',  // Top layer (Input fields, Hover states)

  // --- Brand & Accents ---
  arcaneBlue: '#3B82F6',     // Primary Action
  arcaneBlueSoft: '#60A5FA', // Hover on Primary
  arcaneBlueGlow: 'rgba(59, 130, 246, 0.15)', // Shadow/Glows

  mysticPurple: '#8B5CF6',   // Secondary Brand (LPs/Pools)
  mysticPurpleSoft: '#A78BFA',

  // --- Status ---
  success: '#10B981',        // Vibrant emerald for profit/In-Range
  error: '#F43F5E',          // Rose-red for danger/Price drops
  warning: '#F59E0B',        // Amber for slippage/Out-of-Range
  
  // --- Neutrals & Text ---
  pearl: '#F8FAFC',          // Headlines
  mist: '#E2E8F0',           // Body text
  slate: '#94A3B8',          // Labels / Placeholders
  charcoal: '#334155',       // Subtle Borders
  
  // Logic Fix: Mapping white to soft obsidian for card backgrounds 
  // allows components using theme.dexColors.white to work in dark mode
  white: '#121824',
  black: '#000000'
};

export const AppTheme = {
  light: {
    ...themeConfig.light,
    styleguideColors: {
      ...themeConfig.light.styleguideColors,

      backgroundPrimary: dexColors.obsidian,
      backgroundSecondary: dexColors.obsidianSoft,
      backgroundTertiary: dexColors.obsidianLight,

      contentPrimary: dexColors.pearl,
      contentSecondary: dexColors.mist,
      contentTertiary: dexColors.slate,
      contentOnFill: dexColors.pearl,

      blue500: dexColors.arcaneBlue,
      // blue600: dexColors.arcaneBlueDark,
      blue100: dexColors.arcaneBlueSoft,

      green500: dexColors.success,
      red500: dexColors.error,
      orange500: dexColors.warning,
    },
    dexColors
  },
};






// export const AppTheme = {
//   dark: { // Renamed to 'dark' as these are dark-mode values
//     ...themeConfig.dark, 
//     styleguideColors: {
//       ...themeConfig.dark.styleguideColors,

//       // Backgrounds
//       backgroundPrimary: dexColors.obsidian,
//       backgroundSecondary: dexColors.obsidianSoft,
//       backgroundTertiary: dexColors.obsidianLight,

//       // Text
//       contentPrimary: dexColors.pearl,
//       contentSecondary: dexColors.mist,
//       contentTertiary: dexColors.slate,
      
//       // Borders
//       borderPrimary: dexColors.charcoal,

//       // Brand Overrides
//       blue500: dexColors.arcaneBlue,
//       blue600: dexColors.arcaneBlueDark,
//       blue100: dexColors.arcaneBlueSoft,
//     },
//     dexColors // Accessible via props.theme.dexColors
//   },
// };