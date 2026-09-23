// A subtle crosshair marker used to show the `location` query param on maps/images.
export default function LocationCrosshair({
  size = 26,
  color = 'rgba(220, 38, 38, 0.75)',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ pointerEvents: 'none' }}
    >
      <circle cx="12" cy="12" r="6" fill="none" stroke={color} strokeWidth="1.5" />
      <line x1="12" y1="0" x2="12" y2="6" stroke={color} strokeWidth="1.5" />
      <line x1="12" y1="18" x2="12" y2="24" stroke={color} strokeWidth="1.5" />
      <line x1="0" y1="12" x2="6" y2="12" stroke={color} strokeWidth="1.5" />
      <line x1="18" y1="12" x2="24" y2="12" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
