import * as React from "react";
import type { SVGProps } from "react";
const IconBaseMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <g clipPath="url(#clip0_423_62)">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M32 16c0 8.837-7.163 16-16 16S0 24.837 0 16 7.164 0 16 0s16 7.164 16 16m-5 0c0 6.19-5.027 11.209-11.229 11.209-5.884 0-10.71-4.517-11.189-10.267h14.842v-1.884H4.582c.48-5.75 5.306-10.267 11.19-10.267C21.972 4.791 27 9.809 27 16"
        clipRule="evenodd"
      />
    </g>
    <defs>
      <clipPath id="clip0_423_62">
        <path fill="#fff" d="M0 0h32v32H0z" />
      </clipPath>
    </defs>
  </svg>
);
export default IconBaseMono;