// The chain: bounces off foes and crates without touching the ground. Landing a chain of at least `min` pays `each`
// points a bounce; a hit breaks it.
export const CHAIN = { min: 3, each: 25 };

// points for landing a chain of n bounces
export const chainBonus = (n)=> n >= CHAIN.min ? n * CHAIN.each : 0;
