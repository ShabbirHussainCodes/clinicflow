import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Photos and logos are found by file name inside `public/`, so putting a clinic's own pictures on
 * the site never needs a code change: copy the file in, restart, done. Nothing is found means the
 * page uses its designed no-photo layout instead. See docs/CUSTOMIZE.md for the full list.
 *
 *   public/doctors/<doctor-slug>.jpg       portrait of that doctor (4:5 works best)
 *   public/clinic/hero.jpg                 wide photo for the top of the home page
 *   public/clinic/about.jpg                photo of the clinic for the About section
 *   public/clinic/map.jpg                  screenshot of the map for the Visit section
 *   public/brand/logo.svg                  full logo (replaces the written clinic name)
 *   public/brand/logo-light.svg            same logo for dark backgrounds (footer); optional
 */
const RASTER = ["webp", "jpg", "jpeg", "png", "avif"] as const;
const LOGO = ["svg", "png", "webp"] as const;

const SAFE_NAME = /^[a-z0-9][a-z0-9-]*$/i;
const cache = new Map<string, string | null>();

function find(folder: string, name: string, extensions: readonly string[]): string | null {
  if (!SAFE_NAME.test(name)) return null;
  // While developing, look every time so a newly added photo shows up on refresh.
  const remember = process.env.NODE_ENV === "production";
  const key = `${folder}/${name}`;
  if (remember && cache.has(key)) return cache.get(key) ?? null;

  const directory = path.join(process.cwd(), "public", folder);
  const extension = extensions.find((ext) => existsSync(path.join(directory, `${name}.${ext}`)));
  const result = extension ? `/${folder}/${name}.${extension}` : null;
  if (remember) cache.set(key, result);
  return result;
}

export function doctorPhoto(slug: string): string | null {
  return find("doctors", slug, RASTER);
}

export function clinicPhoto(name: "hero" | "about" | "map"): string | null {
  return find("clinic", name, RASTER);
}

export function clinicLogo(variant: "logo" | "logo-light" = "logo"): string | null {
  return find("brand", variant, LOGO);
}
