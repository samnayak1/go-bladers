export const HLS_VARIANTS = [
  {
    suffix: "480p1128kbs",
    resolution: "854x480",
    bitrate: 1128000,
  },
  {
    suffix: "240p528kbs",
    resolution: "426x240",
    bitrate: 528000,
  },
] as const;


export const getVariantNames = (streamKey: string) =>
  HLS_VARIANTS.map(v => `${streamKey}_${v.suffix}`);