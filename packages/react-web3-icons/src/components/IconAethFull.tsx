import * as React from "react";
import type { SVGProps } from "react";
const IconAethFull = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <circle
      cx={16}
      cy={16}
      r={15}
      stroke="url(#fhcu2__paint0_linear_40_91)"
      strokeWidth={2}
    />
    <g clipPath="url(#fhcu2__circleClip)">
      <g
        style={{
          transform: "scale(.8125)",
          transformOrigin: "50% 50%",
        }}
      >
        <g clipPath="url(#fhcu2__kw60j__clip0_294_3463)">
          <path
            fill="#fff"
            d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16"
          />
          <path
            fill="#3B3735"
            d="m16.39 29.096 8.005-11.29-8.005 4.803zm7.718-13.394L16.39 2.884v9.319z"
          />
          <path fill="#1F1D19" d="m16.39 20.865 7.646-4.444-7.646-3.5z" />
          <path fill="#959190" d="M7.944 15.702 15.66 2.884v9.319z" />
          <path fill="#403C3A" d="M15.661 20.865 8.015 16.42l7.646-3.5z" />
          <path fill="#959190" d="m15.661 29.096-8.005-11.29 8.005 4.803z" />
        </g>
        <defs>
          <clipPath id="fhcu2__kw60j__clip0_294_3463">
            <path fill="#fff" d="M0 0h32v32H0z" />
          </clipPath>
        </defs>
      </g>
    </g>
    <defs>
      <linearGradient
        id="fhcu2__paint0_linear_40_91"
        x1={26.976}
        x2={6.592}
        y1={4.32}
        y2={28.352}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#B6509E" />
        <stop offset={1} stopColor="#2EBAC6" />
      </linearGradient>
      <clipPath id="fhcu2__circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAethFull;
