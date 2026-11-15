// The chain: each kill you bounce off adds one, a hit ends it, and landing pays for it. Only a kill grows it, so
// bouncing on a bare floor can't farm it. The count is the run's w.chain, which the HUD shows and other parts read.
import { addRunPart, say } from '../../world/run.js';
import { BLOCK, fill } from '../../world/well.js';
import { COLS, TILE } from '../../world/wells-data.js';
import { lockTarget, placeHero } from '../../player/hero.js';
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

// the museum (?debug&room=museum): three floaters stacked below, bonked one after another, then a landing that pays
/** @returns {import('../../game/loop.js').Exhibit[]} */
function museum()
{
    return [{
        id: 'chain', title: 'The chain', file: 'src/features/chain/index.js',
        text: 'Each kill you bounce off adds one to the chain. Landing pays for a chain of 3 or more; a hit ends it.',
        start(w)
        {
            fill(w, 1, COLS - 2, 22, BLOCK);
            placeHero(w, 9 * TILE + 1, 2 * TILE);
            // the floaters come from the foes feature, through the run's own spawns
            return { peak: 0, score: w.score, landed: false };
        },
        spawns: [['floater', 9, 6], ['floater', 9, 11], ['floater', 9, 16]],
        ctrl(w)
        {
            const p = w.player, go = p.bonk && !p.dash && !!lockTarget(w);
            return { x: 0, y: 0, held: go, pressed: go };
        },
        done(w, s)
        {
            s.peak = Math.max(s.peak, w.chain);
            if (w.player.ground && s.peak) s.landed = true;
            return s.landed;
        },
        passed: (w, s)=> s.peak >= 3 && w.chain === 0 && w.score - s.score >= chainBonus(s.peak),
    }];
}

export default {
    id: 'chain',
    build() { addRunPart(part); },
    museum,
};
