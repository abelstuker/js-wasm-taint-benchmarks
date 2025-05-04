import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    selectRandom: () => {
        throw new Error("selectRandom not implemented");
    },
    js_log: () => {
        throw new Error("js_log not implemented");
    },
};

/**
 * selectRandom(
                    rng,
                    gene_list,
                    gene_list.len(),
                    mem::size_of::<AminoAcid>(),
                    offset_of!(AminoAcid, c),
                    offset_of!(AminoAcid, p),
                )

    This was the original function in Rust:
    fn select_random(rng: &mut Random, gene_list: &[AminoAcid]) -> char {
    let r = rng.gen_random(1.0);

    if r < gene_list[0].p {
        return gene_list[0].c;
    }

    let mut lo = 0;
    let mut hi = gene_list.len() - 1;

    while hi > lo + 1 {
        let i = (hi + lo) / 2;
        if r < gene_list[i].p {
            hi = i;
        } else {
            lo = i;
        }
    }

    gene_list[hi].c
}
 */
function selectRandom(memory, rngPtr, geneListPtr, count, sizeOfAminoAcid, offsetOfC, offsetOfP) {
    const rng = new Uint32Array(memory.buffer, rngPtr, 1);
    var last = rng[0];
    const IM = 139968;
    const IA = 3877;
    const IC = 29573;

    last = (last * IA + IC) % IM;
    const r = last / IM;
    rng[0] = last;

    const geneList = new Uint8Array(memory.buffer, geneListPtr, count * sizeOfAminoAcid);

    if (r < geneList[offsetOfP / 8]) return String.fromCharCode(geneList[0 + offsetOfC / 8]);

    let lo = 0;
    let hi = count - 1;

    while (hi > lo + 1) {
        const i = Math.floor((hi + lo) / 2);
        if (r < geneList[i * sizeOfAminoAcid + offsetOfP / 8]) {
            hi = i;
        } else {
            lo = i;
        }
    }

    return geneList[hi * sizeOfAminoAcid + offsetOfC / 8];
}

export default async function main(insturmentedWasmPath, iterations) {
    const wasmBuffer = fs.readFileSync(insturmentedWasmPath);

    const jsMethods = Object.keys(JSImport).reduce((methods, key) => {
        methods[key] = (...args) => JSImport[key](...args);
        return methods;
    }, {});

    const module = await WebAssembly.instantiate(wasmBuffer, {
        js: jsMethods,
    });

    const memory = module.instance.exports.memory;
    JSImport.selectRandom = (...args) => selectRandom(memory, ...args);
    JSImport.js_log = (val) => {
        console.log("js_log:", val);
    };
    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
