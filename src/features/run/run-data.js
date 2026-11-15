// A run's numbers: the seed a ?debug run uses, so it replays, and what clearing a well pays.
export const RUN = { seed: 7041, clear: 200, hpLeft: 100 };

// points for reaching the bottom of a well with hp left
export const clearBonus = (hp)=> RUN.clear + hp * RUN.hpLeft;
