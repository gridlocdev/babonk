// Sprite-frame timing. Which frame of an animation shows `time` seconds in, when each frame has its own duration:
// key poses are held longer than the in-betweens. A loop wraps; otherwise it holds the last frame.
//   frameAt([.08, .05, .05, .12], time, true) → 0..3
export function frameAt(durations, time, loop = true)
{
    const total = durations.reduce((a, b)=> a + b, 0);
    if (!(total > 0)) return 0;
    if (loop) time %= total;
    else if (time >= total) return durations.length - 1;
    for (let i = 0; i < durations.length; i++)
    {
        if (time < durations[i]) return i;
        time -= durations[i];
    }
    return durations.length - 1;
}
