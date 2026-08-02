import { createFileRoute, redirect } from "@tanstack/react-router";

// Home immediately redirects to the dashboard.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
