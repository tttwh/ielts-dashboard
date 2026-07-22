interface ProgressRingProps {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

export function ProgressRing({
  value,
  label,
  size = 56,
  strokeWidth = 6
}: ProgressRingProps) {
  const clampedValue = clamp(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedValue);
  const percentage = Math.round(clampedValue * 100);

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percentage}
      className="grid shrink-0 place-items-center"
      role="progressbar"
      style={{ height: size, width: size }}
    >
      <svg aria-hidden="true" className="-rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle
          className="stroke-blue-100"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="stroke-ielts-blue"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
}
