import * as React from "react";
import type { SVGProps } from "react";
const IconAbnbFull = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="32px"
    height="32px"
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
        <g clipPath="url(#a)">
          <path
            fill="#F0B90B"
            fillRule="evenodd"
            d="M16 0c8.84 0 16 7.16 16 16s-7.16 16-16 16S0 24.84 0 16 7.16 0 16 0"
            clipRule="evenodd"
          />
          <path
            fill="#fff"
            d="m8.79 16 .02 4.23 3.59 2.12v2.47l-5.7-3.34v-6.72zM8.79 11.77v2.46L6.7 13v-2.47l2.09-1.24 2.11 1.24zM13.9 10.53 16 9.29l2.1 1.24-2.1 1.24z"
          />
          <path
            fill="#fff"
            d="M10.31 19.35v-2.47l2.09 1.24v2.46zM13.9 23.23l2.1 1.24 2.1-1.24v2.47L16 26.94l-2.1-1.24zM21.1 10.53l2.1-1.24 2.1 1.24V13l-2.1 1.23v-2.46zM23.2 20.23l.01-4.23 2.09-1.24v6.72l-5.7 3.34v-2.48z"
          />
          <path fill="#fff" d="m21.69 19.35-2.09 1.23v-2.47l2.09-1.24z" />
          <path
            fill="#fff"
            d="m21.69 12.65.02 2.47-3.61 2.12v4.24l-2.09 1.23-2.1-1.23v-4.24l-3.6-2.12v-2.47l2.1-1.24 3.58 2.12 3.61-2.12 2.1 1.24zM10.31 8.42 16 5.06l5.69 3.36-2.09 1.24L16 7.53l-3.6 2.13z"
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
export default IconAbnbFull;