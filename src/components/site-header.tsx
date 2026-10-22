import { SiteHeaderNav, type SiteHeaderProps } from "@/components/site-header-nav";
import { features, siteConfig } from "@/lib/config";

// Server wrapper: feature flags are resolved on the server (env overrides are
// not visible in the browser), then handed to the interactive nav.
export function SiteHeader(props: SiteHeaderProps) {
  return (
    <SiteHeaderNav
      {...props}
      name={siteConfig.person.name}
      initials={siteConfig.person.initials}
      showCv={features.cv}
    />
  );
}
