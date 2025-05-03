import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    do_loop: () => {
        throw new Error("do_loop not implemented");
    },
};

/**
 * unsafe extern "C" {
    fn do_loop(
        ziPtr: *mut f64,
        zrPtr: *mut f64,
        tiPtr: *mut f64,
        trPtr: *mut f64,
        ci: f64,
        cr: f64,
    );

    Ran with:
    do_loop(
        &mut body_data.zi,
        &mut body_data.zr,
        &mut body_data.ti,
        &mut body_data.tr,
        body_data.ci,
        body_data.cr,
    );
    Perform this (without bodyData things):
    bodyData.Zi = 2.0 * bodyData.Zr * bodyData.Zi + bodyData.Ci;
    bodyData.Zr = bodyData.Tr - bodyData.Ti + bodyData.Cr;
    bodyData.Tr = bodyData.Zr * bodyData.Zr;
    bodyData.Ti = bodyData.Zi * bodyData.Zi;
}
 */
function do_loop(memory, ziPtr, zrPtr, tiPtr, trPtr, ci, cr) {
    const ziArr = new Float64Array(memory.buffer, ziPtr, 1);
    const zrArr = new Float64Array(memory.buffer, zrPtr, 1);
    const tiArr = new Float64Array(memory.buffer, tiPtr, 1);
    const trArr = new Float64Array(memory.buffer, trPtr, 1);
    const zi = ziArr[0];
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
    JSImport.do_loop = (ziPtr, zrPtr, tiPtr, trPtr, ci, cr) => do_loop(memory, ziPtr, zrPtr, tiPtr, trPtr, ci, cr);

    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
