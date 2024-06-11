import * as React from "react";
import type { SVGProps } from "react";
const IconAghoFull = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle
      cx={16}
      cy={16}
      r={15}
      stroke="url(#paint0_linear_40_91)"
      strokeWidth={2}
    />
    <g clipPath="url(#circleClip)">
      <g
        style={{
          transform: "scale(0.8125)",
          transformOrigin: "50% 50%",
        }}
      >
        <path
          fill="url(#a)"
          d="M16.57.01c8.84 0 16 7.16 16 16s-7.16 16-16 16-16-7.16-16-16 7.16-16 16-16"
        />
        <path
          fill="#fff"
          fillRule="evenodd"
          d="m25.5 20.62-2.18-5.04h-3.5l2.08 4.93h-6.77a4.84 4.84 0 0 1-3.47-1.45 4.904 4.904 0 0 1 0-6.96c.93-.93 2.16-1.45 3.47-1.45h6.45l-1.37-3.29h-5.08c-4.52 0-8.35 3.69-8.35 8.21s3.84 8.21 8.35 8.21h10.38v-3.17z"
          clipRule="evenodd"
        />
        <path
          fill="#fff"
          fillRule="evenodd"
          d="M14.58 11.87a1.641 1.641 0 0 0 0 3.28 1.641 1.641 0 0 0 0-3.28M14.58 16.08a1.641 1.641 0 0 0 0 3.28 1.641 1.641 0 0 0 0-3.28"
          clipRule="evenodd"
        />
        <defs>
          <linearGradient
            id="a"
            x1={16.56}
            x2={16.56}
            y1={0.01}
            y2={32.01}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B3B2D3" />
            <stop offset={0.53} stopColor="#8C8ADA" />
            <stop offset={1} stopColor="#6D69DE" />
          </linearGradient>
        </defs>
      </g>
    </g>
    <defs>
      <clipPath id="circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
      <linearGradient
        id="paint0_linear_40_91"
        x1={26.976}
        y1={4.32}
        x2={6.59198}
        y2={28.352}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#B6509E" />
        <stop offset={1} stopColor="#2EBAC6" />
      </linearGradient>
    </defs>
  </svg>
);
export default IconAghoFull;
