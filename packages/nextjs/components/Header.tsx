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
    label: "Gasless Demo",
    href: "/gasless",
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href }) => {
        const isActive = pathname === href;
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
