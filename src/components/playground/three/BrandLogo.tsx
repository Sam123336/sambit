import {
  siDocker,
  siRedis,
  siPostgresql,
  siRabbitmq,
  siNodedotjs,
  siSocketdotio,
  siRazorpay,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

// color overrides where the official hex is invisible on a dark background
const ICONS: Record<string, { icon: SimpleIcon; color?: string }> = {
  docker: { icon: siDocker },
  redis: { icon: siRedis },
  postgres: { icon: siPostgresql },
  rabbitmq: { icon: siRabbitmq },
  node: { icon: siNodedotjs },
  socketio: { icon: siSocketdotio, color: "#e8eaf0" },
  razorpay: { icon: siRazorpay, color: "#528FF0" },
};

export type BrandName = keyof typeof ICONS | "elb" | "vpc";

/** Official brand mark (via simple-icons), or the AWS-console-style ELB glyph. */
export default function BrandLogo({
  name,
  size = 14,
  className = "",
}: {
  name: BrandName;
  size?: number;
  className?: string;
}) {
  if (name === "elb") {
    // Elastic Load Balancing glyph: hub circle fanning out to three targets
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="none"
        stroke="#8C4FFF"
        strokeWidth="1.8"
        aria-hidden
      >
        <circle cx="7" cy="12" r="3.4" />
        <circle cx="19" cy="4.5" r="2.1" />
        <circle cx="19" cy="12" r="2.1" />
        <circle cx="19" cy="19.5" r="2.1" />
        <path d="M10 10.5 16.9 5.6M10.4 12h6.5M10 13.5l6.9 4.9" />
      </svg>
    );
  }
  if (name === "vpc") {
    // AWS-console-style VPC glyph: dashed network boundary around a subnet block
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="none"
        stroke="#8C4FFF"
        strokeWidth="1.8"
        aria-hidden
      >
        <rect x="2.5" y="4.5" width="19" height="15" rx="2" strokeDasharray="3 2.4" />
        <rect x="8" y="9.5" width="8" height="5" rx="1" />
      </svg>
    );
  }
  const { icon, color } = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={color ?? `#${icon.hex}`}
      aria-hidden
    >
      <path d={icon.path} />
    </svg>
  );
}
