import * as React from "react";
import type { SVGProps } from "react";
const IconAsethMono = (props: SVGProps<SVGSVGElement>) => (
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
          d="M13.51 17.05h-.87l-2.87 4.02h3.74c1.11 0 2.01-.91 2.01-2.02s-.9-2-2.01-2.01zM11.84 15.48l2.87-4.02h-3.67c-1.11 0-2.01.91-2.01 2.02s.9 2 2.01 2.01h.79z"
        />
        <path
          fill="currentColor"
          d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0m-2.49 22.65H8.26c-.44 0-.78-.36-.78-.8 0-.16.06-.3.15-.42l-.02-.02 3.14-4.39c-1.83-.16-3.28-1.68-3.28-3.56 0-1.98 1.61-3.59 3.59-3.59h5.25c.44 0 .78.36.78.8 0 .25-.13.46-.31.6l-3.01 4.22c1.87.13 3.35 1.66 3.35 3.56s-1.61 3.59-3.59 3.59zm9.78-.39h-4.91v-3.39h.91v2.2h1.04v-1.86h.88v1.86h1.17v-2.2h.91zm0-5.12H19.3v1.45h-.91v-4.1h.91v1.47h3.99zm0-6.09h-2.05v1.74h2.05v1.18h-4.91v-1.18h1.95v-1.74h-1.95V9.87h4.91z"
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
export default IconAsethMono;