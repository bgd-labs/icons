import * as React from "react";
import type { SVGProps } from "react";
const IconAusdbcMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <circle cx={16} cy={16} r={15} stroke="currentColor" strokeWidth={2} />
    <g clipPath="url(#ausdbc__circleClip)">
      <g
        style={{
          transform: "scale(.8125)",
          transformOrigin: "50% 50%",
        }}
      >
        <g clipPath="url(#ausdbc__usdbasecoin__clip0_298_899)">
          <path
            fill="currentColor"
            d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0m0 27.22c-6.18 0-11.19-5.01-11.19-11.19S9.37 5.31 15.15 4.87v5.89c-1.98.3-3.13 1.59-3.13 3.14 0 1.98 1.3 2.81 3.14 3.13l1.12.2c1.04.18 1.54.32 1.54 1.08s-.56 1.31-1.75 1.31-1.9-.52-1.9-1.57h-2.36c0 1.77 1.32 3.04 3.36 3.31v2.04h1.84v-2.06c1.93-.31 3.17-1.51 3.17-3.23 0-2.09-1.45-2.82-3.24-3.1l-1.07-.17c-.95-.15-1.48-.37-1.48-1.14 0-.61.45-1.2 1.6-1.2s1.69.58 1.69 1.36h2.36c-.03-1.48-1.08-2.76-3.03-3.08V4.89c5.7.52 10.16 5.31 10.16 11.14 0 6.18-5.01 11.19-11.19 11.19z"
          />
        </g>
        <defs>
          <clipPath id="ausdbc__usdbasecoin__clip0_298_899">
            <path fill="#fff" d="M0 0h32v32H0z" />
          </clipPath>
        </defs>
      </g>
    </g>
    <defs>
      <clipPath id="ausdbc__circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAusdbcMono;
