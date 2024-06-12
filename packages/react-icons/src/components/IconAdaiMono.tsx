import * as React from "react";
import type { SVGProps } from "react";
const IconAdaiMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="32px"
    height="32px"
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
          d="M11.45 15.23v1.79h10.3c.04-.29.06-.59.06-.88v-.04q0-.435-.06-.87zM11.45 21.91h4.28c2.64 0 4.6-1.27 5.52-3.18h-9.79v3.18zM15.72 10.28h-4.28v3.24h9.81c-.91-1.93-2.88-3.24-5.53-3.24"
        />
        <path
          fill="currentColor"
          d="M15.7.51C7.09.51.11 7.49.11 16.1S7.09 31.69 15.7 31.69s15.59-6.98 15.59-15.59S24.31.51 15.7.51m9.25 14.72h-1.46c.03.27.04.55.04.83v.04c0 .31-.02.62-.06.92h1.47v1.71h-1.89c-1.04 2.79-3.76 4.71-7.33 4.71H9.78v-4.71H7.72v-1.71h2.06v-1.79H7.72v-1.71h2.06V8.75h5.94c3.61 0 6.35 1.94 7.37 4.77h1.86z"
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
export default IconAdaiMono;