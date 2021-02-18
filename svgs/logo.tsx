import * as React from "react"
import Svg, { SvgProps, Defs, Path, G, Use } from "react-native-svg"

function LogoSvg(props: SvgProps) {
  return (
    <Svg
      preserveAspectRatio="none"
      width={100}
      height={100}
      viewBox="0 0 100 100"
      {...props}
    >
      <Defs>
        <Path
          id="prefix__b"
          stroke="#FFF"
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          d="M24.848 62.98v-8.131m25.455 7.727V40.354m25.505 22.222V19.747"
        />
        <Path
          id="prefix__c"
          stroke="#FFF"
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          d="M0 0h100v100H0V0z"
        />
        <G id="prefix__a">
          <Path d="M99 0H0v99h99V0M24.65 72.3q2.4.05 3.95 1.6 1.55 1.6 1.6 3.95-.05 2.4-1.6 4-1.55 1.55-3.95 1.6-2.4-.05-3.95-1.6-1.55-1.6-1.6-4 .05-2.35 1.6-3.95 1.55-1.55 3.95-1.6m-.05-9.95V54.3v8.05M71.45 73.9q1.55-1.55 3.95-1.6 2.4.05 3.95 1.6 1.55 1.6 1.6 3.95-.05 2.4-1.6 4-1.55 1.55-3.95 1.6-2.4-.05-3.95-1.6-1.55-1.6-1.6-4 .05-2.35 1.6-3.95M50 72.3q2.4.05 3.95 1.6 1.55 1.6 1.6 3.95-.05 2.4-1.6 4-1.55 1.55-3.95 1.6-2.4-.05-3.95-1.6-1.55-1.6-1.6-4 .05-2.35 1.6-3.95 1.55-1.55 3.95-1.6m-.2-10.35v-22 22m25.25 0v-42.4 42.4z" />
          <Path
            fill="#FFF"
            d="M53.95 73.9Q52.4 72.35 50 72.3q-2.4.05-3.95 1.6-1.55 1.6-1.6 3.95.05 2.4 1.6 4 1.55 1.55 3.95 1.6 2.4-.05 3.95-1.6 1.55-1.6 1.6-4-.05-2.35-1.6-3.95m21.45-1.6q-2.4.05-3.95 1.6-1.55 1.6-1.6 3.95.05 2.4 1.6 4 1.55 1.55 3.95 1.6 2.4-.05 3.95-1.6 1.55-1.6 1.6-4-.05-2.35-1.6-3.95-1.55-1.55-3.95-1.6m-46.8 1.6q-1.55-1.55-3.95-1.6-2.4.05-3.95 1.6-1.55 1.6-1.6 3.95.05 2.4 1.6 4 1.55 1.55 3.95 1.6 2.4-.05 3.95-1.6 1.55-1.6 1.6-4-.05-2.35-1.6-3.95z"
          />
        </G>
      </Defs>
      <G transform="scale(1.0101)">
        <Use xlinkHref="#prefix__a" />
        <Use xlinkHref="#prefix__b" transform="scale(.98999)" />
        <Use xlinkHref="#prefix__c" transform="scale(.98999)" />
      </G>
    </Svg>
  )
}

export default LogoSvg