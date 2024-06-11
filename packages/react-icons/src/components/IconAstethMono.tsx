import * as React from "react";
import type { SVGProps } from "react";
const IconAstethMono = (props: SVGProps<SVGSVGElement>) => (
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
          d="m21.48 17.11-5.31 3.13-5.3-3.13 5.3 9.66zM11.78 13.88l4.41 2.56 4.41-2.54-4.42-2.44z"
        />
        <path
          fill="currentColor"
          d="M16.18.65c-8.84 0-16 7.16-16 16s7.16 16 16 16 16-7.16 16-16-7.16-16-16-16m-.04 4.78h.01s0-.02.02-.02h.04l5.65 8.67-.1.05-5.6 3.2-5.6-3.2s-.11-.04-.09-.05l5.65-8.67zm8.04 15.43a7.85 7.85 0 0 1-2.31 4.72 8.07 8.07 0 0 1-5.69 2.31c-2.15 0-4.17-.82-5.69-2.31a7.88 7.88 0 0 1-2.31-4.72c-.2-1.78.23-3.59 1.22-5.1l.18-.27 6.6 3.77 6.49-3.71s.11-.08.12-.07l.18.27a7.8 7.8 0 0 1 1.22 5.1z"
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
export default IconAstethMono;
