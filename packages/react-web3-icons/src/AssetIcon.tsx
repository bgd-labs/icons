"use client";

import { formatSymbolForIcon } from "../../../src/utils/formatSymbolForIcon";
import { AssetIconProps, TokenTag, TokenVariant } from "./types";

const capitalize = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

const SingleAssetIcon = ({
  symbol,
  variant = TokenVariant.Full,
  tokenTag,
}: AssetIconProps) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const UnknownIcon = require(
    `./components/IconUnknown${capitalize(variant)}`,
  ).default;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Icon = require(
      `./components/Icon${tokenTag ? tokenTag : ""}${tokenTag ? symbol : capitalize(symbol)}${capitalize(variant)}`,
    )?.default;
    return <Icon />;
  } catch (e) {
    return <UnknownIcon />;
  }
};

interface MultiAssetsIconProps {
  symbols: string[];
  badgeSymbol?: string;
  variant?: TokenVariant,
  tokenTag?: TokenTag;
}

const MultiAssetsIcon = ({
  symbols,
  badgeSymbol,
  variant,
  tokenTag,
}: MultiAssetsIconProps) => {
  if (!badgeSymbol)
    return (
      <div style={{ display: "inline-flex", position: "relative" }}>
        {symbols.map((symbol, ix) => (
          <div style={{ marginLeft: ix === 0 ? 0 : `calc(-1 * 0.5em)` }}>
            <SingleAssetIcon
              key={symbol}
              symbol={symbol}
              variant={variant}
              tokenTag={tokenTag}
            />
          </div>
        ))}
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          width: "1.5em",
          height: "1.5em",
          marginLeft: "-0.5em",
          marginBottom: "-1em",
          position: "relative",
          zIndex: 2,
          borderRadius: "50%",
          border: "1px solid black",
        }}
      >
        <SingleAssetIcon
          symbol={badgeSymbol}
          variant={variant}
          tokenTag={tokenTag}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {symbols.map((symbol, ix) => (
          <div
            key={symbol}
            style={{
              borderRadius: "50%",
              border: "1px solid black",
              marginLeft: ix === 0 ? 0 : "calc(-1 * 0.5em)",
            }}
          >
            <SingleAssetIcon
              symbol={symbol}
              variant={variant}
              tokenTag={tokenTag}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Renders a tokenIcon specified by symbol.
 */
export function AssetIcon({ symbol, marketPrefix, ...rest }: AssetIconProps) {
  const symbolChunks = formatSymbolForIcon(symbol, marketPrefix).split("_");

  if (symbolChunks.length > 1) {
    const [badge, ...symbols] = symbolChunks;
    return <MultiAssetsIcon {...rest} symbols={symbols} badgeSymbol={badge} />;
  }

  return <SingleAssetIcon symbol={symbolChunks[0] || 'unknown'} {...rest} />;
}
