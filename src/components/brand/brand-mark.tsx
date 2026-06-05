type BrandMarkProps = {
  className?: string;
  title?: string;
};

const dotPositions = [
  { cx: 8, cy: 6 },
  { cx: 8, cy: 16 },
  { cx: 8, cy: 26 },
] as const;

export function BrandMark({ className = "", title = "DAS Systems" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 80 32"
      width="80"
      height="32"
      className={`block shrink-0 text-text-primary ${className}`.trim()}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {dotPositions.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={2.8} fill="currentColor" opacity={0.85} />
      ))}
      <circle cx={36} cy={16} r={7.5} stroke="currentColor" strokeWidth={1.6} />
      <rect x={31.5} y={15} width={9} height={2} rx={1} fill="currentColor" />
      <rect x={35} y={11.5} width={2} height={9} rx={1} fill="currentColor" />
      <path d="M66 8L74 16L66 24L58 16Z" fill="currentColor" />
    </svg>
  );
}
