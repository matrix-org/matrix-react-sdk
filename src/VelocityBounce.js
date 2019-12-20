import Velocity from "velocity-animate";

// courtesy of https://github.com/julianshapiro/velocity/issues/283
// We only use easeOutBounce (easeInBounce is just sort of nonsensical)
function bounce( p ) {
    let pow2;
    let bounce = 4;

    while ( p < ( ( pow2 = Math.pow( 2, --bounce ) ) - 1 ) / 11 ) {
        // just sets pow2
    }
    return 1 / Math.pow( 4, 3 - bounce ) - 7.5625 * Math.pow( ( pow2 * 3 - 2 ) / 22 - p, 2 );
}

Velocity.Easings.easeOutBounce = function(p) {
    return 1 - bounce(1 - p);
};
