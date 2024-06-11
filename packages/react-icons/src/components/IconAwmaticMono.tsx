import * as React from "react";
import type { SVGProps } from "react";
const IconAwmaticMono = (props: SVGProps<SVGSVGElement>) => (
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
          d="M16.92.78c-8.84 0-16 7.16-16 16s7.16 16 16 16 16-7.16 16-16-7.16-16-16-16m9.55 16.16c0 .28-.15.53-.39.67l-4.53 2.61c-.24.14-.54.14-.78 0l-1.7-.98v-2.46l2.09 1.21 3.17-1.83v-3.67l-3.17-1.83-3.12 1.8-.06.03v9.34c0 .28-.15.53-.39.67l-4.53 2.61c-.24.14-.54.14-.78 0L7.75 22.5a.79.79 0 0 1-.39-.67V16.6c0-.28.15-.53.39-.67l4.53-2.61c.24-.14.54-.14.78 0l1.71.98v2.46l-2.09-1.21-3.17 1.83v3.67l3.17 1.83 3.17-1.83v-9.34c0-.28.15-.53.39-.67l4.53-2.61c.24-.14.54-.14.78 0l4.53 2.61c.24.14.39.4.39.67z"
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
export default IconAwmaticMono;
