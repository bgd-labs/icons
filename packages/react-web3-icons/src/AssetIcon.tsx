"use client";

import { AssetIconProps, TokenVariant } from "./types";
import { formatSymbolForIcon } from "./utils/formatSymbolForIcon";

const capitalize = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Renders a tokenIcon specified by symbol.
 */
export const AssetIcon = ({
  symbol,
  variant = TokenVariant.Full,
  tokenTag,
  formatSymbol,
}: AssetIconProps) => {
  const formattedSymbol = formatSymbol
    ? formatSymbol(symbol)
    : formatSymbolForIcon({ symbol });

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Icon = require(
      `./components/Icon${tokenTag ? tokenTag : ""}${tokenTag ? formattedSymbol : capitalize(formattedSymbol)}${capitalize(variant)}`,
    )?.default;
    return <Icon />;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const UnknownIcon = require(
      `./components/IconUnknown${capitalize(variant)}`,
    ).default;
    return <UnknownIcon />;
  }
};
