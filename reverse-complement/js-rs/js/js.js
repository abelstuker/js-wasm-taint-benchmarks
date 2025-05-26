import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    get_complement_char: () => {
        throw new Error("getComplementChar not implemented");
    },
    js_log: (message) => {
        console.log("Value from WASM:", message);
    },
};

function complement(character) {
    switch (String.fromCharCode(character)) {
        case "A":
        case "a":
            return Taint.source("T");
        case "C":
        case "c":
            return Taint.source("G");
        case "G":
        case "g":
            return Taint.source("C");
        case "T":
        case "t":
            return "A";
        case "U":
        case "u":
            return "A";
        case "M":
        case "m":
            return "K";
        case "R":
        case "r":
            return "Y";
        case "W":
        case "w":
            return "W";
        case "S":
        case "s":
            return Taint.source("S");
        case "Y":
        case "y":
            return Taint.source("R");
        case "K":
        case "k":
            return Taint.source("M");
        case "V":
        case "v":
            return Taint.source("B");
        case "H":
        case "h":
            return "D";
        case "D":
        case "d":
            return "H";
        case "B":
        case "b":
            return "V";
        case "N":
        case "n":
            return Taint.source("N");
        default:
            return "\0";
    }
}

function getComplementChar(original) {
    // console.log("Original string:", String.fromCharCode(original));
    const ch = complement(original);
    // console.log("Complement character:", ch);
    if (ch === "T" || ch === "G" || ch === "C" || ch === "S" || ch === "R" || ch === "M" || ch === "B" || ch === "N") {
        Taint.assertIsTainted(ch);
    } else {
        Taint.assertIsNotTainted(ch);
    }
    return ch.charCodeAt(0);
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

    JSImport.get_complement_char = (val) => {
        return getComplementChar(val);
    };
    if (additionalImportObjectFillerFunction) {
        additionalImportObjectFillerFunction(module.instance.exports);
    }
    const wasmMain = module.instance.exports.main;
    const res = wasmMain();
    return res;
}
