"use client";
import { usePathname } from "next/navigation";
import ContactMe from "@/components/ContactMe";

/**
 * Decides whether this page gets the floating contact badge. Deliberately its own component.
 *
 * Don't put this check inside ContactMe: its body calls useRef, useState and useEffect, and the
 * root layout stays mounted across client navigations, so it is one instance for the whole
 * visit. An early `return null` ahead of those hooks changes the hook count between renders of
 * that instance, React throws "Rendered fewer hooks than expected", and because the component
 * lives in the root layout the whole app goes blank, not just /world.
 *
 * This wrapper always calls exactly one hook. The condition decides whether the child renders,
 * so ContactMe mounts and unmounts cleanly. `key={pathname}` remounts it per route so its
 * over-the-footer colour check runs again on every page.
 */
export default function ContactMeMount() {
    const pathname = usePathname();
    // /world has its own HUD (d-pad, tour bar); a floating badge would fight it.
    if (pathname?.startsWith("/world")) return null;
    // The full ring only fits the homepage's wider gutter; elsewhere it covered content.
    return <ContactMe key={pathname} compact={pathname !== "/"} />;
}
