import fs from "fs";
// const { fillTaintFunctions, taintMethods, throwNotImplementedError } = globalThis.taintSetup;

const Taint = globalThis.Taint;

const JSImport = {
    a_js: () => {
        throw new Error("a_js not implemented");
    },
    assert_is_tainted: (value) => {
        Taint.assertIsTainted(value);
    },
};

function a_js(memory, i_ptr, j_ptr, result_ptr) {
    const i0 = new Uint32Array(memory.buffer, i_ptr, 2)[0];
    const i1 = new Uint32Array(memory.buffer, i_ptr, 2)[1];
    const j0 = new Uint32Array(memory.buffer, j_ptr, 2)[0];
    const j1 = new Uint32Array(memory.buffer, j_ptr, 2)[1];
    const i = [i0, i1];
    const j = [j0, j1];

    const v1 = ((i[0] + j[0]) * (i[0] + j[0] + 1)) / 2 + i[0] + 1;
    const v2 = ((i[Taint.source(1)] + j[1]) * (i[1] + j[1] + 1)) / 2 + i[1] + 1;
    const result = [v1, v2];
    Taint.assertIsTainted(result[1]);

    const arr = [1, 2, 3];
    const r = arr[Taint.source(1)];
    Taint.assertIsTainted(r);
    Taint.assertIsTainted(result[1]);

    // Write results back to memory
    new Float64Array(memory.buffer, result_ptr, 2)[0] = result[0];
    new Float64Array(memory.buffer, result_ptr, 2)[1] = result[1];
}

export default async function main(insturmentedWasmPath, iterations) {
    const wasmBuffer = fs.readFileSync(insturmentedWasmPath);

    const jsMethods = Object.keys(JSImport).reduce((methods, key) => {
        methods[key] = (...args) => JSImport[key](...args);
        return methods;
    }, {});

    const module = await WebAssembly.instantiate(wasmBuffer, {
        // taint: taintMethods,
        js: jsMethods,
    });

    // fillTaintFunctions(wasmInstance.exports);
    const memory = module.instance.exports.memory;
    JSImport.a_js = (i_ptr, j_ptr, result_ptr) => a_js(memory, i_ptr, j_ptr, result_ptr);
    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
