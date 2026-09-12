import {
  siDocker,
  siRedis,
  siPostgresql,
  siRabbitmq,
  siNodedotjs,
  siSocketdotio,
  siRazorpay,
  siKubernetes,
  siGithubactions,
  siGit,
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
  kubernetes: { icon: siKubernetes },
  githubactions: { icon: siGithubactions },
  git: { icon: siGit },
};

export type BrandName = keyof typeof ICONS | "elb" | "vpc" | "sqs" | "eventbridge";

// AWS Application Integration services share one console color
const AWS_PINK = "#E7157B";

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
  if (name === "sqs") {
    // SQS glyph: stacked messages leaving a queue
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke={AWS_PINK} strokeWidth="1.8" aria-hidden>
        <rect x="2.5" y="6" width="12" height="12" rx="2" />
        <path d="M5.5 10h6M5.5 13.5h4" />
        <path d="M16.5 12h4.5m0 0-2.2-2.4M21 12l-2.2 2.4" />
      </svg>
    );
  }
  if (name === "eventbridge") {
    // EventBridge glyph: one event into the bus, rules fanning out
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke={AWS_PINK} strokeWidth="1.8" aria-hidden>
        <path d="M11 3.5v17" />
        <path d="M2.5 12H11" />
        <path d="M11 12h4.2V5.5h4M11 12h6.5m-6.5 0h4.2v6.5h4" />
        <circle cx="21" cy="5.5" r="1.3" fill={AWS_PINK} stroke="none" />
        <circle cx="21" cy="12" r="1.3" fill={AWS_PINK} stroke="none" />
        <circle cx="21" cy="18.5" r="1.3" fill={AWS_PINK} stroke="none" />
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
