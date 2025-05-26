/**
 * Benchmarking.
 *
 * For every program, the following benchmarks are performed:
 *
 * - A. JavaScript only benchmark
 *     - 1. Uninstrumented JavaScript code
 *     - 2. Forward analysis on JavaScript code
 *     - 3. Linvail on JavaScript code
 *     - 4. Taint analysis on JavaScript code
 *
 * - B. WebAssembly only benchmark
 *     - 1. Uninstrumented WebAssembly code
 *     - 2. Forward analysis on WebAssembly code
 *     - 3. Shadow execution analysis on WebAssembly code
 *     - 4. Taint analysis on WebAssembly code
 *
 *  C. JavaScript/WebAssembly interop benchmark
 *     - 1. Uninstrumented code
 *     - 2. Forward analysis on code
 *     - 3. Taint analysis on JavaScript code, without taint analysis on WebAssembly code
 *     - 4. Taint analysis on WebAssembly code, without taint analysis on JavaScript code
 *     - 5. Taint analysis on both JavaScript and WebAssembly code
 *
 * Every benchmark suite must have the following file structure:
 * - js/
 *     - js.js -> the uninstrumented JavaScript code
 *     - instrumented/
 *        - not-instrumented.js -> the uninstrumented JavaScript code
 *        - instrumented-forward-analysis.js -> the JavaScript code instrumented with the forward analysis
 *        - instrumented-linvail.js -> the JavaScript code instrumented with the Linvail analysis
 *        - instrumented-taint-analysis.js -> the JavaScript code instrumented with the taint analysis
 *     - benchmark-results/
 *        - results-not-instrumented.txt -> the results of the uninstrumented JavaScript code
 *        - results-instrumented-forward-analysis.txt -> the results of the JavaScript code instrumented with the forward analysis
 *        - results-instrumented-linvail.txt -> the results of the JavaScript code instrumented with the Linvail analysis
 *        - results-instrumented-taint-analysis.txt -> the results of the JavaScript code instrumented with the taint analysis
 *
 * - rs/
 *     - src/lib.rs -> the uninstrumented Rust code
 *     - Cargo.toml -> the Rust project file
 *     - instrumented/
 *         - not-instrumented.wasm -> the uninstrumented WebAssembly code
 *         - instrumented-forward-analysis.wasm -> the WebAssembly code instrumented with the forward analysis
 *         - instrumented-shadow-execution-analysis.wasm -> the WebAssembly code instrumented with the shadow execution analysis
 *         - instrumented-taint-analysis.wasm -> the WebAssembly code instrumented with the taint analysis
 *     - benchmark-results/
 *         - results-not-instrumented.txt -> the results of the uninstrumented WebAssembly code
 *         - results-instrumented-forward-analysis.txt -> the results of the WebAssembly code instrumented with the forward analysis
 *         - results-instrumented-shadow-execution-analysis.txt -> the results of the WebAssembly code instrumented with the shadow execution analysis
 *         - results-instrumented-taint-analysis.txt -> the results of the WebAssembly code instrumented with the taint analysis
 *
 * - js-rs/ TODO
 */
import fs from "fs";
import { TaintTracker } from "../aran-taint-analysis/index.js";
import {
    debugMethods,
    fillDebugFunctions,
    fillTaintFunctions,
    taintMethods,
} from "../aran-taint-analysis/src/taint.js";
import { ANALYSIS_TYPES } from "../aran-taint-analysis/utils/config.js";
import { benchmarks, benchmarkTypes } from "./setup.js";

const BenchmarkTypeJs = {
    NOT_INSTRUMENTED: "not-instrumented",
    INSTRUMENTED_FORWARD_ANALYSIS: "instrumented-forward-analysis",
    INSTRUMENTED_LINVAIL: "instrumented-linvail",
    INSTRUMENTED_TAINT_ANALYSIS: "instrumented-taint-analysis",
};
const benchmarkJsTypeToAnalysisType = (benchmarkTypeJs) => {
    switch (benchmarkTypeJs) {
        case BenchmarkTypeJs.NOT_INSTRUMENTED:
            return ANALYSIS_TYPES.NO_ANALYSIS;
        case BenchmarkTypeJs.INSTRUMENTED_FORWARD_ANALYSIS:
            return ANALYSIS_TYPES.FORWARD_ANALYSIS;
        case BenchmarkTypeJs.INSTRUMENTED_LINVAIL:
            return ANALYSIS_TYPES.LINVAIL_ANALYSIS;
        case BenchmarkTypeJs.INSTRUMENTED_TAINT_ANALYSIS:
            return ANALYSIS_TYPES.TAINT_ANALYSIS;
        default:
            throw new Error(`Unknown benchmark type: ${benchmarkTypeJs}`);
    }
};

const BenchmarkTypeWasm = {
    NOT_INSTRUMENTED: "not-instrumented",
    INSTRUMENTED_FORWARD_ANALYSIS: "instrumented-forward-analysis",
    INSTRUMENTED_SHADOW_EXECUTION_ANALYSIS: "instrumented-shadow-execution-analysis",
    INSTRUMENTED_TAINT_ANALYSIS: "instrumented-taint-analysis",
};

const BenchmarkTypeInterop = {
    NOT_INSTRUMENTED: "not-instrumented",
    INSTRUMENTED_FORWARD_ANALYSIS: "instrumented-forward-analysis",
    INSTRUMENTED_TAINT_ANALYSIS_JS: "instrumented-taint-analysis-js",
    INSTRUMENTED_TAINT_ANALYSIS_WASM: "instrumented-taint-analysis-wasm",
    INSTRUMENTED_TAINT_ANALYSIS_BOTH: "instrumented-taint-analysis-both",
};

const benchmarkInteropTypeToAnalysisType = (benchmarkTypeInterop) => {
    switch (benchmarkTypeInterop) {
        case BenchmarkTypeInterop.NOT_INSTRUMENTED:
            return ANALYSIS_TYPES.NO_ANALYSIS;
        case BenchmarkTypeInterop.INSTRUMENTED_FORWARD_ANALYSIS:
            return ANALYSIS_TYPES.FORWARD_ANALYSIS;
        case BenchmarkTypeInterop.INSTRUMENTED_TAINT_ANALYSIS_JS:
            return ANALYSIS_TYPES.TAINT_ANALYSIS;
        case BenchmarkTypeInterop.INSTRUMENTED_TAINT_ANALYSIS_WASM:
            return ANALYSIS_TYPES.NO_ANALYSIS;
        case BenchmarkTypeInterop.INSTRUMENTED_TAINT_ANALYSIS_BOTH:
            return ANALYSIS_TYPES.TAINT_ANALYSIS;
        default:
            throw new Error(`Unknown benchmark type: ${benchmarkTypeInterop}`);
    }
};

export default async function runBenchmark(benchmark) {
    if (benchmarkTypes.javascript.enabled) await runJsBenchmark(benchmark);
    if (benchmarkTypes.webassembly.enabled) await runWasmBenchmark(benchmark);
    if (benchmarkTypes.javascript_webassembly.enabled) await runInteropBenchmark(benchmark);
}

async function runJsBenchmark(benchmark) {
    if (benchmarkTypes.javascript.baseline_enabled)
        await runJsBenchmarkWithType(benchmark, BenchmarkTypeJs.NOT_INSTRUMENTED);
    if (benchmarkTypes.javascript.forward_enabled)
        await runJsBenchmarkWithType(benchmark, BenchmarkTypeJs.INSTRUMENTED_FORWARD_ANALYSIS);
    if (benchmarkTypes.javascript.linvail_enabled)
        await runJsBenchmarkWithType(benchmark, BenchmarkTypeJs.INSTRUMENTED_LINVAIL);
    if (benchmarkTypes.javascript.taint_enabled)
        await runJsBenchmarkWithType(benchmark, BenchmarkTypeJs.INSTRUMENTED_TAINT_ANALYSIS);
}

async function runJsBenchmarkWithType(benchmark, benchmarkType) {
    const resultsFile = `./${benchmark.name}/js/benchmark-results/results-${benchmarkType}.txt`;
    resetFile(resultsFile);
    const taintTracker = new TaintTracker(benchmarkJsTypeToAnalysisType(benchmarkType));
    const inputFile = `./${benchmark.name}/js/js.js`;
    const outputFile = `./${benchmark.name}/js/instrumented/${benchmarkType}.js`;
    const file = await instrumentJsCode(taintTracker, inputFile, outputFile);
    const absoluteFilePath = fs.realpathSync(file);
    const args = [benchmark.input];
    const func = async () => {
        await taintTracker.runInstrumentedAnalysis(absoluteFilePath, args);
    };
    await measureExecutionTime(func, args, resultsFile);
    console.log("");
}

async function instrumentJsCode(taintTracker, inputFile, outputFile) {
    await taintTracker.analyze(inputFile, outputFile);
    return outputFile;
}

async function runWasmBenchmark(benchmark) {
    if (benchmarkTypes.webassembly.baseline_enabled)
        await runWasmBenchmarkWithType(benchmark, BenchmarkTypeWasm.NOT_INSTRUMENTED);
    if (benchmarkTypes.webassembly.forward_enabled)
        await runWasmBenchmarkWithType(benchmark, BenchmarkTypeWasm.INSTRUMENTED_FORWARD_ANALYSIS);
    if (benchmarkTypes.webassembly.shadow_enabled)
        await runWasmBenchmarkWithType(benchmark, BenchmarkTypeWasm.INSTRUMENTED_SHADOW_EXECUTION_ANALYSIS);
    if (benchmarkTypes.webassembly.taint_enabled)
        await runWasmBenchmarkWithType(benchmark, BenchmarkTypeWasm.INSTRUMENTED_TAINT_ANALYSIS);
}

async function runWasmBenchmarkWithType(benchmark, benchmarkType) {
    const resultsFile = `./${benchmark.name}/rs/benchmark-results/results-${benchmarkType}.txt`;
    resetFile(resultsFile);

    const wasmFilePath = `./${benchmark.name}/rs/instrumented/${benchmarkType}.wasm`;
    const absoluteFilePath = fs.realpathSync(wasmFilePath);
    const wasmBuffer = fs.readFileSync(absoluteFilePath);
    const requiresTaintImports = benchmarkType !== BenchmarkTypeWasm.NOT_INSTRUMENTED;
    const importObject = {};
    if (requiresTaintImports) {
        importObject.taint = taintMethods;
    }
    importObject.debug = debugMethods;
    const wasmModule = await WebAssembly.instantiate(wasmBuffer, importObject);

    if (requiresTaintImports) {
        fillTaintFunctions(wasmModule.instance.exports);
    }
    fillDebugFunctions();

    const main = wasmModule.instance.exports.main;
    if (typeof main !== "function") {
        console.error(`Error: Wasm module ${wasmFilePath} does not export a 'main' function.`);
        return;
    }
    const args = [benchmark.input];
    const func = async () => {
        console.log(`Running ${benchmarkType} benchmark...`);
        const res = await main(...args);
        console.log(`Result: ${res}`);
    };
    await measureExecutionTime(func, args, resultsFile);
    console.log("");
}

async function runInteropBenchmark(benchmark) {
    if (benchmarkTypes.javascript_webassembly.baseline_enabled)
        await runInteropBenchmarkWithType(benchmark, BenchmarkTypeInterop.NOT_INSTRUMENTED);
    if (benchmarkTypes.javascript_webassembly.forward_enabled)
        await runInteropBenchmarkWithType(benchmark, BenchmarkTypeInterop.INSTRUMENTED_FORWARD_ANALYSIS);
    // await runInteropBenchmarkWithType(benchmark, BenchmarkTypeInterop.INSTRUMENTED_TAINT_ANALYSIS_JS);
    // await runInteropBenchmarkWithType(benchmark, BenchmarkTypeInterop.INSTRUMENTED_TAINT_ANALYSIS_WASM);
    if (benchmarkTypes.javascript_webassembly.taint_enabled)
        await runInteropBenchmarkWithType(benchmark, BenchmarkTypeInterop.INSTRUMENTED_TAINT_ANALYSIS_BOTH);
}

async function runInteropBenchmarkWithType(benchmark, benchmarkType) {
    const resultsFile = `./${benchmark.name}/js-rs/benchmark-results/results-${benchmarkType}.txt`;
    resetFile(resultsFile);

    const jsFile = `./${benchmark.name}/js-rs/js/js.js`;
    const instrumentedJsFile = `./${benchmark.name}/js-rs/js/instrumented/${benchmarkType}.js`;
    const instrumentedWasmFile = `./${benchmark.name}/js-rs/rs/instrumented/${benchmarkType}.wasm`;
    const absoluteInstrumentedWasmFile = fs.realpathSync(instrumentedWasmFile);
    const taintTracker = new TaintTracker(benchmarkInteropTypeToAnalysisType(benchmarkType));
    await instrumentJsCode(taintTracker, jsFile, instrumentedJsFile);
    const absoluteInstrumentedJsFile = fs.realpathSync(instrumentedJsFile);
    const requiresTaintImports = benchmarkType !== BenchmarkTypeInterop.NOT_INSTRUMENTED;
    const additionalImportObject = requiresTaintImports ? { taint: taintMethods } : {};
    const additionalImportObjectFillerFunction = requiresTaintImports ? fillTaintFunctions : undefined;
    const args = [
        absoluteInstrumentedWasmFile,
        benchmark.input,
        additionalImportObject,
        additionalImportObjectFillerFunction,
    ];
    const func = async () => {
        await taintTracker.runInstrumentedAnalysis(absoluteInstrumentedJsFile, args);
    };
    await measureExecutionTime(func, args, resultsFile);
    console.log("");
}

async function measureExecutionTime(func, args, outputFile) {
    const start = performance.now();
    try {
        await func(...args);
    } catch (error) {
        console.error("❌ Error during execution:", error);
        return;
    }
    const end = performance.now();
    const executionTime = end - start;
    console.log(`⌛️ Execution time: ${executionTime} ms`);
    fs.appendFileSync(outputFile, `${executionTime}\n`, (err) => {
        if (err) {
            console.error("Error writing to file:", err);
        }
    });
}

async function loadModuleDefaultFunction(file) {
    return import(file)
        .then((module) => {
            // Get the default export function
            const mainFunction = module.default;
            return mainFunction;
        })
        .catch((error) => {
            console.error("Error loading module:", error);
        });
}

async function resetFile(file) {
    fs.writeFileSync(file, "", (err) => {
        if (err) {
            console.error("Error writing to file:", err);
        }
    });
}

for (const benchmark of benchmarks) {
    const { name, input } = benchmark;
    console.log(`Running benchmark: \x1b[43m${name}\x1b[0m \x1b[33m(${input} input)\x1b[0m`);
    await runBenchmark(benchmark);
}
