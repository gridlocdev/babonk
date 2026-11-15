// The chain: each kill you bounce off adds one, a hit ends it, and landing pays for it. Only a kill grows it, so
// bouncing on a bare floor can't farm it. The count is the run's w.chain, which the HUD shows and other parts read.
import { addRunPart, say } from '../../world/run.js';
import { chainBonus } from './chain-data.js';

const part = {
    enter(w) { w.bestChain = 0; },
    bounced(w, { kill }) { if (kill) { w.chain++; w.bestChain = Math.max(w.bestChain, w.chain); } },
    hurt(w) { w.chain = 0; },
    landed(w)
    {
        const bonus = chainBonus(w.chain);
        if (bonus) { w.score += bonus; w.fx.push({ kind: 'chain', n: w.chain, x: w.player.x, y: w.player.y }); say(w, 'chain'); }
        w.chain = 0;
    },
};

export default {
    id: 'chain',
    build() { addRunPart(part); },
};
