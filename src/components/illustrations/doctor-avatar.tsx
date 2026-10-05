import { cn } from "@/lib/cn";

/**
 * Locally drawn, faceless doctor portrait set inside an arch. Original artwork: no photos, no
 * remote images, nothing that could be mistaken for a real person. The palette comes from the
 * doctor's `avatar_theme`; hair style follows the theme so each doctor looks distinct.
 */

type Theme = "teal" | "green" | "sand" | "clay";

interface Palette {
  bg: string;
  bgDeep: string;
  tunic: string;
  skin: string;
  skinShade: string;
  hair: string;
  style: "bun" | "short" | "long" | "bob";
}

const PALETTES: Record<Theme, Palette> = {
  teal: {
    bg: "#d3e8e4",
    bgDeep: "#a9d0c9",
    tunic: "#0f6b66",
    skin: "#b9794f",
    skinShade: "#a56a44",
    hair: "#2b1d17",
    style: "bun",
  },
  green: {
    bg: "#dcebd7",
    bgDeep: "#a6cda0",
    tunic: "#2f6b3f",
    skin: "#c98f64",
    skinShade: "#b67f57",
    hair: "#1e1a17",
    style: "short",
  },
  sand: {
    bg: "#f0e6d4",
    bgDeep: "#e1d3b7",
    tunic: "#c8743a",
    skin: "#d49a6e",
    skinShade: "#c08961",
    hair: "#3a2418",
    style: "long",
  },
  clay: {
    bg: "#f6ddca",
    bgDeep: "#e9b995",
    tunic: "#0b5753",
    skin: "#a66a44",
    skinShade: "#935c3a",
    hair: "#1b1512",
    style: "bob",
  },
};

function isTheme(value: string): value is Theme {
  return value in PALETTES;
}

export function resolvePalette(theme: string): Palette {
  return PALETTES[isTheme(theme) ? theme : "teal"];
}

/** The portrait without any frame; drawn in a 200 x 240 coordinate space. */
export function DoctorFigure({ theme }: { theme: string }) {
  const { tunic, skin, skinShade, hair, style } = resolvePalette(theme);

  return (
    <g>
      {/* long hair sits behind the shoulders */}
      {style === "long" ? (
        <path
          d="M58 98c0-30 18-44 42-44s42 14 42 44v70c0 8-8 12-14 8l-8-6H80l-8 6c-6 4-14 0-14-8Z"
          fill={hair}
        />
      ) : null}
      {style === "bob" ? (
        <path
          d="M60 96c0-28 17-42 40-42s40 14 40 42v38c0 6-6 9-11 6l-6-4H77l-6 4c-5 3-11 0-11-6Z"
          fill={hair}
        />
      ) : null}

      {/* coat + tunic */}
      <path d="M18 240c0-50 34-70 82-70s82 20 82 70Z" fill="#ffffff" />
      <path
        d="M18 240c0-50 34-70 82-70s82 20 82 70Z"
        fill="none"
        stroke="#10302e"
        strokeOpacity="0.08"
      />
      <path d="M72 176c6 14 16 22 28 22s22-8 28-22c-8-3-17-5-28-5s-20 2-28 5Z" fill={tunic} />
      <path d="M100 171v69" stroke="#10302e" strokeOpacity="0.1" strokeWidth="1.5" />
      {/* coat lapels */}
      <path d="M72 176 56 240h20l16-44Z" fill="#f3efe7" />
      <path d="M128 176l16 64h-20l-16-44Z" fill="#f3efe7" />

      {/* stethoscope */}
      <path
        d="M78 178c-6 20-4 40 8 46 10 5 22 0 22-12v-10"
        fill="none"
        stroke="#10302e"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M122 178c6 20 4 40-8 46"
        fill="none"
        stroke="#10302e"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="108" cy="204" r="7.5" fill="#cfc5b3" stroke="#10302e" strokeWidth="3" />

      {/* neck and head */}
      <path d="M86 150h28v28c-4 6-10 9-14 9s-10-3-14-9Z" fill={skinShade} />
      <ellipse cx="100" cy="112" rx="29" ry="35" fill={skin} />

      {/* hair front */}
      {style === "bun" ? (
        <>
          <circle cx="100" cy="62" r="17" fill={hair} />
          <path
            d="M70 108c-2-30 12-48 30-48s32 18 30 48c-6-16-16-26-30-26s-24 10-30 26Z"
            fill={hair}
          />
        </>
      ) : null}
      {style === "short" ? (
        <>
          <path
            d="M70 104c-3-30 11-46 30-46s33 16 30 46c-4-12-8-20-14-24-10 4-26 4-32 0-6 4-10 12-14 24Z"
            fill={hair}
          />
          <g fill="none" stroke="#10302e" strokeWidth="3">
            <circle cx="88" cy="112" r="9" />
            <circle cx="112" cy="112" r="9" />
            <path d="M97 112h6" />
          </g>
        </>
      ) : null}
      {style === "long" ? (
        <path
          d="M71 110c-4-32 10-54 29-54s33 22 29 54c-3-18-12-30-29-30s-26 12-29 30Z"
          fill={hair}
        />
      ) : null}
      {style === "bob" ? (
        <path
          d="M70 112c-5-34 9-56 30-56s35 22 30 56c-2-20-12-32-30-32s-28 12-30 32Z"
          fill={hair}
        />
      ) : null}
    </g>
  );
}

export function DoctorAvatar({ theme, className }: { theme: string; className?: string }) {
  const { bg, bgDeep } = resolvePalette(theme);

  return (
    <svg
      viewBox="0 0 200 240"
      className={cn("block h-auto w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* arch frame */}
      <path d="M0 240V100a100 100 0 0 1 200 0v140Z" fill={bg} />
      <path d="M14 240V104a86 86 0 0 1 172 0v136Z" fill={bgDeep} opacity="0.45" />
      <DoctorFigure theme={theme} />
    </svg>
  );
}
