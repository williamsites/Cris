import React from 'react';

export type IconName =
  | 'home' | 'calendar' | 'scissors' | 'bag' | 'user' | 'users' | 'chart' | 'settings'
  | 'plus' | 'trash' | 'edit' | 'check' | 'x' | 'clock' | 'phone' | 'instagram'
  | 'logout' | 'lock' | 'image' | 'pin' | 'star' | 'grid' | 'sparkles' | 'search'
  | 'shield' | 'wallet' | 'trending' | 'bell' | 'download' | 'upload' | 'menu';

const P: Record<IconName, React.ReactNode> = {
  home: <><path d="M3.5 10.7 12 3.8l8.5 6.9" /><path d="M5.6 9.6V20h12.8V9.6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  scissors: <><circle cx="6.5" cy="6.5" r="2.6" /><circle cx="6.5" cy="17.5" r="2.6" /><path d="M8.7 8.3 20 19M8.7 15.7 20 5" /></>,
  bag: <><path d="M6 7.5h12l1.2 12.2H4.8L6 7.5Z" /><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20c.6-3.7 3.6-6 7.2-6s6.6 2.3 7.2 6" /></>,
  users: <><circle cx="9.5" cy="8.5" r="3.2" /><path d="M3.5 20c.5-3.4 3-5.6 6-5.6s5.5 2.2 6 5.6" /><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 14.6c2 .7 3.4 2.6 3.7 5.4" /></>,
  chart: <><path d="M4 20h16" /><path d="M6.5 20V12M11.5 20V5.5M16.5 20v-5" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  settings: <><path d="M4 7h3M11 7h9M4 12h9M17 12h3M4 17h5M13 17h7" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="17" r="2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M4 7h16M9.5 7V4.5h5V7" /><path d="M6.5 7l1 13h9l1-13" /></>,
  edit: <><path d="M4 20h4.2L20 8.2 15.8 4 4 15.8V20Z" /><path d="M14.4 5.6 18.4 9.6" /></>,
  check: <path d="M4.5 12.8 9.5 17.6 19.5 6.6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  clock: <><circle cx="12" cy="12" r="8.4" /><path d="M12 7.4V12l3.2 2" /></>,
  phone: <path d="M4.2 4.4h3.6l1.9 4.6-2 1.2a12.4 12.4 0 0 0 6.1 6.1l1.2-2 4.6 1.9v3.6a1.2 1.2 0 0 1-1.3 1.2A16.9 16.9 0 0 1 3 5.7a1.2 1.2 0 0 1 1.2-1.3Z" />,
  instagram: <><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" /></>,
  logout: <><path d="M14.5 12H4.5M9 7.2 4.5 12 9 16.8" /><path d="M12.5 4h4.8A2.2 2.2 0 0 1 19.5 6.2v11.6A2.2 2.2 0 0 1 17.3 20h-4.8" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10.5" rx="3" /><path d="M8 10V7.6a4 4 0 0 1 8 0V10" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M4.5 17.5 10 12.6l3.4 3 2.8-2.4 3.8 3.6" /></>,
  pin: <><path d="M12 21.2c3.9-3.9 6.4-7 6.4-10.4a6.4 6.4 0 1 0-12.8 0c0 3.4 2.5 6.5 6.4 10.4Z" /><circle cx="12" cy="10.4" r="2.4" /></>,
  star: <path d="m12 3.6 2.6 5.5 5.9.8-4.3 4.2 1.1 5.9L12 17.2l-5.3 2.8 1.1-5.9-4.3-4.2 5.9-.8L12 3.6Z" />,
  sparkles: <><path d="M12 3.5 13.6 9 19 10.6 13.6 12.3 12 17.8 10.4 12.3 5 10.6 10.4 9 12 3.5Z" /><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></>,
  search: <><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4 4" /></>,
  shield: <><path d="M12 3.5 19 6v6c0 4.3-3 7.4-7 8.5-4-1.1-7-4.2-7-8.5V6l7-2.5Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  wallet: <><rect x="3.5" y="6" width="17" height="13" rx="3.4" /><path d="M3.5 10h17" /><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" /></>,
  trending: <><path d="M4 15.5 9.5 10l3.5 3.4L20 6.5" /><path d="M15.5 6.5H20v4.4" /></>,
  bell: <><path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6" /><path d="M4.8 17h14.4M10 20h4" /></>,
  download: <><path d="M12 4v11M8 11.5l4 4 4-4" /><path d="M4.5 19.5h15" /></>,
  upload: <><path d="M12 15V4M8 7.5l4-4 4 4" /><path d="M4.5 19.5h15" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}
