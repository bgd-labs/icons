import { capitalize } from "./capitalize";
import { formatSymbolForIcon } from "./formatSymbolForIcon";
import { AssetIconProps, IconVariant } from "./types";

export const getAssetIconPath = ({
  formatSymbol,
  symbol,
  tokenTag,
  variant,
}: AssetIconProps) => {
  const formattedSymbol = formatSymbol
    ? formatSymbol(symbol)
    : formatSymbolForIcon({ symbol });
  return `${tokenTag ? tokenTag : ""}${tokenTag ? formattedSymbol : capitalize(formattedSymbol)}${capitalize(variant ?? IconVariant.Full)}`;
};
