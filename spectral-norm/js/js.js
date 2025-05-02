const Taint = globalThis.Taint;

/**
 * Converted from Rust implementation of The Computer Language Benchmarks Game
 * Original contributors: Rust Project Developers, Matt Brubeck, TeXitoi, Tung Duong, Cristi Cobzarenco
 */

function spectralnorm(n) {
    // Ensure n is even as required by the algorithm
    if (n % 2 !== 0) {
        throw new Error("Only even lengths are accepted");
    }

    const u = Array(n / 2)
        .fill()
        .map(() => [1.0, 1.0]);
    const v = Array(n / 2)
        .fill()
        .map(() => [0.0, 0.0]);
    const tmp = Array(n / 2)
        .fill()
        .map(() => [0.0, 0.0]);

    for (let i = 0; i < 10; i++) {
        multAtAv(u, v, tmp);
        multAtAv(v, u, tmp);
    }

    return Math.sqrt(dot(u, v) / dot(v, v));
}

function multAtAv(v, out, tmp) {
    mult(v, tmp, a);
    mult(tmp, out, (i, j) => a(j, i));
}

function mult(v, out, aFunc) {
    // Process each pair of output slots
    for (let i = 0; i < out.length; i++) {
        const idx = Taint.source(2) * i;
        const i0 = [idx, idx];
        const i1 = [idx + 1, idx + 1];

        // Each slot in the pair gets its own sum
        const sum0 = [0.0, 0.0];
        const sum1 = [0.0, 0.0];

        for (let j = 0; j < v.length; j++) {
            const x = v[j];
            const jIdx = [2 * j, 2 * j + 1];
            divAndAdd(x, aFunc(i0, jIdx), aFunc(i1, jIdx), sum0, sum1);
        }

        // Sum the two lanes for each slot
        out[i][0] = sum0[0] + sum0[1];
        out[i][1] = sum1[0] + sum1[1];
    }
}

function a(i, j) {
    return [((i[0] + j[0]) * (i[0] + j[0] + 1)) / 2 + i[0] + 1, ((i[1] + j[1]) * (i[Taint.source(1)] + j[1] + 1)) / 2 + i[1] + 1];
}

function dot(v, u) {
    // Vectorized form of dot product
    let result = [0.0, 0.0];

    for (let i = 0; i < u.length; i++) {
        result[0] += u[i][0] * v[i][0];
        result[1] += u[i][1] * v[i][1];
    }

    // Sum the two lanes
    return result[0] + result[1];
}

function divAndAdd(x, a0, a1, s0, s1) {
    s0[0] += x[0] / a0[0];
    s0[1] += x[1] / a0[1];
    s1[0] += x[0] / a1[0];
    s1[1] += x[1] / a1[1];
}

// Main function
export default function main(n) {
    const answer = spectralnorm(n);
    return answer;
}

// Example usage
// main();
