import * as React from "react";
import type { SVGProps } from "react";
const IconAmaiMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="1em"
    height="1em"
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
        <path
          fill="currentColor"
          d="M15.59 18.31h1.73l1.09-2.29H14.5zM12.04 16.02v2.29h1.66l-1.08-2.29zM19.21 18.31h1.65v-2.29h-.57z"
        />
        <path
          fill="currentColor"
          d="M16.56.78c-8.84 0-16 7.16-16 16s7.16 16 16 16 16-7.16 16-16-7.16-16-16-16m8.61 19.37h-2.56v3.12h-1.74v-3.12h-2.51l-1.46 3.12h-.86l-1.47-3.12h-2.52v3.12h-1.74v-3.12H7.75v-1.84h2.56v-2.29H7.75v-1.84h2.56v-3.73h1.58l1.76 3.73h5.64l1.77-3.73h1.56v3.73h2.56v1.84h-2.56v2.29h2.56v1.84z"
        />
      </g>
    </g>
    <defs>
      <clipPath id="circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAmaiMono;
