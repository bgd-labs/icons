import * as React from "react";
import type { SVGProps } from "react";
const IconAmanaMono = (props: SVGProps<SVGSVGElement>) => (
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
        <g fill="currentColor" clipPath="url(#a)">
          <path d="m14.335 25.33 2.25-2.7H1.45c.44.95.96 1.86 1.571 2.7z" />
          <path d="m1.54 22.13 9.783-11.74 7.723 9.27 2.39-2.88 7.123 8.54h.42A15.9 15.9 0 0 0 32 15.99C32.01 7.16 24.848 0 16.005 0S0 7.16 0 16c0 2.17.44 4.24 1.22 6.13zM21.447 6.39a4 4 0 1 1 0 8 4 4 0 1 1 0-8M11.334 4a2 2 0 0 1 2 2c0 1.11-.89 2-2 2s-2.001-.89-2.001-2 .89-2 2-2M6.732 29.02A15.9 15.9 0 0 0 16.005 32c3.461 0 6.652-1.11 9.273-2.98zM28.619 25.83H3.391c.78 1 1.67 1.91 2.67 2.7h19.887c.99-.79 1.89-1.7 2.671-2.7" />
        </g>
        <defs>
          <clipPath id="a">
            <path fill="#fff" d="M0 0h32v32H0z" />
          </clipPath>
        </defs>
      </g>
    </g>
    <defs>
      <clipPath id="circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAmanaMono;