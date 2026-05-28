export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "servicios-verificables-mano-local-20260528",
} as const;

export const ARKIV_COMMON_ATTRIBUTES = [
  PROJECT_ATTRIBUTE,
  { key: "app", value: "servicios-verificables" },
  { key: "track", value: "arkiv" },
  { key: "network", value: "braga" },
] as const;

