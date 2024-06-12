import * as React from "react";
import type { SVGProps } from "react";
const IconStethFull = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32px"
    height="32px"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <g clipPath="url(#a)">
      <path
        fill="#fff"
        d="M16 32c8.84 0 16-7.16 16-16S24.84 0 16 0 0 7.16 0 16s7.16 16 16 16"
      />
      <path
        fill="#48A0F7"
        d="m9.78 14.89-.18.27c-1.98 3.03-1.53 7 1.06 9.54a7.87 7.87 0 0 0 5.53 2.24z"
      />
      <path
        fill="#48A0F7"
        d="M16.19 18.56 9.78 14.9l6.41 12.05zm6.42-3.67.18.27c1.98 3.03 1.53 7-1.06 9.54a7.87 7.87 0 0 1-5.53 2.24z"
        opacity={0.6}
      />
      <path
        fill="#48A0F7"
        d="m16.2 18.56 6.41-3.66-6.41 12.05zm0-8.19v6.32l5.52-3.16z"
        opacity={0.2}
      />
      <path fill="#48A0F7" d="m16.2 10.37-5.53 3.16 5.53 3.16z" opacity={0.6} />
      <path fill="#48A0F7" d="m16.2 5.06-5.53 8.48 5.53-3.17z" />
      <path fill="#48A0F7" d="m16.2 10.36 5.53 3.17-5.53-8.48z" opacity={0.6} />
    </g>
    <defs>
      <clipPath id="a">
        <path fill="#fff" d="M0 0h32v32H0z" />
      </clipPath>
    </defs>
  </svg>
);
export default IconStethFull;