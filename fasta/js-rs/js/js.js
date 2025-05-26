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

function selectRandom(rngPtr, geneListPtr, count, sizeOfAminoAcid, offsetOfC, offsetOfP, memory) {
    Taint.assertIsNotTainted(rngPtr);
    Taint.assertIsNotTainted(geneListPtr);
    Taint.assertIsNotTainted(count);
    Taint.assertIsNotTainted(sizeOfAminoAcid);
    Taint.assertIsNotTainted(offsetOfC);
    Taint.assertIsNotTainted(offsetOfP);
    const rng = new Uint32Array(memory.buffer, rngPtr, 1);
    var last = rng[0];
    const IM = 139968;
    const IA = 3877;
    const IC = 29573;

    last = (last * IA + IC) % IM;
    const r = last / IM;
    rng[0] = last;

    const geneList = new Uint8Array(memory.buffer, geneListPtr, count * sizeOfAminoAcid);

    if (r < geneList[offsetOfP / 8]) {
        const res = String.fromCharCode(geneList[0 + offsetOfC / 8]);
        if (res === "G" || res === "T" || res === "g" || res === "t") {
            Taint.assertIsTainted(res);
        } else {
            Taint.assertIsNotTainted(res);
        }
        return res;
    }

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

    const resCode = geneList[hi * sizeOfAminoAcid + offsetOfC / 8];
    return resCode;
}

export default async function main(
    insturmentedWasmPath,
    iterations,
    additionalImportObject,
    additionalImportObjectFillerFunction
) {
    const wasmBuffer = fs.readFileSync(insturmentedWasmPath);

    const jsMethods = Object.keys(JSImport).reduce((methods, key) => {
        methods[key] = (...args) => JSImport[key](...args);
        return methods;
    }, {});

    const module = await WebAssembly.instantiate(wasmBuffer, {
        js: jsMethods,
        ...additionalImportObject,
    });

    const memory = module.instance.exports.memory;
    JSImport.selectRandom = (...args) => selectRandom(...args, memory);
    JSImport.js_log = (val) => {
        console.log("js_log:", val);
    };

    if (additionalImportObjectFillerFunction) {
        additionalImportObjectFillerFunction(module.instance.exports);
    }
    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
