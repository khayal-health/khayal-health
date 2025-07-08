import React from "react";

class LogoConfig {
  private static readonly SIZE_CLASSES = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  } as const;

  static getSizeClass(size: keyof typeof LogoConfig.SIZE_CLASSES): string {
    return LogoConfig.SIZE_CLASSES[size];
  }
}

class SVGDefinitions {
  static renderGradients(): JSX.Element {
    return (
      <defs>
        {/* Main gradient */}
        <linearGradient
          id="primaryGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#06D6A0" />
          <stop offset="30%" stopColor="#4ECDC4" />
          <stop offset="70%" stopColor="#45B7D1" />
          <stop offset="100%" stopColor="#2E86AB" />
        </linearGradient>

        {/* Accent gradient */}
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="50%" stopColor="#6BCF7F" />
          <stop offset="100%" stopColor="#4D9DE0" />
        </linearGradient>

        {/* Inner glow */}
        <radialGradient id="innerGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        {/* Drop shadow filter */}
        <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="8"
            floodOpacity="0.15"
            floodColor="#2E86AB"
          />
        </filter>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    );
  }
}

// Heart shape renderer class
class HeartRenderer {
  static renderOuterRing(animated: boolean): JSX.Element {
    return (
      <circle
        cx="60"
        cy="60"
        r="55"
        fill="none"
        stroke="url(#primaryGradient)"
        strokeWidth="2"
        opacity="0.3"
        className={animated ? "animate-pulse-ring" : ""}
      />
    );
  }

  static renderHeartBase(animated: boolean): JSX.Element {
    return (
      <path
        d="M60 95 
           C35 78, 15 58, 15 35 
           C15 18, 28 8, 45 8 
           C52 8, 58 12, 60 18
           C62 12, 68 8, 75 8 
           C92 8, 105 18, 105 35 
           C105 58, 85 78, 60 95 Z"
        fill="url(#primaryGradient)"
        filter="url(#dropShadow)"
        className={animated ? "animate-heartbeat" : ""}
      />
    );
  }

  static renderInnerHighlight(): JSX.Element {
    return (
      <path
        d="M60 85 
           C40 70, 25 52, 25 35 
           C25 25, 33 18, 45 18 
           C52 18, 58 22, 60 28
           C62 22, 68 18, 75 18 
           C87 18, 95 25, 95 35 
           C95 52, 80 70, 60 85 Z"
        fill="url(#innerGlow)"
      />
    );
  }
}

// Leaf/wellness symbol renderer class
class LeafRenderer {
  static renderMainStem(): JSX.Element {
    return (
      <path
        d="M60 35 Q60 50, 60 70"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  static renderLeaves(): JSX.Element[] {
    return [
      // Left leaf
      <path
        key="left-leaf"
        d="M60 45 Q48 40, 42 48 Q48 52, 60 50"
        fill="rgba(255,255,255,0.7)"
      />,
      // Right leaf
      <path
        key="right-leaf"
        d="M60 45 Q72 40, 78 48 Q72 52, 60 50"
        fill="rgba(255,255,255,0.7)"
      />,
      // Small accent leaves
      <path
        key="small-left-leaf"
        d="M60 55 Q52 52, 48 57 Q52 60, 60 58"
        fill="rgba(255,255,255,0.5)"
      />,
      <path
        key="small-right-leaf"
        d="M60 55 Q68 52, 72 57 Q68 60, 60 58"
        fill="rgba(255,255,255,0.5)"
      />,
    ];
  }

  static renderComplete(animated: boolean): JSX.Element {
    return (
      <g className={animated ? "animate-leaf-sway" : ""}>
        {LeafRenderer.renderMainStem()}
        {LeafRenderer.renderLeaves()}
      </g>
    );
  }
}

// Floating particles renderer class
class ParticleRenderer {
  private static readonly PARTICLES = [
    {
      cx: 30,
      cy: 30,
      r: 2,
      className: "animate-float-particle-1",
      opacity: 0.6,
    },
    {
      cx: 90,
      cy: 35,
      r: 1.5,
      className: "animate-float-particle-2",
      opacity: 0.7,
    },
    {
      cx: 25,
      cy: 70,
      r: 1,
      className: "animate-float-particle-3",
      opacity: 0.5,
    },
    {
      cx: 95,
      cy: 75,
      r: 1.5,
      className: "animate-float-particle-4",
      opacity: 0.6,
    },
  ];

  static renderParticles(): JSX.Element[] {
    return ParticleRenderer.PARTICLES.map((particle, index) => (
      <circle
        key={`particle-${index}`}
        cx={particle.cx}
        cy={particle.cy}
        r={particle.r}
        fill="url(#accentGradient)"
        className={particle.className}
        opacity={particle.opacity}
      />
    ));
  }
}

// Central glow renderer class
class GlowRenderer {
  static renderCentralGlow(animated: boolean): JSX.Element {
    return (
      <circle
        cx="60"
        cy="45"
        r="3"
        fill="rgba(255,255,255,0.9)"
        filter="url(#glow)"
        className={animated ? "animate-glow-pulse" : ""}
      />
    );
  }
}

// Main Logo class component
interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

class KhayalLogoComponent extends React.Component<LogoProps> {
  private getSizeClass(): string {
    return LogoConfig.getSizeClass(this.props.size || "md");
  }

  private renderBackgroundEffect(): JSX.Element | null {
    if (!this.props.animated) return null;

    return (
      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 via-blue-400/10 to-green-400/10 rounded-full blur-xl animate-bg-shift -z-10" />
    );
  }

  render(): JSX.Element {
    const { className = "", animated = true } = this.props;

    return (
      <div className={`relative ${this.getSizeClass()} ${className}`}>
        <svg
          className={`w-full h-full ${animated ? "animate-float" : ""}`}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {SVGDefinitions.renderGradients()}
          {HeartRenderer.renderOuterRing(animated)}
          {HeartRenderer.renderHeartBase(animated)}
          {HeartRenderer.renderInnerHighlight()}
          {LeafRenderer.renderComplete(animated)}
          {animated && ParticleRenderer.renderParticles()}
          {GlowRenderer.renderCentralGlow(animated)}
        </svg>
        {this.renderBackgroundEffect()}
      </div>
    );
  }
}

// Export as functional component for compatibility
export const KhayalLogo: React.FC<LogoProps> = (props) => {
  return <KhayalLogoComponent {...props} />;
};
