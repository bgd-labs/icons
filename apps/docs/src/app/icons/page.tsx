import { AssetTag } from "@bgd-labs/react-web3-icons/dist/utils/index";
import Fuse from "fuse.js";
import React, { useMemo } from "react";

import { AssetIconCard } from "@/components/AssetIconCard";
import { Branding } from "@/components/Branding";
import { ChainIconCard } from "@/components/ChainIconCard";
import InstalledWalletIcon from "@/components/InstalledWalletIcon";
import { Search } from "@/components/Search";
import { WalletIconCard } from "@/components/WalletIconCard";

import icons from "../../../../../icons/icons.json";
import { IconInfo, IconType } from "../../../../../src/scripts/types";

async function IconsPage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
  };
}) {
  const searchString = searchParams?.search ?? "";

  const filteredIcons = useMemo(
    () =>
      new Fuse(icons as IconInfo[], {
        keys: ["chainId", "symbol", "identityFlag"],
        threshold: 0.3,
        distance: 1000,
      })
        .search(searchString)
        .map((item) => item.item),
    [searchString],
  );

  return (
    <main className="p-4 md:p-8 xl:p-16">
      <InstalledWalletIcon />

      <Search placeholder="Enter asset symbol or chain id" />

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {(!filteredIcons.length && searchString === "" ? icons : filteredIcons)
          .filter((item) => item.name !== "Unknown")
          .map((item) => {
            const asset = item;
            if (asset.type.includes(IconType.asset)) {
              if (asset.icons.aToken && !asset.icons.stataToken) {
                return (
                  <React.Fragment key={asset?.symbol ?? asset?.chainId}>
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                    />
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                      assetTag={AssetTag.AToken}
                    />
                  </React.Fragment>
                );
              } else if (!asset.icons.aToken && asset.icons.stataToken) {
                return (
                  <React.Fragment key={asset?.symbol ?? asset?.chainId}>
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                    />
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                      assetTag={AssetTag.StataToken}
                    />
                  </React.Fragment>
                );
              } else if (asset.icons.aToken && asset.icons.stataToken) {
                return (
                  <React.Fragment key={asset?.symbol ?? asset?.chainId}>
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                    />
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                      assetTag={AssetTag.AToken}
                    />
                    <AssetIconCard
                      name={asset.name ?? ""}
                      symbol={asset?.symbol ?? ""}
                      chainId={asset.chainId}
                      chainName={asset.chainName}
                      icons={asset.icons}
                      assetTag={AssetTag.StataToken}
                    />
                  </React.Fragment>
                );
              } else {
                return (
                  <AssetIconCard
                    key={asset?.symbol ?? asset?.chainId}
                    name={asset.name ?? ""}
                    symbol={asset?.symbol ?? ""}
                    chainId={asset.chainId}
                    chainName={asset.chainName}
                    icons={asset.icons}
                  />
                );
              }
            } else if (asset.type.includes(IconType.chain)) {
              return (
                <ChainIconCard
                  key={asset.chainId}
                  chainId={asset.chainId ?? 1}
                  name={asset.chainName ?? asset.name ?? "Unknown"}
                  icons={asset.icons}
                />
              );
            } else if (asset.type.includes(IconType.wallet)) {
              return (
                <WalletIconCard
                  icons={asset.icons}
                  name={asset?.name ?? "Unknown"}
                />
              );
            }
          })}
        {!filteredIcons.length && searchString !== "" && (
          // TODO: need add image
          <div>No icons with the specified search parameters were found</div>
        )}
      </div>

      <Branding />
    </main>
  );
}

export default IconsPage;
