// The soundtrack as song specs for music-generator's composer (its docs/COMPOSING.md, "The song spec").
// tools/music/render.mjs composes and renders each one to music/<id>.mp3; `just music` runs it. docs/audio.md has the
// direction: arcade plunge, D dorian on the bare chip voices, one bouncing-then-falling hook in every track.
//
// id: the track's name; the area's track or a cue's name.
// loop: the sections a looping track repeats, as [first, end) indexes into its form; null plays once. The section at
// `end` must be the same type as the one at `first`, so what comes after the loop's end is what the loop jumps back to.
// band: chip programs per role (music-generator's audio/chip-instruments-data.js), null for silent:
//   leads 80 pulse 25%, 82 thin pulse 12.5%, 83 hollow square, 84 PWM, 85 soft triangle, 86/87 NES pulse 25%/50%;
//   46 pluck; 90 PWM pad; bass 38 NES triangle, 39 pulse, 33 DPCM; kits 0 chip, 1 NES, 2 DPCM.

// The hook: a bounce up off the tonic, then a fall back down the well. Its first bar is the motif every track varies.
const BOUNCE = '1:0.5 5:0.5 8 7:0.5 5:0.5 3';
const HOOK = [
    BOUNCE, '4:0.5 6:0.5 8 6:0.5 4:0.5 1', '5:0.5 3:0.5 5 8:0.5 7:0.5 5', '4:1.5 2:0.5 7,:2',
    BOUNCE, '4:0.5 6:0.5 8 9:0.5 8:0.5 6', '5:0.5 7:0.5 9 7:0.5 5:0.5 2', '1:2 r:2',
].join(' | ');
const HOOK_CHORDS = 'i IV i VII i IV v i';

// D dorian (minor, with the bright raised 6th in IV), one tempo through the loop: push 0, as the game's bar grid needs
const HOME = { sound: 'chip', key: 'D', mode: 'dorian', motif: BOUNCE, push: 0 };
const NES = { lead: 86, counter: 87, arp: 87, chords: null, pad: null, bass: 38, drums: 1 };

// ---------------------------------------------------------------- the wells: 5/4 and 3/4
// The wells limp on purpose: verses and the hook in 5/4 (3 + 2, a bounce that comes down a beat early), the build and
// the bridge in 3/4. Same tempo all through; the meter changes only at a section, and the game finds the bar lines
// from the rendered track's `bars`.
//
// a well: an intro rings into the loop of verse, build, hook, bridge, hook; the last verse is only there to loop into
const WELL_FORM = ['intro', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'verse'];
const WELL_LOOP = [1, 6];
const WELL_METERS = { pre: { meter: '3/4' }, bridge: { meter: '3/4' } };

// The hook in 5/4: the bounce up off the tonic on the 3, the fall on the 2. Chord tones on both group starts.
const BOUNCE5 = '1:0.5 5:0.5 8:1.5 7:0.5 5 3';
const hook5 = (b4, b7)=> [
    BOUNCE5, '4:0.5 6:0.5 8:1.5 6:0.5 4 1', '3:0.5 6:0.5 8:1.5 6:0.5 8 10', b4,
    BOUNCE5, '4:0.5 6:0.5 8:1.5 9:0.5 8 6', b7, '5:1 3:1 1:3',
].join(' | ');

// Drums written by hand, in place of the composer's plain odd-meter beat. One row per voice, a character per
// sixteenth (spaces are only for reading): X accent, x hit, o ghost. Each section cycles its bars and ends on its
// fill; a section with `crash` opens on a cymbal.
const KIT = { kick: 36, stick: 37, snare: 38, clap: 39, hat: 42, pedal: 44, open: 46, crash: 49, ride: 51, tomLow: 45, tomMid: 47, tomHi: 50 };
const VEL = { X: 112, x: 86, o: 44 };
function drumsBy(book)
{
    return (score)=>
    {
        const drums = score.tracks.find((t)=> t.role === 'drums');
        if (!drums) return;
        const notes = [];
        for (const s of score.sections)
        {
            const inSection = (n)=> n.beat >= s.beat - 1e-9 && n.beat < s.beat + s.beats - 1e-9;
            const part = book[s.type];
            if (!part) { notes.push(...drums.notes.filter(inSection)); continue; }
            const bars = Math.round(s.beats / s.beatsPerBar), loud = 0.8 + 0.25 * s.energy;
            for (let i = 0; i < bars; i++)
            {
                const bar = i === bars - 1 && part.fill ? part.fill : part.bars[i % part.bars.length];
                const at = s.beat + i * s.beatsPerBar;
                if (i === 0 && part.crash) notes.push({ key: KIT.crash, beat: at, beats: 2, vel: 100 });
                for (const [voice, text] of Object.entries(bar))
                {
                    const row = text.replace(/ /g, '');
                    if (row.length !== s.beatsPerBar * 4) throw new Error(`${score.title} ${s.type}: ${voice} has ${row.length} steps, not ${s.beatsPerBar * 4}`);
                    for (let k = 0; k < row.length; k++)
                        if (VEL[row[k]]) notes.push({ key: KIT[voice], beat: at + k / 4, beats: 0.25, vel: Math.min(127, Math.round(VEL[row[k]] * loud)) });
                }
            }
        }
        drums.notes = notes.sort((a, b)=> a.beat - b.beat);
    };
}

// 5/4 grooves (20 steps: 3 beats, then 2) and 3/4 ones (12 steps) shared by the wells
const HATS5 = 'x.x. x.x. x.x. x.x. x.x.', HATS5_16 = 'xoxo xoxo xoxo xoxo xoxo';
const FILL5 = { kick: 'X... ..x. x... .... ....', snare: '.... X... ..o. .... ...X', hat: 'x.x. x.x. x.x. .... ....',
    tomHi: '.... .... .... xx.. ....', tomMid: '.... .... .... ..xx ....', tomLow: '.... .... .... .... xxx.' };
const ROLL5 = { kick: 'X... ..x. x... X... X...', snare: '.... X... .... xoxo xxXX', hat: 'x.x. x.x. x.x. .... ....' };
const BUILD3 = [
    { kick: 'X... .... x...', snare: '.... x... x...', hat: 'x.x. x.x. x.x.' },
    { kick: 'X... ..x. x...', snare: '..o. x.o. x.x.', hat: 'xoxo xoxo xoxo' },
];
const BUILD3_FILL = { kick: 'X... X... X...', snare: 'xoxo xxxx XXXX' };
const STOMP3 = [
    { kick: 'X... ...x ..x.', snare: '.... .... X...', ride: 'x... x... x...', tomLow: '.... x... ....' },
    { kick: 'X..x .... x...', snare: '.... .... X..o', ride: 'x... x... x.x.' },
];
const STOMP3_FILL = { kick: 'X... .... ....', tomHi: '..xx .... ....', tomMid: '.... xx.x ....', tomLow: '.... .... xxX.', snare: '.... .... ...X' };

// Well 1: a straight, heavy 5/4 rock beat; the hook doubles the hats
const WELL1_DRUMS = {
    intro: { bars: [{ kick: 'X... .... x... X... ....', hat: HATS5 }], fill: { kick: 'X... .... x... X... ....', snare: '.... .... .... xoxo XxXx' } },
    verse: { bars: [
        { kick: 'X... ..x. x... X..x ..x.', snare: '.... X... ..o. .... X..o', hat: HATS5 },
        { kick: 'X..x ..x. x... X... x.x.', snare: '.... X..o .... .o.. X...', hat: 'x.x. x.x. x.x. x.x. x...', open: '.... .... .... .... ..x.' },
    ], fill: FILL5 },
    pre: { bars: BUILD3, fill: BUILD3_FILL },
    chorus: { crash: true, bars: [
        { kick: 'X..x ..x. x..x X... x.x.', snare: '.... X... ..o. ..o. X..x', hat: HATS5_16 },
        { kick: 'X... x.x. x..x X..x ..x.', snare: '.... X..o .... .o.. X.x.', hat: 'xoxo xoxo xoxo xoxo xo..', open: '.... .... .... .... ..x.' },
    ], fill: ROLL5 },
    bridge: { bars: STOMP3, fill: STOMP3_FILL },
};

// Well 2: phrygian and tribal: rimclicks and low toms in the verse, the snare saved for the hook
const WELL2_DRUMS = {
    intro: { bars: [{ kick: 'X... .... .... X... ....', tomLow: '.... .... x... .... x...', stick: '..x. ..x. ..x. ..x. ..x.' }],
        fill: { kick: 'X... .... .... X... ....', tomMid: '.... .... .... xx.x ....', tomLow: '.... .... .... .... xxX.' } },
    verse: { bars: [
        { kick: 'X... ..x. .... X... ..x.', stick: '.... x... x.x. .... x..x', tomLow: '.... .... ..x. ..x. ....', hat: HATS5 },
        { kick: 'X..x .... x... X... x...', stick: '..x. x... ..x. .x.. x...', tomMid: '.... .... .... .... ..x.', hat: HATS5 },
    ], fill: FILL5 },
    pre: { bars: [{ kick: 'X... X... X...', tomLow: '..x. ..x. ..x.', hat: 'x.x. x.x. x.x.' }, BUILD3[1]], fill: BUILD3_FILL },
    chorus: { crash: true, bars: [
        { kick: 'X... ..x. x... X..x ..x.', snare: '.... X... ...o .... X...', tomLow: '.... .... .... ..x. ....', hat: HATS5_16 },
        { kick: 'X..x ..x. x... X... x..x', snare: '.... X... ..o. .... X.o.', hat: HATS5_16 },
    ], fill: ROLL5 },
    bridge: { bars: [
        { kick: 'X... .... ....', tomLow: '.... x... x...', tomMid: '.... ...x ....', ride: 'x... x... x...' },
        { kick: 'X..x .... ....', tomLow: '.... x..x x...', snare: '.... .... ...o', ride: 'x... x... x.x.' },
    ], fill: STOMP3_FILL },
};

// Well 3: double time: sixteenth kicks under the hook, a clap on every backbeat, no room to breathe
const WELL3_DRUMS = {
    intro: { bars: [{ kick: 'X.x. X.x. X.x. X.x. X.x.', hat: HATS5_16 }], fill: ROLL5 },
    verse: { bars: [
        { kick: 'X.xx ..x. x.x. X.xx ..x.', snare: '.... X... .... .... X...', clap: '.... X... .... .... X...', hat: HATS5_16 },
        { kick: 'X.x. x.xx ..x. X.x. x.x.', snare: '.... X... ..o. .... X..o', hat: HATS5_16, open: '.... .... ..x. .... ....' },
    ], fill: FILL5 },
    pre: { bars: [BUILD3[1]], fill: BUILD3_FILL },
    chorus: { crash: true, bars: [
        { kick: 'XxXx ..x. XxXx X.x. x.x.', snare: '.... X... .... ..o. X..x', clap: '.... X... .... .... X...', hat: HATS5_16 },
        { kick: 'X.xx ..xx X.x. XxXx ..x.', snare: '.... X..o ..o. .... X.xx', hat: HATS5_16, open: '.... .... .... .... x...' },
    ], fill: ROLL5 },
    bridge: { bars: [
        { kick: 'XxXx .... ..x.', snare: '.... .... X...', clap: '.... .... X...', ride: 'x.x. x.x. x.x.' },
        STOMP3[1],
    ], fill: STOMP3_FILL },
};

export const TRACKS = [
    {
        // The title: the dark mouth of the well, the hero waiting at the top. The hook alone on a 50% pulse over a
        // triangle, no drums yet, a little slower than the first well, so pressing start feels like jumping in.
        id: 'title', loop: [1, 3],
        spec: {
            title: 'Babonk', ...HOME, emotion: 'hopeful', tempo: 132, groove: 'rock', comp: 'eighths', arp: 'tracker',
            legato: 0.7, dynamics: 0.6,
            form: ['intro', 'A', 'B', 'A'],
            band: { lead: 87, counter: 85, arp: 82, chords: null, pad: 90, bass: 38, drums: null },
            sections: {
                intro: { bars: 4, progression: 'i IV i IV', melody: false, energy: 0.35 },
                A: { bars: 8, progression: HOOK_CHORDS, melody: HOOK, energy: 0.55 },
                B: { bars: 8, progression: 'III VII IV i III VII v v', energy: 0.45, counter: 'harmony', endOn: 'dominant' },
            },
        },
    },
    {
        // Well 1: mint bricks and walkers, falling fast, the dark under every ledge. D minor in 5/4: two 25% pulses
        // answering each other, the triangle bass, the NES kit pounding a beat that lands a beat short of 4/4.
        id: 'well1', loop: WELL_LOOP, shape: drumsBy(WELL1_DRUMS),
        spec: {
            title: 'Down the Well', ...HOME, mode: 'minor', motif: BOUNCE5, emotion: 'tense', meter: '5/4', tempo: 138,
            groove: 'rock', comp: 'eighths', arp: 'tracker', legato: 0.7, dynamics: 0.8, form: WELL_FORM,
            band: { lead: 80, counter: 87, arp: 82, chords: null, pad: null, bass: 38, drums: 1 },
            sections: {
                intro: { bars: 4, progression: 'i i VI VII', energy: 0.55, mute: ['lead'] },
                verse: { bars: 8, progression: 'i i VI VII i i iv V', contour: 'valley', density: 1.1, energy: 0.68 },
                pre: { ...WELL_METERS.pre, bars: 4, progression: 'iv V VI V', energy: 0.75, develop: ['diminish'] },
                chorus: { bars: 8, progression: 'i iv VI V i iv VII i', energy: 0.9, answer: true,
                    melody: hook5('9:1.5 #7:0.5 5:3', '7:0.5 9:0.5 11:1.5 9:0.5 7 4') },
                bridge: { ...WELL_METERS.bridge, bars: 8, progression: 'VI VII i i VI VII V V', energy: 0.6, develop: ['augment'], counter: 'contrary', endOn: 'dominant' },
            },
        },
    },
    {
        // Well 2: deeper, floaters that stop, glare and chase. D phrygian's flat second, a PWM lead and a hollow
        // square circling it, the pulse bass, rimclicks and low toms: something down here is watching.
        id: 'well2', loop: WELL_LOOP, shape: drumsBy(WELL2_DRUMS),
        spec: {
            title: 'Deeper', ...HOME, mode: 'phrygian', motif: BOUNCE5, emotion: 'mysterious', meter: '5/4', tempo: 150,
            groove: 'rock', comp: 'eighths', arp: 'threes', legato: 0.65, dynamics: 0.8, form: WELL_FORM,
            band: { lead: 84, counter: 83, arp: 82, chords: null, pad: null, bass: 39, drums: 0 },
            sections: {
                intro: { bars: 4, progression: 'i II i II', pedal: 1, energy: 0.55, mute: ['lead'] },
                verse: { bars: 8, progression: 'i II vii i i II iv i', density: 1.2, contour: 'plateau', energy: 0.7, develop: ['repeat', 'sequence'] },
                pre: { ...WELL_METERS.pre, bars: 4, progression: 'iv iv II II', energy: 0.78 },
                chorus: { bars: 8, progression: 'i iv II i i vii II i', energy: 0.92, answer: true },
                bridge: { ...WELL_METERS.bridge, bars: 8, progression: 'VI VI vii vii VI VI II II', pedal: 1, energy: 0.6, develop: ['invert'], endOn: 'dominant' },
            },
        },
    },
    {
        // Well 3: the bottom, spikers everywhere, green danger on every ledge. Harmonic minor's raised seventh pulls
        // hard at every V; the fastest of the three, the DPCM bass and kit in double time, the hook back and angry.
        id: 'well3', loop: WELL_LOOP, shape: drumsBy(WELL3_DRUMS),
        spec: {
            title: 'The Bottom', ...HOME, mode: 'harmonicMinor', motif: BOUNCE5, emotion: 'angry', meter: '5/4', tempo: 162,
            groove: 'rock', comp: 'eighths', arp: 'ostinato', legato: 0.7, dynamics: 0.88, form: WELL_FORM,
            style: { earCandy: 0.5, syncopation: 0.3 },
            band: { lead: 86, counter: 87, arp: 82, chords: null, pad: null, bass: 33, drums: 2 },
            sections: {
                intro: { bars: 4, progression: 'i VI i V', pedal: 1, energy: 0.65, mute: ['lead'] },
                verse: { bars: 8, progression: 'i VI iv V i VI iv V', density: 1.3, energy: 0.8, develop: ['repeat', 'fragment'] },
                pre: { ...WELL_METERS.pre, bars: 4, progression: 'iv V iv V', energy: 0.85 },
                chorus: { bars: 8, progression: 'i iv VI V i iv V i', energy: 0.95, answer: true,
                    melody: hook5('9:1.5 7:0.5 5:3', '7,:0.5 2:0.5 5:1.5 4:0.5 2 7,') },
                bridge: { ...WELL_METERS.bridge, bars: 8, progression: 'VI V VI V iv V iv V', energy: 0.7, develop: ['invert'], endOn: 'dominant' },
            },
        },
    },
    {
        // The rest between wells: the floor of a well, still, one HP back. The motif as a music-box waltz in the
        // relative major, soft triangle and pluck over a pad, no drums. A breath before the next drop.
        id: 'rest', loop: [1, 3],
        spec: {
            title: 'Catch Your Breath', sound: 'chip', motif: BOUNCE, push: 0, key: 'F', mode: 'major', emotion: 'serene',
            tempo: 84, groove: 'waltz', comp: 'waltz', arp: 'updown', legato: 0.95, dynamics: 0.45,
            band: { lead: 85, counter: 83, arp: 46, chords: null, pad: 90, bass: 38, drums: null },
            form: ['intro', 'A', 'B', 'A'],
            sections: {
                intro: { bars: 2, progression: 'I IV', melody: false, energy: 0.3 },
                A: { bars: 8, progression: 'I vi IV V I vi ii V', contour: 'arch', energy: 0.45 },
                B: { bars: 8, progression: 'IV iii ii V IV iii ii V', counter: 'harmony', energy: 0.4, endOn: 'dominant' },
            },
        },
    },
    {
        // Game over: out of HP, bonked one time too many. A shrug, not a funeral: the bounce in D major, quick and
        // bright, then it deflates over the borrowed minor iv and tumbles down the scale, a cheeky octave hop to close.
        id: 'over', loop: null,
        spec: {
            title: 'Bonked', sound: 'chip', key: 'D', mode: 'major', emotion: 'playful', tempo: 150, groove: 'bounce',
            comp: 'offbeat', arp: 'tracker', legato: 0.6, dynamics: 0.7, ritardando: true,
            band: { lead: 86, counter: null, arp: 82, chords: null, pad: null, bass: 38, drums: 1 },
            form: ['A', 'outro'],
            sections: {
                A: { bars: 2, progression: 'I IV:0.5 iv:0.5', melody: BOUNCE + ' | 4:0.5 6:0.5 8 b6:0.5 5:0.5 4', energy: 0.7 },
                outro: { bars: 2, progression: 'V7 I', melody: '5:0.5 4:0.5 3:0.5 2:0.5 7,:1 5,:1 | 1:0.5 r:0.5 8:0.5 r:2.5', energy: 0.6 },
            },
        },
    },
    {
        // The bottom of the third well, the run won. The hook in D major, quick and loud, the bounce going up and staying up.
        id: 'win', loop: null,
        spec: {
            title: 'Out the Bottom', sound: 'chip', key: 'D', mode: 'major', emotion: 'heroic', tempo: 150, groove: 'rock',
            comp: 'eighths', arp: 'tracker', legato: 0.7, dynamics: 0.85,
            band: NES,
            form: ['A', 'outro'],
            sections: {
                A: { bars: 4, progression: 'I IV I V', melody: BOUNCE + ' | 4:0.5 6:0.5 8 6:0.5 8:0.5 10 | ' + BOUNCE + ' | 5:0.5 7:0.5 9 12:2', energy: 0.9 },
                outro: { bars: 2, progression: 'IV I', melody: '11:0.5 10:0.5 9:0.5 10:0.5 11 12 | 15:4', energy: 0.95 },
            },
        },
    },
];
