import * as React from "react";
import type { SVGProps } from "react";
const IconAavaxMono = (props: SVGProps<SVGSVGElement>) => (
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
          fillRule="evenodd"
          d="M32.18 16.43c0 8.84-7.16 16-16 16s-16-7.16-16-16 7.16-16 16-16 16 7.16 16 16M11.65 22.8H8.54c-.65 0-.97 0-1.17-.13a.82.82 0 0 1-.36-.62c-.01-.23.15-.51.47-1.08l7.67-13.51c.33-.57.49-.86.7-.97.22-.11.49-.11.72 0 .21.11.37.39.7.97l1.58 2.75c.35.63.53.94.61 1.27.09.36.09.73 0 1.09-.08.33-.26.64-.61 1.27l-4.03 7.12v.02c-.37.62-.54.94-.79 1.17-.27.26-.6.45-.96.55-.33.09-.69.09-1.42.09zm7.84 0h4.45c.66 0 .99 0 1.18-.13.21-.14.35-.37.36-.62.01-.22-.15-.5-.46-1.03l-.03-.06-2.23-3.81-.03-.04c-.31-.53-.47-.8-.67-.9a.8.8 0 0 0-.71 0c-.2.11-.37.39-.7.95l-2.22 3.81c-.33.57-.49.85-.48 1.08.02.25.15.48.36.62.19.13.52.13 1.18.13"
          clipRule="evenodd"
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
export default IconAavaxMono;
