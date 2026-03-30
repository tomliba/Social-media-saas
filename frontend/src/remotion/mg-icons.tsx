import React from "react";

interface IconProps {
  size?: number;
  color?: string;
}

const defaultProps = { size: 48, color: "#6366f1" };

const Checkmark: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Lightning: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
  </svg>
);

const Star: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} />
  </svg>
);

const Heart: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={color} />
  </svg>
);

const Shield: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={color} />
  </svg>
);

const Clock: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const ChartUp: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20l5-5 4 4 9-13" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 6h4v4" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Brain: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2a7 7 0 00-5.19 2.33A5 5 0 002 9a5 5 0 003 4.58V18a4 4 0 004 4h6a4 4 0 004-4v-4.42A5 5 0 0022 9a5 5 0 00-4.81-5A7 7 0 0012 2z" fill={color} opacity={0.85} />
    <path d="M12 2v20" stroke={color} strokeWidth={1.5} opacity={0.4} />
  </svg>
);

const Fire: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.18 2.56-5.72 4-7.5.58-.72 1.5-.24 1.4.65-.12 1.05.3 2.35 1.1 3.35.3.37.85.06.72-.4C9.58 8.5 11 5 13 2c.3-.45 1-.15.96.38-.15 2.12 1.04 4.62 3.04 6.62 2 2 3 4.5 3 6C20 19.42 16.97 23 12 23z" fill={color} />
  </svg>
);

const Target: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <circle cx={12} cy={12} r={6} stroke={color} strokeWidth={2} />
    <circle cx={12} cy={12} r={2} fill={color} />
  </svg>
);

const Medal: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={8} r={6} fill={color} />
    <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Leaf: React.FC<IconProps> = ({ size = 48, color = "#6366f1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.72 17.11 9.65 12.63 17 11V8z" fill={color} />
    <path d="M20.59 2.41a14.54 14.54 0 00-14 2A10.12 10.12 0 004 8a10 10 0 005.5 12.5 14.54 14.54 0 002-14" stroke={color} strokeWidth={2} />
  </svg>
);

// ── Icon registry ──

export const iconMap: Record<string, React.FC<IconProps>> = {
  checkmark: Checkmark,
  lightning: Lightning,
  star: Star,
  heart: Heart,
  shield: Shield,
  clock: Clock,
  chart_up: ChartUp,
  brain: Brain,
  fire: Fire,
  target: Target,
  medal: Medal,
  leaf: Leaf,
};

export function getIcon(name: string, size?: number, color?: string): React.ReactNode {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}
