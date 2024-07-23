import * as React from "react";
import type { SVGProps } from "react";
const IconAmaiMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <circle cx={16} cy={16} r={15} stroke="currentColor" strokeWidth={2} />
    <g clipPath="url(#maimimatic__circleClip)">
      <g
        style={{
          transform: "scale(.8125)",
          transformOrigin: "50% 50%",
        }}
      >
        <g fill="currentColor" clipPath="url(#maimimatic__clip0_298_256)">
          <path d="M15.03 17.53h1.73l1.09-2.29h-3.91zm-3.55-2.29v2.29h1.66l-1.08-2.29zm7.17 2.29h1.65v-2.29h-.57z" />
          <path d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0m6.05 19.37v3.12h-1.74v-3.12H17.8l-1.46 3.12h-.86l-1.47-3.12h-2.52v3.12H9.75v-3.12H7.19v-1.84h2.56v-2.29H7.19V13.4h2.56V9.67h1.58l1.76 3.73h5.64l1.77-3.73h1.56v3.73h2.56v1.84h-2.56v2.29h2.56v1.84z" />
        </g>
        <defs>
          <clipPath id="maimimatic__clip0_298_256">
            <path fill="#fff" d="M0 0h32v32H0z" />
          </clipPath>
        </defs>
      </g>
    </g>
    <defs>
      <clipPath id="maimimatic__circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAmaiMono;
