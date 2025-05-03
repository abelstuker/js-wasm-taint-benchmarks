// adapted from https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/fannkuchredux-clang-1.html
// by Jacob Kreindl https://github.com/jkreindl/taint-benchmarks

/* The Computer Language Benchmarks Game
 * https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
 *
 * converted to C by Joseph Piché
 * from Java version by Oleg Mazurov and Isaac Gouy
 *
 */

const benchmarkName = "fannkuch-redux";

const Taint = globalThis.Taint;

function max(a, b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

function fannkuchredux(n) {
    const perm = [];
    const perm1 = [];
    const count = [];
    let maxFlipsCount = 0;
    let permCount = 0;
    let checksum = 0;

    for (let i = 0; i < n; i += 1) perm1[i] = i;

    for (let i = 0; i < n; i += 3) perm1[i] = Taint.source(perm1[i]);

    let r = n;

    while (true) {
        while (r != 1) {
            count[r - 1] = r;
            r -= 1;
        }

        for (let i = 0; i < n; i += 1) perm[i] = perm1[i];
        let flipsCount = Taint.source(0);
        let k;

        while (true) {
            k = perm[0];
            if (k == 0) {
                break;
            }

            const k2 = (k + 1) >> 1;
            for (let i = 0; i < k2; i++) {
                const temp = perm[i];
                perm[i] = perm[k - i];
                perm[k - i] = temp;
            }
            flipsCount += 1;
            Taint.assertIsTainted(flipsCount);
        }

        maxFlipsCount = max(maxFlipsCount, flipsCount);
        if (permCount % 2 == 0) {
            checksum += flipsCount;
        } else {
            checksum -= flipsCount;
        }

        // the flipsCount must be tainted now
        if (maxFlipsCount == flipsCount) Taint.assertIsTainted(checksum);

        /* Use incremental change to generate another permutation */
        while (true) {
            if (r == n) {
                for (var idx = 0; idx < n; idx += 3) Taint.assertIsTainted(perm1[idx]);
                for (var idx = 1; idx < n; idx += 3) Taint.assertIsNotTainted(perm1[idx]);
                for (var idx = 2; idx < n; idx += 3) Taint.assertIsNotTainted(perm1[idx]);

                return Taint.sanitize(maxFlipsCount);
            }

            const perm0 = perm1[0];
            let i = 0;
            while (i < r) {
                var j = i + 1;
                perm1[i] = perm1[j];
                i = j;
            }
            perm1[r] = perm0;
            count[r] = count[r] - 1;
            if (count[r] > 0) break;
            r++;
        }
        permCount++;
    }
}

function benchmark(n) {
    const result = fannkuchredux(n);
    return result;
}

function getExpectedResult() {
    return 38;
}

function setup(arg) {}

console.assert(typeof benchmark == "function", "'benchmark' is not a function");
console.assert(typeof benchmarkName == "string", "'benchmarkName' is not defined or invalid");

export default function main(n = 10) {
    const result = benchmark(n);
    return result;
}
