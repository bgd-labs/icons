import * as React from "react";
import type { SVGProps } from "react";
const IconAstethFull = (props: SVGProps<SVGSVGElement>) => (
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
        <mask
          id="a"
          width={33}
          height={33}
          x={0}
          y={0}
          maskUnits="userSpaceOnUse"
          style={{
            maskType: "luminance",
          }}
        >
          <path fill="#fff" d="M32.18.1h-32v32h32z" />
        </mask>
        <g mask="url(#a)">
          <path
            fill="#fff"
            d="M16.18 32.1c8.84 0 16-7.16 16-16s-7.16-16-16-16-16 7.16-16 16 7.16 16 16 16"
          />
          <path
            fill="#48A0F7"
            d="m9.96 14.99-.18.27c-1.98 3.03-1.53 7 1.06 9.54a7.87 7.87 0 0 0 5.53 2.24z"
          />
          <path
            fill="#48A0F7"
            d="M16.37 18.66 9.96 15l6.41 12.05zm6.42-3.67.18.27c1.98 3.03 1.53 7-1.06 9.54a7.87 7.87 0 0 1-5.53 2.24z"
            opacity={0.6}
          />
          <path
            fill="#48A0F7"
            d="M16.38 18.66 22.79 15l-6.41 12.05zm0-8.19v6.32l5.52-3.16z"
            opacity={0.2}
          />
          <path
            fill="#48A0F7"
            d="m16.38 10.47-5.53 3.16 5.53 3.16z"
            opacity={0.6}
          />
          <path fill="#48A0F7" d="m16.38 5.16-5.53 8.48 5.53-3.17z" />
          <path
            fill="#48A0F7"
            d="m16.38 10.46 5.53 3.17-5.53-8.48z"
            opacity={0.6}
          />
        </g>
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
export default IconAstethFull;
