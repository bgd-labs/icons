import * as React from "react";
import type { SVGProps } from "react";
const IconAsnxMono = (props: SVGProps<SVGSVGElement>) => (
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
          d="M16.71.17c-8.84 0-16 7.16-16 16s7.16 16 16 16 16-7.16 16-16-7.16-16-16-16M6.51 8.95s.01-.06.04-.08c.02-.02.06-.04.09-.04h4.52c1.14 0 2.12.47 2.95 1.4l1.1 1.34-2.14 2.61-1.62-1.99a.64.64 0 0 0-.53-.24H6.65s-.07-.01-.09-.04c-.02-.02-.04-.05-.04-.08V8.95zm20.4 14.17s-.01.06-.03.08-.05.04-.09.04h-4.5c-1.15 0-2.13-.47-2.95-1.4l-2.62-3.2-2.62 3.2c-.83.93-1.81 1.4-2.96 1.4h-4.5s-.06-.01-.09-.04a.16.16 0 0 1-.03-.09v-2.88s0-.06.03-.08c.02-.03.05-.04.09-.04h4.27c.2 0 .4-.09.53-.24l3.09-3.77 4.8-5.87c.83-.92 1.81-1.38 2.96-1.38h4.5s.06 0 .09.03c.02.02.03.06.03.09v2.88s-.01.06-.03.08-.05.04-.09.04h-4.27c-.2 0-.4.09-.53.24l-3.15 3.83L22 19.9c.13.15.32.23.51.23h4.27s.06.01.09.04q.03.045.03.09v2.88z"
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
export default IconAsnxMono;
