// adapted from https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/pidigits-node-3.html
// by Jacob Kreindl https://github.com/jkreindl/taint-benchmarks

/* The Computer Language Benchmarks Game
 * https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
 *
 * contributed by Denis Gribov
 *    a translation of the C program contributed by Mr Ledhug
 */
import fs from "fs";
const benchmarkName = "pidigits";
const outputFileName = `${benchmarkName}-output.txt`;

const Taint = globalThis.Taint;

function benchmark(n) {
    // Clear the ouput file
    fs.writeFileSync(outputFileName, "", (err) => {
        if (err) throw err;
    });

    // Int32
    let i = 0;
    let k = 0;
    let d = 0;
    let k2 = 0;
    let d3 = 0;
    let d4 = 0;

    // BigInt
    let tmp1 = Taint.source(0n); // mpz_init(tmp1)
    let tmp2 = Taint.source(0n); // mpz_init(tmp2)
    let acc = Taint.source(0n); // mpz_init_set_ui(acc, 0)
    let den = Taint.source(1n); // mpz_init_set_ui(den, 1)
    let num = Taint.source(1n); // mpz_init_set_ui(num, 1)

    while (i < n) {
        k++;

        //#region inline nextTerm(k)
        k2 = k * 2 + 1;
        acc += num * 2n; // mpz_addmul_ui(acc, num, 2)
        acc *= BigInt(k2); // mpz_mul_ui(acc, acc, k2)
        den *= BigInt(k2); // mpz_mul_ui(den, den, k2)
        num *= BigInt(k); // mpz_mul_ui(num, num, k)
        //#endregion inline nextTerm(k)

        if (num > acc /* mpz_cmp(num, acc) > 0 */) continue;

        //#region inline extractDigit(3);
        tmp1 = num * 3n; // mpz_mul_ui(tmp1, num, nth);
        tmp2 = tmp1 + acc; // mpz_add(tmp2, tmp1, acc);
        tmp1 = tmp2 / den; // mpz_tdiv_q(tmp1, tmp2, den);
        d3 = Number(tmp1) >>> 0; // mpz_get_ui(tmp1)
        //#region inline extractDigit(3);

        d = d3;

        //#region inline extractDigit(4);
        tmp1 = num * 4n; // mpz_mul_ui(tmp1, num, nth);
        tmp2 = tmp1 + acc; // mpz_add(tmp2, tmp1, acc);
        tmp1 = tmp2 / den; // mpz_tdiv_q(tmp1, tmp2, den);
        d4 = Number(tmp1) >>> 0; // mpz_get_ui(tmp1)
        //#region inline extractDigit(4);

        if (d !== d4) continue;

        // console.log(d);

        fs.appendFileSync(outputFileName, Math.floor(Taint.sanitize(d)).toString(), (err) => {
            if (err) throw err;
        });

        if (++i % 10 === 0) {
            fs.appendFileSync(outputFileName, "\t:", (err) => {
                if (err) throw err;
            });
            fs.appendFileSync(outputFileName, i.toString(), (err) => {
                if (err) throw err;
            });
            fs.appendFileSync(outputFileName, "\n", (err) => {
                if (err) throw err;
            });
        }

        //#region inline eliminateDigit(d)
        acc -= den * BigInt(d); // mpz_submul_ui(acc, den, d)
        acc *= 10n; // mpz_mul_ui(acc, acc, 10)
        num *= 10n; // mpz_mul_ui(num, num, 10)

        //#endregion inline eliminateDigit(d)
    }

    Taint.assertIsNotTainted(i);
    Taint.assertIsNotTainted(k);
    Taint.assertIsTainted(d);
    Taint.assertIsTainted(d3);
    Taint.assertIsTainted(d4);

    Taint.assertIsTainted(tmp1);
    Taint.assertIsTainted(tmp2);
    Taint.assertIsTainted(acc);
    Taint.assertIsTainted(den);
    Taint.assertIsTainted(num);

    return 0;
}

function getExpectedResult() {
    return 0;
}

console.assert(typeof benchmark == "function", "'benchmark' is not a function");
console.assert(typeof benchmarkName == "string", "'benchmarkName' is not defined or invalid");

export default function main(n) {
    const result = benchmark(n);
    return result;
}
