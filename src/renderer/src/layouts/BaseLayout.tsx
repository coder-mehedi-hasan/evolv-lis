import DragWindowRegion from "@renderer/components/DragWindowRegion";
import NavigationMenu from "@renderer/components/NavigationMenu";
import React from "react";

export default function BaseLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <DragWindowRegion title="Evolve connect" />
            <NavigationMenu />
            <hr />
            <main>{children}</main>
        </>
    );
}
