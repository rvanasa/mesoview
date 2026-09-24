// A subtle crosshair marker used to show the `location` query param on maps/images.
export default function LocationCrosshair({
  size = 26,
  color,
  darkMode = false,
}: {
  size?: number;
  color?: string;
  darkMode?: boolean;
}) {
  const resolvedColor =
    color ??
    (darkMode ? 'rgba(134, 239, 172, 0.95)' : 'rgba(22, 163, 74, 0.9)');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ pointerEvents: 'none' }}
    >
      <circle
        cx="12"
        cy="12"
        r="6"
        fill="none"
        stroke={resolvedColor}
        strokeWidth="1.5"
      />
      <line
        x1="12"
        y1="0"
        x2="12"
        y2="6"
        stroke={resolvedColor}
        strokeWidth="1.5"
      />
      <line
        x1="12"
        y1="18"
        x2="12"
        y2="24"
        stroke={resolvedColor}
        strokeWidth="1.5"
      />
      <line
        x1="0"
        y1="12"
        x2="6"
        y2="12"
        stroke={resolvedColor}
        strokeWidth="1.5"
      />
      <line
        x1="18"
        y1="12"
        x2="24"
        y2="12"
        stroke={resolvedColor}
        strokeWidth="1.5"
      />
    </svg>
  );
}
