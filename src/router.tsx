import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFoundPage } from "@/components/not-found-page";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    // Branded, domain-appropriate 404 (Phase 00.5, AC-6.4). The HTTP status,
    // robots noindex, and per-domain head/theme come from the deployed
    // runtime's SEO middleware; the body is the shared network-branded page.
    defaultNotFoundComponent: NotFoundPage,
  });
}
