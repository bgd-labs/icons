import * as React from "react";
import type { SVGProps } from "react";
const IconAeuraMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="1em"
    height="1em"
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
          d="M21.87 21.25h-1.18v1.72h1.18c.3 0 .53-.07.68-.21.16-.14.23-.34.23-.6v-.11a.77.77 0 0 0-.23-.56c-.16-.16-.38-.24-.68-.24"
        />
        <path
          fill="currentColor"
          d="M16.3.51C7.69.51.71 7.49.71 16.1S7.69 31.69 16.3 31.69s15.59-6.98 15.59-15.59S24.91.51 16.3.51m-3.74 26.11H8.31v-6.55h4.13v1.18h-2.9v1.5h2.79v1.18H9.54v1.52h3.01v1.18zm5.93-2.27c0 .75-.2 1.33-.6 1.76-.39.42-.98.64-1.76.64s-1.37-.21-1.77-.64c-.39-.42-.59-1.01-.59-1.76v-4.28H15v4.28c0 .39.09.69.27.91s.46.33.85.33.67-.11.85-.33.27-.52.27-.91v-4.28h1.23v4.28zm5.76-2.25c0 .27-.07.52-.22.76-.14.23-.36.41-.66.53v.17c.22.02.39.11.51.25.13.14.2.32.2.54v2.26h-1.23v-1.96q0-.225-.12-.36c-.07-.09-.2-.14-.38-.14h-1.42v2.47H19.7v-6.55h2.51c.34 0 .63.05.89.14s.47.22.64.39c.17.16.31.35.39.57.09.22.14.45.14.7v.22zm-2.59-3.69-5.26-5.22-.09-.09-.09.09-5.26 5.23-5.17-5.13L16.31 2.83l10.52 10.46-5.16 5.13z"
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
export default IconAeuraMono;
