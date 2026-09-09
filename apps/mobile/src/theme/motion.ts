/** Shared BirKare AI motion language for the four-step practical onboarding. */
export const motion = {
  duration: {
    press: 120,
    fast: 180,
    selection: 240,
    imageChange: 340,
    cardEnter: 420,
    screen: 480,
    success: 650,
  },
  stagger: {
    short: 55,
    normal: 75,
  },
  scale: {
    pressed: 0.97,
    selected: 1.025,
    thumbnailSelected: 1.06,
  },
  translate: {
    cardY: 18,
    screenEnterX: 36,
    screenExitX: -28,
  },
  spring: {
    damping: 18,
    stiffness: 180,
    mass: 0.9,
  },
} as const;
