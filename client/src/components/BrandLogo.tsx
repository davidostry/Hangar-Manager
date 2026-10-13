
function BrandLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className="brand-logo-svg"
    >
      {/* Logo background */}
      <rect
        x="3"
        y="3"
        width="90"
        height="90"
        rx="23"
        fill="#102C4C"
      />

      {/* Hangar roof */}
      <path
        d="M17 46L48 22L79 46"
        stroke="#67E8F9"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hangar structure */}
      <path
        d="M24 46V81H72V46"
        stroke="#BFDBFE"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Aircraft silhouette */}
      <path
        d="
          M48 40
          C49.5 40 50 43 50.5 46
          L52.5 55
          L64 62
          V66
          L51 62
          L50 72
          L56 77
          V80
          L48 77
          L40 80
          V77
          L46 72
          L45 62
          L32 66
          V62
          L43.5 55
          L45.5 46
          C46 43 46.5 40 48 40
          Z
        "
        fill="white"
      />
    </svg>
  );
}

export default BrandLogo;
