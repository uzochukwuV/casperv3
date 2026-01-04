import { themeConfig } from '@make-software/cspr-design';
const dexColors = {
  // Core surfaces
  obsidian: '#0B0F14',        // Main dark background
  obsidianSoft: '#121824',   // Cards / panels
  obsidianLight: '#1A2233',  // Elevated surfaces

  // Text & UI neutrals
  pearl: '#F8FAFC',          // Primary text on dark
  mist: '#CBD5E1',           // Secondary text
  slate: '#94A3B8',          // Muted labels
  charcoal: '#334155',       // Borders / dividers
   arcaneBlue: '#3B82F6',
  arcaneBlueSoft: '#60A5FA',
  arcaneBlueDark: '#1E40AF',
   mysticPurple: '#8B5CF6',
  mysticPurpleSoft: '#A78BFA',
  mysticPurpleDark: '#5B21B6',
    gold: '#F59E0B',
  goldSoft: '#FCD34D',
  goldDark: '#B45309',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F97316',
  info: '#38BDF8',
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
      blue600: dexColors.arcaneBlueDark,
      blue100: dexColors.arcaneBlueSoft,

      green500: dexColors.success,
      red500: dexColors.error,
      orange500: dexColors.warning,
    },
    dexColors
  },
};