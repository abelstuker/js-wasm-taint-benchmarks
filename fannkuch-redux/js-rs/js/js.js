import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    max: () => {
        throw new Error("max not implemented");
    },
};

function max(a, b) {
    if (b > a) {
        return b;
    } else {
        return a;
    }
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
    JSImport.max = (a, b) => max(a, b);

    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
