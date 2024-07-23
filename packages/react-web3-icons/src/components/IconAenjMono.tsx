import * as React from "react";
import type { SVGProps } from "react";
const IconAenjMono = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <circle cx={16} cy={16} r={15} stroke="currentColor" strokeWidth={2} />
    <g clipPath="url(#aenj__circleClip)">
      <g
        style={{
          transform: "scale(.8125)",
          transformOrigin: "50% 50%",
        }}
      >
        <g clipPath="url(#aenj__enjincoin__clip0_294_3412)">
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0m9.82 23.09c-.11.47-.41.88-.83 1.15-.11.07-.25.14-.38.18-.83.27-1.69.32-2.41.34-1.6 0-3.23.02-4.85.02s-3.23-.02-4.83-.05a15.3 15.3 0 0 1-3.02-.36c-2.46-.52-3.72-1.83-4.13-4.27-.07-.38-.11-.77-.14-1.13-.02-.16-.05-.32-.07-.5v-4.29l.05-.41c.02-.29.07-.56.09-.83.32-2.78 1.62-4.2 4.36-4.81.72-.16 1.42-.23 2.12-.29.23-.02.45-.05.68-.07h10.11c.16.02.34.05.5.05.38.05.77.07 1.17.16 1.29.25 1.78.97 1.56 2.28-.07.56-.52 1.04-1.13 1.13-.27.05-.54.07-.84.07-3.5.02-7.02.05-10.52.05-.5 0-1.02.05-1.51.14-1.56.25-2.08.81-2.21 2.39 0 .14-.02.27-.02.38h14.78c.29 0 .59.09.84.23.77.5.7 1.24.65 1.78 0 .07-.02.16-.02.23-.05.63-.43 1.06-1.13 1.2-.25.05-.47.05-.7.05H9.57V18c.02.47.07.93.18 1.38.18.7.61 1.13 1.33 1.33.97.27 1.96.32 2.82.32 2.66.02 5.37.02 8.01.02h2.26c.34 0 1.04 0 1.44.65.27.43.34.93.23 1.4z"
            clipRule="evenodd"
          />
        </g>
        <defs>
          <clipPath id="aenj__enjincoin__clip0_294_3412">
            <path fill="#fff" d="M0 0h32v32H0z" />
          </clipPath>
        </defs>
      </g>
    </g>
    <defs>
      <clipPath id="aenj__circleClip">
        <circle cx={16} cy={16} r={13} />
      </clipPath>
    </defs>
  </svg>
);
export default IconAenjMono;
