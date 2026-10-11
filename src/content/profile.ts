import type { Profile } from "@/lib/types";

export const profile: Profile = {
  name: "Kalyana Sundaram V",
  role: "Game & Tools Engineer",
  location: "Bengaluru, Karnataka, India",
  email: "kalyan.wired@gmail.com",
  resumePdfHref: "/resume/Kalyana_Sundaram_V_Resume_Public.pdf",
  extendedResumePdfHref: null,
  summary:
    "I build gameplay systems, rapid prototypes, Unity production pipelines, and practical Windows and Android tools across Unity, C#, Cocos Creator, TypeScript, and .NET.",
  about:
    "I'm a Bengaluru-based game and tools engineer with experience in mobile gameplay, technical leadership, rapid prototyping, native desktop products, and automation. I move from product question to working implementation, then make the result easier to test, inspect, and extend. I am available for full-time roles and focused consulting engagements.",
  currentStatus: [
    {
      label: "Building",
      value: "Ludo Demolition, ProjectPulse, and Unity asset pipelines",
    },
    {
      label: "Available for",
      value: "Full-time game or tools roles and focused consulting",
    },
  ],
  socialLinks: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/kalyana-sundaram-v-742ba731/",
      placeholder: "",
    },
    {
      label: "Email",
      href: "mailto:kalyan.wired@gmail.com",
      placeholder: "",
    },
  ],
  contactMethods: [
    {
      label: "Email",
      value: "kalyan.wired@gmail.com",
      href: "mailto:kalyan.wired@gmail.com",
    },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/kalyana-sundaram-v-742ba731",
      href: "https://www.linkedin.com/in/kalyana-sundaram-v-742ba731/",
    },
    { label: "Location", value: "Bengaluru, Karnataka, India", href: null },
  ],
  values: [
    {
      label: "01",
      title: "Readable systems",
      description:
        "Prefer clear gameplay and tooling architecture that can be debugged, tested, and extended without hiding important behavior.",
    },
    {
      label: "02",
      title: "Playable proof",
      description:
        "Turn ideas into working prototypes quickly, then improve the loop with concrete player and developer feedback.",
    },
    {
      label: "03",
      title: "Technical honesty",
      description:
        "Describe current evidence, constraints, and open work without overstating outcomes or exposing private implementation details.",
    },
    {
      label: "04",
      title: "Polished delivery",
      description:
        "Treat performance, accessibility, content editing, and responsive layout as part of the product experience.",
    },
  ],
};
