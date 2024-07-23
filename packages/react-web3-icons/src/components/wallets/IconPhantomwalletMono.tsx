import * as React from "react";
import type { SVGProps } from "react";
const IconPhantomwalletMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 128"
    width="100%"
    height="100%"
    {...props}
  >
    <g clipPath="url(#6fd2t__a)">
      <circle cx={64} cy={64} r={64} fill="url(#6fd2t__b)" />
      <g filter="url(#6fd2t__c)">
        <path
          fill="url(#6fd2t__d)"
          d="M110.584 64.914H99.142C99.142 41.765 80.173 23 56.772 23c-23.11 0-41.9 18.306-42.36 41.058C13.936 87.577 36.242 108 60.019 108h2.99c20.963 0 49.06-16.233 53.45-36.013.811-3.646-2.1-7.073-5.875-7.073m-70.815 1.031c0 3.096-2.56 5.628-5.689 5.628s-5.688-2.533-5.688-5.628v-9.104c0-3.095 2.56-5.627 5.688-5.627 3.13 0 5.69 2.532 5.69 5.627v9.104Zm19.754 0c0 3.096-2.56 5.628-5.689 5.628s-5.689-2.533-5.689-5.628v-9.104c0-3.095 2.56-5.627 5.689-5.627s5.689 2.532 5.689 5.627z"
        />
      </g>
    </g>
    <defs>
      <linearGradient
        id="6fd2t__b"
        x1={64}
        x2={64}
        y1={0}
        y2={128}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="currentColor" />
        <stop offset={1} stopColor="currentColor" />
      </linearGradient>
      <linearGradient
        id="6fd2t__d"
        x1={65.5}
        x2={65.5}
        y1={23}
        y2={108}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#fff" />
        <stop offset={1} stopColor="#fff" stopOpacity={0.82} />
      </linearGradient>
      <clipPath id="6fd2t__a">
        <path fill="#fff" d="M0 0h128v128H0z" />
      </clipPath>
      <filter
        id="6fd2t__c"
        width={117.472}
        height={100.281}
        x={6.764}
        y={15.36}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.82} />
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_8241_140154"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_8241_140154"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default IconPhantomwalletMono;
