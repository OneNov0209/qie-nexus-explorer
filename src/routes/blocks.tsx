import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/blocks")({
  component: BlocksLayout,
});

function BlocksLayout() {
  return <Outlet />;
}
