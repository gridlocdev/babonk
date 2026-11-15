// The foes' numbers. Distances are pixels of the 320 × 180 screen; speeds in pixels a second; times in seconds.
// walker: paces its ledge. spiker: paces too, and can't be stomped. floater: hovers until it spots you, then chases.
export const FOES = {
    size: 8, walkerSpeed: 22, floaterSpeed: 28,
    // a floater that spots you within floaterSight stops and stares for floaterTell seconds before it gives chase, and
    // only gives up past floaterSight × floaterLose
    floaterSight: 84, floaterTell: .35, floaterLose: 1.4,
    // hit stop: the action freezes for hitStop seconds on a kill, hitStopChain longer for each bounce in the chain so
    // far, up to hitStopMax
    hitStop: .05, hitStopChain: .015, hitStopMax: .14,
    points: { walker: 50, floater: 50, spiker: 80 },
};
