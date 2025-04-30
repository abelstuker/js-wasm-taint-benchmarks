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
import { ANALYSIS_TYPES } from "../aran-taint-analysis/utils/config.js";
import { fillTaintFunctions, taintMethods } from "./setup.js";
const benchmarks = ["spectral-norm"];

const BenchmarkTypeJs = {
    NOT_INSTRUMENTED: "not-instrumented",
    INSTRUMENTED_FORWARD_ANALYSIS: "instrumented-forward-analysis",
    INSTRUMENTED_LINVAIL: "instrumented-linvail",
    INSTRUMENTED_TAINT_ANALYSIS: "instrumented-taint-analysis",
};
const benchmarkTypeToAnalysisType = (benchmarkTypeJs) => {
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

export default async function runBenchmark(benchmarkName) {
    await runWasmBenchmark(benchmarkName);
    await runJsBenchmark(benchmarkName);
    // runInteropBenchmark(benchmarkName);
}

async function runJsBenchmark(benchmarkName) {
    await runJsBenchmarkWithType(benchmarkName, BenchmarkTypeJs.NOT_INSTRUMENTED);
    await runJsBenchmarkWithType(benchmarkName, BenchmarkTypeJs.INSTRUMENTED_FORWARD_ANALYSIS);
    await runJsBenchmarkWithType(benchmarkName, BenchmarkTypeJs.INSTRUMENTED_LINVAIL);
    await runJsBenchmarkWithType(benchmarkName, BenchmarkTypeJs.INSTRUMENTED_TAINT_ANALYSIS);
}

async function runJsBenchmarkWithType(benchmarkName, benchmarkType) {
    const resultsFile = `./${benchmarkName}/js/benchmark-results/results-${benchmarkType}.txt`;
    resetFile(resultsFile);
    const taintTracker = new TaintTracker(benchmarkTypeToAnalysisType(benchmarkType));
    const file = await instrumentJsCode(benchmarkName, benchmarkType, taintTracker);
    const absoluteFilePath = fs.realpathSync(file);
    const args = [100];
    const func = async () => {
        await taintTracker.runInstrumentedAnalysis(absoluteFilePath, args);
    };
    await measureExecutionTime(func, args, resultsFile);
    console.log("\n");
}

async function instrumentJsCode(benchmarkName, benchmarkType, taintTracker) {
    const inputFile = `./${benchmarkName}/js/js.js`;
    const outputFile = `./${benchmarkName}/js/instrumented/${benchmarkType}.js`;

    await taintTracker.analyze(inputFile, outputFile);

    return outputFile;
}

async function runWasmBenchmark(benchmarkName) {
    await runWasmBenchmarkWithType(benchmarkName, BenchmarkTypeWasm.NOT_INSTRUMENTED);
    await runWasmBenchmarkWithType(benchmarkName, BenchmarkTypeWasm.INSTRUMENTED_FORWARD_ANALYSIS);
    await runWasmBenchmarkWithType(benchmarkName, BenchmarkTypeWasm.INSTRUMENTED_SHADOW_EXECUTION_ANALYSIS);
    await runWasmBenchmarkWithType(benchmarkName, BenchmarkTypeWasm.INSTRUMENTED_TAINT_ANALYSIS);
}

async function runWasmBenchmarkWithType(benchmarkName, benchmarkType) {
    const resultsFile = `./${benchmarkName}/rs/benchmark-results/results-${benchmarkType}.txt`;
    resetFile(resultsFile);

    const wasmFilePath = `./${benchmarkName}/rs/instrumented/${benchmarkType}.wasm`;
    const absoluteFilePath = fs.realpathSync(wasmFilePath);
    const wasmBuffer = fs.readFileSync(wasmFilePath);
    const requiresTaintImports = benchmarkType !== BenchmarkTypeWasm.NOT_INSTRUMENTED;
    const importObject = {};
    if (requiresTaintImports) {
        importObject.taint = taintMethods;
    }
    const wasmModule = await WebAssembly.instantiate(wasmBuffer, importObject);

    if (requiresTaintImports) {
        fillTaintFunctions(wasmModule.instance.exports);
    }

    const main = wasmModule.instance.exports.main;
    if (typeof main !== "function") {
        console.error(`Error: Wasm module ${wasmFilePath} does not export a 'main' function.`);
        return;
    }

    const args = [1000];
    const func = async () => {
        await main(...args);
    };
    await measureExecutionTime(func, args, resultsFile);
    console.log("\n");
}

async function measureExecutionTime(func, args, outputFile) {
    const start = performance.now();
    await func(...args);
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

runBenchmark(benchmarks[0]);
