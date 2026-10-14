import { usePathname } from "expo-router";
// Use Router's own Helmet instance so static export writes one document title.
// Router's Head component is focus-gated and cannot be used in a root layout.
import { Helmet } from "expo-router/vendor/react-helmet-async/lib";
import { getWebMetadata } from "../lib/webMetadata";

export default function WebMetadata() {
  const pathname = usePathname();
  const meta = getWebMetadata(pathname, process.env.EXPO_PUBLIC_WEB_URL);
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="robots" content={meta.robots} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Bickers" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta name="twitter:card" content={meta.image ? "summary_large_image" : "summary"} />
      {meta.image && <meta property="og:image" content={meta.image} />}
      {meta.image && <meta property="og:image:alt" content="Bickers Action" />}
      {meta.image && <meta name="twitter:image" content={meta.image} />}
    </Helmet>
  );
}
