import BaseLayout from "@renderer/layouts/BaseLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const RootRoute = createRootRoute({
    component: Root,
});

function Root() {
    return (
        <BaseLayout>
            <Outlet />
        </BaseLayout>
    );
}