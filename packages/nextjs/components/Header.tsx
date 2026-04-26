"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RootstockLogo } from "./assets/RootstockLogo";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: HeaderMenuLink[];
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Debug Contracts",
    href: "/debug",
  },
  {
    label: "Examples",
    href: "/examples",
    children: [
      {
        label: "DAO Vote",
        href: "/examples/dao-vote",
      },
      {
        label: "NFT Mint",
        href: "/examples/nft-mint",
      },
      {
        label: "Token Transfer",
        href: "/examples/token-transfer",
      },
    ],
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, children }) => {
        const isActive = pathname === href;

        if (children) {
          return (
            <li key={href} className="relative group">
              <details className="dropdown dropdown-bottom">
                <summary
                  tabIndex={0}
                  className={`py-1.5 px-3 text-sm rounded-lg gap-2 grid grid-flow-col cursor-pointer ${
                    pathname.startsWith(href) ? "underline underline-offset-4" : ""
                  }`}
                >
                  {label}
                </summary>
                <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-[1]">
                  {children.map(child => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        passHref
                        className={`${pathname === child.href ? "bg-base-200" : ""} py-2 px-4 text-sm rounded-lg block`}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        }

        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${isActive ? "underline underline-offset-4" : ""} py-1.5 px-3 text-sm rounded-lg gap-2 grid grid-flow-col`}
            >
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  return (
    <div className="flex h-14 px-4 justify-between">
      <div className="flex items-center">
        <Link href="/" passHref className="items-center gap-2 ml-4 mr-6 shrink-0">
          <RootstockLogo className="cursor-pointer" />
        </Link>
        <ul className="flex px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="flex items-center gap-4">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};