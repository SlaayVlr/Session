import { ReactNode } from "react";

const GEAR_TEETH = Array.from({ length: 8 }, (_, i) => i * 45);

export function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {GEAR_TEETH.map((deg) => (
        <rect
          key={deg}
          x="10.6"
          y="2.3"
          width="2.8"
          height="4"
          rx="1"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <path
        fillRule="evenodd"
        d="M18,12 A6,6 0 1,0 6,12 A6,6 0 1,0 18,12 Z M14.1,12 A2.1,2.1 0 1,0 9.9,12 A2.1,2.1 0 1,0 14.1,12 Z"
      />
    </svg>
  );
}

export function ChevronIcon({
  size = 16,
  open = false,
}: {
  size?: number;
  open?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 0.25s var(--ease)",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TrashIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function DownloadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function ImageIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 18 5-5.2a2 2 0 0 1 2.8-.1L15 15.5" />
      <path d="M14 14.5 16.4 12a2 2 0 0 1 2.8 0L21 13.7" />
    </svg>
  );
}

export function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PencilIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3.5a2.1 2.1 0 0 1 3 3L8.5 18 4 19.5 5.5 15 17 3.5Z" />
    </svg>
  );
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number, steps = 8) {
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / steps;
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

export function LiveIcon({ size = 22 }: { size?: number }) {
  const cx = 12;
  const cy = 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#e2413e"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="live-icon"
    >
      <path className="live-icon-arc live-icon-arc--1" d={arcPath(cx, cy, 6.5, 140, 220)} />
      <path className="live-icon-arc live-icon-arc--2" d={arcPath(cx, cy, 10, 130, 230)} />
      <path className="live-icon-arc live-icon-arc--1" d={arcPath(cx, cy, 6.5, -40, 40)} />
      <path className="live-icon-arc live-icon-arc--2" d={arcPath(cx, cy, 10, -50, 50)} />
      <circle className="live-icon-dot" cx={cx} cy={cy} r="3.4" fill="#e2413e" stroke="none" />
    </svg>
  );
}

function toolSvg(children: ReactNode, size: number) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CursorIcon({ size = 16 }: { size?: number }) {
  return toolSvg(<path d="M5 3.5 18 10l-5.5 1.5L11 17 5 3.5Z" />, size);
}

export function LineToolIcon({ size = 16 }: { size?: number }) {
  return toolSvg(
    <>
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
      <path d="M6.5 17.5 17.5 6.5" />
      <circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" />
    </>,
    size,
  );
}

export function ArrowToolIcon({ size = 16 }: { size?: number }) {
  return toolSvg(
    <>
      <path d="M5 19 19 5" />
      <path d="M9 5h10v10" />
    </>,
    size,
  );
}

export function RectToolIcon({ size = 16 }: { size?: number }) {
  return toolSvg(<rect x="4" y="6" width="16" height="12" rx="1.5" />, size);
}

export function CircleToolIcon({ size = 16 }: { size?: number }) {
  return toolSvg(<circle cx="12" cy="12" r="8" />, size);
}

export function TextToolIcon({ size = 16 }: { size?: number }) {
  return toolSvg(
    <>
      <path d="M5 6h14" />
      <path d="M12 6v13" />
      <path d="M9 19h6" />
    </>,
    size,
  );
}

export function PenToolIcon({ size = 16 }: { size?: number }) {
  return toolSvg(
    <path d="M4 17.5C7 14 9 10 11 6c.6-1.2 2.4-1.2 3 0 2 4 4 8 7 11.5-3.5-1-6-1-9 0-3.2 1.1-5.5 1-8 0Z" />,
    size,
  );
}

export function UndoIcon({ size = 16 }: { size?: number }) {
  return toolSvg(
    <>
      <path d="M7 8 3 12l4 4" />
      <path d="M3 12h11a6 6 0 0 1 0 12h-2" />
    </>,
    size,
  );
}
