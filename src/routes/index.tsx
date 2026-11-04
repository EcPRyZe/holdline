import { createFileRoute } from "@tanstack/react-router";
import { Holdline } from "@/components/app/holdline";

export const Route = createFileRoute("/")({ component: Holdline });
