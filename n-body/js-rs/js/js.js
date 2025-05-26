import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    advanceSingle: () => {
        throw new Error("advanceSingle not implemented");
    },
};

function advanceSingle(
    x1,
    y1,
    z1,
    x2,
    y2,
    z2,
    vx1Ptr,
    vy1Ptr,
    vz1Ptr,
    vx2Ptr,
    vy2Ptr,
    vz2Ptr,
    mass1Ptr,
    mass2Ptr,
    dt,
    memory
) {
    Taint.assertIsTainted(x1);
    Taint.assertIsTainted(y1);
    Taint.assertIsTainted(z1);
    Taint.assertIsTainted(x2);
    Taint.assertIsTainted(y2);
    Taint.assertIsTainted(z2);

    Taint.assertIsNotTainted(vx1Ptr);
    Taint.assertIsNotTainted(vy1Ptr);
    Taint.assertIsNotTainted(vz1Ptr);
    Taint.assertIsNotTainted(vx2Ptr);
    Taint.assertIsNotTainted(vy2Ptr);
    Taint.assertIsNotTainted(vz2Ptr);
    Taint.assertIsNotTainted(mass1Ptr);
    Taint.assertIsNotTainted(mass2Ptr);

    const vx1Arr = new Float64Array(memory.buffer, vx1Ptr, 1);
    const vy1Arr = new Float64Array(memory.buffer, vy1Ptr, 1);
    const vz1Arr = new Float64Array(memory.buffer, vz1Ptr, 1);

    const vx2Arr = new Float64Array(memory.buffer, vx2Ptr, 1);
    const vy2Arr = new Float64Array(memory.buffer, vy2Ptr, 1);
    const vz2Arr = new Float64Array(memory.buffer, vz2Ptr, 1);

    const mass1Arr = new Float64Array(memory.buffer, mass1Ptr, 1);
    const mass2Arr = new Float64Array(memory.buffer, mass2Ptr, 1);

    let dx = x1 - x2;
    let dy = y1 - y2;
    let dz = z1 - z2;

    let r = dx * dx + dy * dy + dz * dz;
    r = Math.sqrt(r);
    let mag = Taint.source(dt) / (r * r * r);

    // For body i
    vx1Arr[0] -= dx * mass2Arr[0] * mag;
    vy1Arr[0] -= dy * mass2Arr[0] * mag;
    vz1Arr[0] -= dz * mass2Arr[0] * mag;
    // For body j
    vx2Arr[0] += dx * mass1Arr[0] * mag;
    vy2Arr[0] += dy * mass1Arr[0] * mag;
    vz2Arr[0] += dz * mass1Arr[0] * mag;

    Taint.assertIsTainted(vx1Arr[0]);
    Taint.assertIsTainted(vy1Arr[0]);
    Taint.assertIsTainted(vz1Arr[0]);
    Taint.assertIsTainted(vx2Arr[0]);
    Taint.assertIsTainted(vy2Arr[0]);
    Taint.assertIsTainted(vz2Arr[0]);

    Taint.assertIsNotTainted(mass1Arr[0]);
    Taint.assertIsNotTainted(mass2Arr[0]);
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
    JSImport.advanceSingle = (...args) => advanceSingle(...args, memory);

    if (additionalImportObjectFillerFunction) {
        additionalImportObjectFillerFunction(module.instance.exports);
    }

    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
