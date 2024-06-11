import * as React from "react";
import type { SVGProps } from "react";
const IconAsdaiFull = (props: SVGProps<SVGSVGElement>) => (
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
          d="M16.61 32.25c8.84 0 16-7.16 16-16s-7.17-16-16-16-16 7.16-16 16 7.16 16 16 16"
        />
        <path
          fill="#fff"
          d="M26.1 13.61h-1.9c-1.05-2.9-3.86-4.89-7.56-4.89h-6.1v4.89H8.42v1.75h2.12v1.84H8.42v1.75h2.12v4.83h6.1c3.66 0 6.45-1.97 7.53-4.83h1.94V17.2H24.6c.04-.31.06-.63.06-.95v-.04c0-.29-.02-.57-.04-.85h1.5v-1.75zm-13.85-3.33h4.39c2.72 0 4.74 1.34 5.67 3.32H12.25zm4.38 11.93h-4.39v-3.26h10.05c-.94 1.95-2.95 3.26-5.66 3.26m6.25-5.92c0 .3-.02.61-.06.91H12.25v-1.84h10.58c.04.3.06.59.06.89v.04z"
        />
        <defs>
          <linearGradient
            id="a"
            x1={16.6}
            x2={16.6}
            y1={0.25}
            y2={32.25}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#91BE5C" />
            <stop offset={1} stopColor="#6DAE5C" />
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
export default IconAsdaiFull;
