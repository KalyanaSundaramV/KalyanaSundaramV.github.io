declare module "liquid-gl" {
  export type LiquidLens = { destroy(): void; setTint(tint: string): void };
  type Options = {
    target: string;
    content: string | false;
    snapshot: string;
    engine: string;
    resolution: number;
    refraction: number;
    frost: number;
    bevelDepth: number;
    bevelWidth: number;
    specular: boolean;
    aberration: number;
    tilt: boolean;
    draggable: boolean;
    interaction: string;
    magnify: number;
    helper: boolean;
    shadow: boolean;
    tint: string;
    reveal: string;
  };
  export default function liquidGL(
    options: Options,
  ): LiquidLens | LiquidLens[] | undefined;
}
