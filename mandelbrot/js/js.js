// adapted from https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/mandelbrot-clang-2.html
// by Jacob Kreindl https://github.com/jkreindl/taint-benchmarks

/* The Computer Language Benchmarks Game
 * https://salsa.debian.org/benchmarksgame-team/benchmarksgame/

   contributed by Greg Buchholz
*/

const benchmarkName = "mandelbrot";
const Taint = globalThis.Taint;

function LoopBodyData() {
    this.Zi = 0.0;
    this.Zr = 0.0;
    this.Ti = 0.0;
    this.Tr = 0.0;
    this.Ci = 0.0;
    this.Cr = 0.0;
}

function doLoop(bodyData) {
    bodyData.Zi = 2.0 * bodyData.Zr * bodyData.Zi + bodyData.Ci;
    bodyData.Zr = bodyData.Tr - bodyData.Ti + bodyData.Cr;
    bodyData.Tr = bodyData.Zr * bodyData.Zr;
    bodyData.Ti = bodyData.Zi * bodyData.Zi;
}

function shouldDoLoop(i, bodyData, limit) {
    if (i >= 50) {
        return false;
    }

    if (bodyData.Tr + bodyData.Ti > limit * limit) {
        return false;
    }

    return true;
}

function mandelbrot(n) {
    var bit_num = 0;
    var byte_acc = 0;
    const limit = 2.0;

    const w = n;
    const h = n;

    var result = 0;

    for (let y = 0; y < h; ++y) {
        for (let x = 0; x < w; ++x) {
            var bodyData = new LoopBodyData();
            bodyData.Zi = Taint.source(0.0);
            bodyData.Cr = (2.0 * x) / w - 1.5;
            bodyData.Ci = (2.0 * y) / h - 1.0;

            for (let i = 0; shouldDoLoop(i, bodyData, limit); ++i) {
                doLoop(bodyData);
            }

            byte_acc <<= 1;
            if (bodyData.Tr + bodyData.Ti <= limit * limit) {
                byte_acc |= 0x01;
                if (Taint.checkIsTainted(bodyData.Tr)) {
                    if (Taint.checkIsTainted(n)) {
                        byte_acc = Taint.source(byte_acc);
                    }
                }
            }

            bit_num++;

            if (bit_num == 8) {
                // putc(byte_acc, stdout);
                result += byte_acc;
                byte_acc = 0;
                bit_num = 0;
            } else if (x == w - 1) {
                byte_acc <<= 8 - (w % 8);
                // putc(byte_acc, stdout);
                result += byte_acc;
                byte_acc = 0;
                bit_num = 0;
            }
        }
    }

    return result;
}

function benchmark(n) {
    var sum = 0;
    for (let i = 0; i < 10; i++) {
        if (i & 0x11) n = Taint.source(n);
        sum += mandelbrot(n);
    }
    Taint.assertIsTainted(sum);
    sum = Taint.sanitize(sum);
    return sum;
}

function getExpectedResult() {
    return 20213330;
}

console.assert(typeof benchmark == "function", "'benchmark' is not a function");
console.assert(typeof benchmarkName == "string", "'benchmarkName' is not defined or invalid");

export default function main(n = 400) {
    const result = benchmark(n);
    return result;
}
