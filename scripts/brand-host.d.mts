export declare const PORTAL_ORIGIN: string;
export declare function normalizeHost(hostHeader: string | null | undefined): string;
export declare function siteForHost(hostHeader: string | null | undefined): "founders" | "bidception" | null;
export declare function isPassthroughPath(pathname: string | null | undefined): boolean;
export declare function redirectForBrandHost(opts: {
  host: string | null | undefined;
  path: string | null | undefined;
  search?: string | null;
}): { location: string; status: number } | null;
export declare function brandHostVitePlugin(): {
  name: string;
  apply: "serve";
  configureServer(server: { middlewares: { use: (fn: unknown) => void } }): void;
};
