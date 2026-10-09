import type { ReactNode } from "react";
import type { BusinessIcon } from "../lib/business-presets";

// Inline stroke icons for the customer screens (D-057). Decorative only:
// every icon sits next to text that carries the meaning.
type IconName = BusinessIcon | "gift" | "star" | "starFilled" | "cake" | "user" | "phone" | "calendar" | "check" | "google" | "instagram" | "rays";

const paths: Record<IconName, ReactNode> = {
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  star: <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />,
  starFilled: <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor" />,
  cake: <><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  google: <><path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7z" /><path d="M12 21c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9a5.6 5.6 0 0 1-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21z" /><path d="M6.7 13.3a5.7 5.7 0 0 1 0-3.6V7.2H3.5a9.5 9.5 0 0 0 0 8.6z" /><path d="M12 6.8c1.4 0 2.7.5 3.7 1.4l2.7-2.7A9.5 9.5 0 0 0 3.5 7.2l3.2 2.5A5.6 5.6 0 0 1 12 6.8z" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></>,
  rays: <path d="M12 1.2v2.4M12 20.4v2.4M1.2 12h2.4M20.4 12h2.4M4.4 4.4 6 6M18 18l1.6 1.6M19.6 4.4 18 6M6 18l-1.6 1.6" />,
  utensils: <><path d="M7 2v9M4.5 2v5.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V2" /><path d="M7 10v12" /><path d="M17 22V2c-2.2 1.3-3.5 4-3.5 7.5V14H17" /></>,
  cup: <><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 2.5c-.5 1 .5 1.5 0 3M12 2.5c-.5 1 .5 1.5 0 3" /></>,
  bread: <><path d="M5 11a7 4.5 0 0 1 14 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><path d="M9 9.5 10.5 13M13 9 14.5 12.5" /></>,
  cone: <><path d="M7 10a5 5 0 0 1 10 0" /><path d="M6 10h12l-6 12z" /><path d="M8.5 12.5l5 5M11.5 12.5l3.5 3.5" /></>,
  blade: <><circle cx="7" cy="17" r="3" /><circle cx="17" cy="17" r="3" /><path d="M9 15 18 4M15 15 6 4" /></>,
  comb: <><path d="M4 9h16v3H4z" /><path d="M6 12v6M9 12v6M12 12v6M15 12v6M18 12v6" /><path d="M7 9V6a5 5 0 0 1 10 0v3" /></>,
  store: <><path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M5 12v9h14v-9" /><path d="M10 21v-5h4v5" /></>,
  dumbbell: <><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></>,
};

export function Icon({ name, className, strokeWidth = 1.8 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

export const benefitIcons = ["gift", "star", "cake"] as const;
