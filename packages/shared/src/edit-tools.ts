export const AI_TOOL_PRESET_IDS = ['background', 'light', 'portrait', 'extend'] as const;

export type AiToolPreset = (typeof AI_TOOL_PRESET_IDS)[number];
