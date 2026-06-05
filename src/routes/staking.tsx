import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/staking")({
  component: StakingLayout,
});

function StakingLayout() {
  return <Outlet />;
}
