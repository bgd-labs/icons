import * as React from "react";
import type { SVGProps } from "react";
const IconAkncMono = (props: SVGProps<SVGSVGElement>) => (
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
        <g clipPath="url(#a)">
          <path
            fill="currentColor"
            d="M16 0C7.17 0 0 7.17 0 16s7.17 16 16 16 16-7.17 16-16S24.83 0 16 0m.58 4.39c.06-.35.51-.48.8-.29l6.37 4.54c.29.19.26.61-.06.77l-9.41 5.09zm-2.63 23-6.4-4.58c-.32-.22-.51-.61-.51-.99V10.17c0-.38.19-.77.51-.99l6.43-4.58c.38-.26.9.03.8.48l-2.53 10.91 2.5 10.91c.1.42-.42.74-.8.48zm9.8-4.06-6.37 4.58c-.29.22-.7.06-.8-.29l-2.3-10.11 9.41 5.06c.32.16.35.58.06.77zm1.31-2.59c0 .35-.42.58-.77.42l-9.57-5.15 9.57-5.15c.32-.19.77.03.77.42v9.47z"
          />
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
export default IconAkncMono;