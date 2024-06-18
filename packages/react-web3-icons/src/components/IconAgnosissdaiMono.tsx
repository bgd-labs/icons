import type { SVGProps } from "react";
const IconAgnosissdaiMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx={16} cy={16} r={15} stroke="currentColor" strokeWidth={2} />
    <g clipPath="url(#circleClip)">
      <g
        style={{
          transform: "scale(0.8125)",
          transformOrigin: "50% 50%",
        }}
      >
        <path
          fill="currentColor"
          d="M17.25 10.54h-4.31v1.94h4.87a2.57 2.57 0 0 1 2.57 2.57h-7.44v1.91h7.44a2.57 2.57 0 0 1-2.57 2.57h-4.87v2.01h4.31c3.04 0 5.5-2.46 5.5-5.5s-2.46-5.5-5.5-5.5"
        />
        <path
          fill="currentColor"
          d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0m1.23 24.05h-6.86v-4.53H8.33v-1.15c0-.78.63-1.42 1.42-1.42h.62v-1.91h-.62c-.78 0-1.42-.63-1.42-1.42v-1.15h2.04V8h6.86a8.02 8.02 0 0 1 8.02 8.02 8.02 8.02 0 0 1-8.02 8.02z"
        />
      </g>
    </g>
    <defs>
      <clipPath id="circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAgnosissdaiMono;