import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    write_to_file: () => {
        throw new Error("writeToFile not implemented");
    },
    js_log: () => {
        throw new Error("js_log not implemented");
    },
};

const outputFileName = "output.txt";

function writeToFile(d, iPtr, memory) {
    Taint.assertIsTainted(d);
    const iArr = new Uint32Array(memory.buffer, iPtr, 1);
    iArr[0] = iArr[0] + 1;
    const i = iArr[0];
    fs.appendFileSync(outputFileName, Math.floor(Taint.sanitize(d)).toString(), (err) => {
        if (err) throw err;
    });

    if (i % 10 === 0) {
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
}

export default async function main(
    insturmentedWasmPath,
    iterations,
    additionalImportObject,
    additionalImportObjectFillerFunction
) {
    // Clear the ouput file
    fs.writeFileSync(outputFileName, "", (err) => {
        if (err) throw err;
    });

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
    JSImport.js_log = (val) => {
        console.log("js_log:", val);
    };
    JSImport.write_to_file = (...args) => writeToFile(...args, memory);

    if (additionalImportObjectFillerFunction) {
        additionalImportObjectFillerFunction(module.instance.exports);
    }

    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
