// The soundtrack as song specs for music-generator's composer (its docs/COMPOSING.md, "The song spec").
// tools/music/render.mjs composes and renders each one to music/<id>.mp3; `just music` runs it. docs/AUDIO.md has the
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

// a well: an intro that rings into a 32-bar loop of verse, hook, bridge, hook; the last verse is only there to loop into
const WELL_FORM = ['intro', 'verse', 'chorus', 'bridge', 'chorus', 'verse'];

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
        // Well 1: mint bricks, a few walkers, falling fast and bouncing off everything. The bare NES: two pulses that
        // echo each other, a triangle bass running eighths, the NES kit. Bright for a minor key; it's still fun here.
        id: 'well1', loop: [1, 5],
        spec: {
            title: 'Down the Well', ...HOME, emotion: 'joyful', tempo: 144, groove: 'rock', comp: 'eighths', arp: 'tracker',
            legato: 0.7, dynamics: 0.75, band: NES, form: WELL_FORM,
            sections: {
                intro: { bars: 4, progression: 'i IV i IV', energy: 0.6, mute: ['lead'] },
                verse: { bars: 8, progression: 'i IV i IV i IV III VII', contour: 'plateau', density: 1.2, energy: 0.7 },
                chorus: { bars: 8, progression: HOOK_CHORDS, melody: HOOK, energy: 0.88, answer: true },
                bridge: { bars: 8, progression: 'III VII IV i III VII v v', energy: 0.6, develop: ['invert'], endOn: 'dominant' },
            },
        },
    },
    {
        // Well 2: deeper, floaters that glare and chase. Plain minor now, faster, a PWM lead and a pulse bass that
        // drives, the arpeggio shimmering under it. The hook's bounce returns, sequenced up, never quite at home.
        id: 'well2', loop: [1, 5],
        spec: {
            title: 'Deeper', ...HOME, mode: 'minor', emotion: 'tense', tempo: 156, groove: 'dance', comp: 'upbeats', arp: 'tracker',
            legato: 0.65, dynamics: 0.8, form: WELL_FORM,
            band: { lead: 84, counter: 82, arp: 80, chords: null, pad: null, bass: 39, drums: 0 },
            sections: {
                intro: { bars: 4, progression: 'i i VI VII', energy: 0.6, mute: ['lead'] },
                verse: { bars: 8, progression: 'i VII VI VII i VII VI V', density: 1.3, contour: 'plateau', energy: 0.75, develop: ['repeat', 'sequence'] },
                chorus: { bars: 8, progression: 'i iv i VII i iv v i', energy: 0.9, counter: 'contrary' },
                bridge: { bars: 8, progression: 'VI VII i i VI VII V V', energy: 0.6, develop: ['augment'], endOn: 'dominant' },
            },
        },
    },
    {
        // Well 3: the bottom, spikers everywhere, the green of danger all over. Phrygian's flat second leans on every
        // bar, fastest of all, thin 12.5% pulse and the DPCM bass and kit hammering. The motif, fragmented and inverted.
        id: 'well3', loop: [1, 5],
        spec: {
            title: 'The Bottom', ...HOME, mode: 'phrygian', emotion: 'tense', tempo: 168, groove: 'rock', comp: 'eighths', arp: 'tracker',
            legato: 0.7, dynamics: 0.85, form: WELL_FORM, style: { earCandy: 0.5, syncopation: 0.3 },
            band: { lead: 86, counter: 87, arp: 82, chords: null, pad: null, bass: 33, drums: 2 },
            sections: {
                intro: { bars: 4, progression: 'i II i II', pedal: 1, energy: 0.65, mute: ['lead'] },
                verse: { bars: 8, progression: 'i II i VII i II vii i', density: 1.3, energy: 0.8, develop: ['repeat', 'fragment'] },
                chorus: { bars: 8, progression: 'i iv II i i iv VII i', energy: 0.95, answer: true },
                bridge: { bars: 8, progression: 'iv iv II II iv iv vii vii', energy: 0.65, develop: ['invert'], pedal: 1, endOn: 'dominant' },
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
        // Game over: out of HP somewhere in the dark. The hook's fall, slow, in harmonic minor, slowing to a stop.
        id: 'over', loop: null,
        spec: {
            title: 'Bonked', sound: 'chip', key: 'D', mode: 'harmonicMinor', emotion: 'melancholy', tempo: 84, groove: 'ballad',
            comp: 'sustain', arp: 'tracker', legato: 0.9, dynamics: 0.5, ritardando: true,
            band: { lead: 80, counter: null, arp: 83, chords: null, pad: 90, bass: 38, drums: null },
            form: ['A', 'outro'],
            sections: {
                A: { bars: 2, progression: 'i iv', melody: '8:0.5 7:0.5 5 3:0.5 2:0.5 1 | 4:1.5 3:0.5 2 #7,', energy: 0.5 },
                outro: { bars: 2, progression: 'V i', melody: '2:2 #7,:2 | 1:4', energy: 0.35 },
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
