import type { Metadata } from "next";
import { AuthLayoutClient } from "./layout-client";

export const metadata: Metadata = {
  title: {
    template: "%s | Onelinker",
    default: "Onelinker",
  },
  description: "Schedule smarter. Grow faster.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
