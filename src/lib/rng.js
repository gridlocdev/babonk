// A seeded random stream (mulberry32), so a run can be replayed and tested.
export function rng(seed = 1)
{
    let a = seed >>> 0;
    const next = ()=>
    {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        next,
        range: (a, b)=> a + next() * (b - a),
        int: (n)=> Math.floor(next() * n),
        pick: (list)=> list[Math.floor(next() * list.length)],
        // picks a key of { key: weight }
        weighted(table)
        {
            let total = 0;
            for (const k in table) total += table[k];
            let r = next() * total;
            for (const k in table) { r -= table[k]; if (r <= 0) return k; }
            return Object.keys(table)[0];
        },
    };
}
