// The soundtrack: one entry per file in music/. Written by tools/music/render.mjs (just music); don't edit by hand.
// Content only. Times are seconds into the file. offset is where the first beat falls, so beats sit at
// offset + n * 60 / tempo, and end is where the last bar ends (a one-shot's reverb rings on after it). loop is the
// part a looping track repeats, start and end on bar lines; null plays once. frames at rate is the file's exact
// length, for checking a decoder trimmed the mp3's encoder delay. A layer (layerOf) plays in step with that track,
// up to its level, the nearer the player is to its place.
export const TRACKS = {
    "title": {
        "file": "music/title.mp3",
        "title": "Babonk",
        "tempo": 132,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 36.6637,
        "frames": 1616867,
        "rate": 44100,
        "loop": {
            "start": 7.32273,
            "end": 36.41364
        }
    },
    "well1": {
        "file": "music/well1.mp3",
        "title": "Down the Well",
        "tempo": 144,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 60.3,
        "frames": 2659230,
        "rate": 44100,
        "loop": {
            "start": 6.71667,
            "end": 60.05
        }
    },
    "well2": {
        "file": "music/well2.mp3",
        "title": "Deeper",
        "tempo": 156,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 55.6846,
        "frames": 2455692,
        "rate": 44100,
        "loop": {
            "start": 6.20385,
            "end": 55.43462
        }
    },
    "well3": {
        "file": "music/well3.mp3",
        "title": "The Bottom",
        "tempo": 168,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 51.7286,
        "frames": 2281230,
        "rate": 44100,
        "loop": {
            "start": 5.76429,
            "end": 51.47857
        }
    },
    "rest": {
        "file": "music/rest.mp3",
        "title": "Catch Your Breath",
        "tempo": 84,
        "beatsPerBar": 3,
        "offset": 0.05,
        "end": null,
        "seconds": 38.8714,
        "frames": 1714230,
        "rate": 44100,
        "loop": {
            "start": 4.33571,
            "end": 38.62143
        }
    },
    "over": {
        "file": "music/over.mp3",
        "title": "Bonked",
        "tempo": 84,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": 11.8115,
        "seconds": 15.8115,
        "frames": 697288,
        "rate": 44100,
        "loop": null
    },
    "win": {
        "file": "music/win.mp3",
        "title": "Out the Bottom",
        "tempo": 150,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": 9.87145,
        "seconds": 13.8715,
        "frames": 611731,
        "rate": 44100,
        "loop": null
    }
};
