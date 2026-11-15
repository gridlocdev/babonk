// The registry: every feature, in build and update order. Foes, stars and the chain add their parts to every run
// before the run feature starts one, in this order, which is the order they act in.
import foes from './foes/index.js';
import stars from './stars/index.js';
import chain from './chain/index.js';
import run from './run/index.js';

export const features = [foes, stars, chain, run];
