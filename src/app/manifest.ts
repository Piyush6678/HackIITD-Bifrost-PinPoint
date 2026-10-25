import type { MetadataRoute } from "next";

// Lets residents add PinPoint to their home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PinPoint · Report, track and resolve civic issues",
    short_name: "PinPoint",
    description: "One public map for every civic problem in the city. Report once, and watch it get fixed.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fbfa",
    theme_color: "#0b4f4a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
