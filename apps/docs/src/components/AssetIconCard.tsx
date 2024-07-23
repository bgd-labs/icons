"use client";

import {
  AssetTag,
  IconVariant,
  Web3IconType,
} from "@bgd-labs/react-web3-icons/dist/utils";
import { useState } from "react";

import { IconCard } from "@/components/IconCard";
import { Web3Icon } from "@/components/Web3Icon";
import { githubIconsPath } from "@/utils/constants";

import { IconInfoIcons } from "../../../../src/scripts/types";

export const AssetIconCard = ({
  name,
  symbol,
  icons,
  chainId,
  chainName,
  assetTag,
}: {
  name: string;
  symbol: string;
  icons: IconInfoIcons;
  chainId?: number;
  chainName?: string;
  assetTag?: AssetTag;
}) => {
  const [variant, setVariant] = useState(IconVariant.Full);
  const iconPath = assetTag
    ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      icons[
        assetTag === AssetTag.AToken
          ? "aToken"
          : assetTag === AssetTag.StataToken
            ? "stataToken"
            : "aToken"
      ][variant]
    : icons[variant];

  const Icon = () => (
    <Web3Icon
      iconInfo={{
        type: Web3IconType.asset,
        info: { symbol, variant, tokenTag: assetTag },
      }}
    />
  );

  return (
    <IconCard
      svgPath={`${githubIconsPath}${iconPath}`}
      name={`${name}${chainName ? `(${chainName})` : ""}`}
      subComponent={
        <div className="font-mono text-xs text-gray-400">
          <span className="lowercase">{assetTag ? assetTag : ""}</span>
          <span className="uppercase">{symbol}</span>
          <span>{chainId && !assetTag ? `(${chainId})` : ""}</span>
        </div>
      }
      fileName={`${(assetTag ? assetTag : "").toLowerCase()}${symbol.toUpperCase()}${variant === IconVariant.Full ? "" : variant}`}
      setActiveType={setVariant}
      activeType={variant}
    >
      <Icon />
    </IconCard>
  );
};
