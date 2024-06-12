import * as React from "react";
import type { SVGProps } from "react";
const IconAenjFull = (props: SVGProps<SVGSVGElement>) => (
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
            fill="#7567CD"
            d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16"
          />
          <path
            fill="#fff"
            d="M25.59 21.69c-.41-.65-1.11-.65-1.44-.65h-2.26c-2.64 0-5.35 0-8.01-.02-.86 0-1.85-.05-2.82-.32-.72-.2-1.15-.63-1.33-1.33-.11-.45-.16-.9-.18-1.38v-.09h14.42c.23 0 .45 0 .7-.05.7-.14 1.08-.56 1.13-1.2 0-.07.02-.16.02-.23.05-.54.11-1.29-.65-1.78-.25-.14-.54-.23-.84-.23H9.55c0-.11.02-.25.02-.38.14-1.58.65-2.14 2.21-2.39.5-.09 1.02-.14 1.51-.14 3.5 0 7.02-.02 10.52-.05.29 0 .56-.02.84-.07.61-.09 1.06-.56 1.13-1.13.23-1.31-.27-2.03-1.56-2.28-.41-.09-.79-.11-1.17-.16-.16 0-.34-.02-.5-.05H12.44c-.23.02-.45.05-.68.07-.7.07-1.4.14-2.12.29-2.73.61-4.04 2.03-4.36 4.81-.02.27-.07.54-.09.83l-.05.41v4.29c.02.18.05.34.07.5.02.36.07.74.14 1.13.41 2.44 1.67 3.75 4.13 4.27.99.23 2.01.34 3.02.36 1.6.02 3.2.05 4.83.05s3.25-.02 4.85-.02c.72-.02 1.58-.07 2.41-.34a1.851 1.851 0 0 0 1.21-1.33c.11-.47.05-.97-.23-1.4z"
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
export default IconAenjFull;