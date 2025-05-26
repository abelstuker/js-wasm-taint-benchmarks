import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    do_loop: () => {
        throw new Error("do_loop not implemented");
    },
};

function do_loop(memory, ziPtr, zrPtr, tiPtr, trPtr, ci, cr) {
    Taint.assertIsNotTainted(ci);
    Taint.assertIsNotTainted(cr);
    const ziArr = new Float64Array(memory.buffer, ziPtr, 1);
    const zrArr = new Float64Array(memory.buffer, zrPtr, 1);
    const tiArr = new Float64Array(memory.buffer, tiPtr, 1);
    const trArr = new Float64Array(memory.buffer, trPtr, 1);
    const zi = ziArr[0];
    Taint.assertIsTainted(zi);
    const zr = zrArr[0];
    const ti = tiArr[0];
    const tr = trArr[0];

    const newZi = 2.0 * zr * zi + ci;
    const newZr = tr - ti + cr;
    const newTr = newZr * newZr;
    const newTi = newZi * newZi;

    ziArr[0] = newZi;
    zrArr[0] = newZr;
    tiArr[0] = newTi;
    trArr[0] = newTr;
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
    JSImport.do_loop = (ziPtr, zrPtr, tiPtr, trPtr, ci, cr) => do_loop(memory, ziPtr, zrPtr, tiPtr, trPtr, ci, cr);

    if (additionalImportObjectFillerFunction) {
        additionalImportObjectFillerFunction(module.instance.exports);
    }
    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
