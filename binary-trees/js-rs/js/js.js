import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    getItem: () => {
        throw new Error("getItem not implemented");
    },
    jsLog: (val) => {
        console.log("jsLog:", val);
    },
};

function getItem(level) {
    let item = 1;
    const andRes = level & 0b11;
    if (andRes == 0b11) {
        item = Taint.source(item);
    }
    return item;
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

    JSImport.getItem = (level) => getItem(level);
    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
