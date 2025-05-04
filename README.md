# Dynamic Taint Analysis Benchmarks

A collection of benchmark programs adapted from [The Computer Language Benchmarks Game](https://benchmarksgame-team.pages.debian.net/benchmarksgame/index.html) to test dynamic taint analysis across JavaScript, WebAssembly, and JS-WASM interoperation scenarios.

## Overview

This repository contains benchmark programs designed to evaluate the performance and accuracy of dynamic taint analysis tools. The benchmarks are organized into three categories:

-   **JavaScript-only**: Pure JavaScript implementations of benchmark algorithms
-   **WebAssembly-only**: Pure WebAssembly implementations of benchmark algorithms
-   **Interoperating JS-WASM**: Programs where JavaScript and WebAssembly components interact

Each benchmark has been adapted from The Computer Language Benchmarks Game.

## Repository Structure

```
benchmark-suite/
├── js/
│   ├── js.js                                               # Uninstrumented JavaScript code
│   ├── instrumented/
│   │   ├── not-instrumented.js                             # Copy of uninstrumented JS code
│   │   ├── instrumented-forward-analysis.js                # JS code instrumented with forward analysis
│   │   ├── instrumented-linvail.js                         # JS code instrumented with Linvail analysis
│   │   └── instrumented-taint-analysis.js                  # JS code instrumented with taint analysis
│   └── benchmark-results/
│       ├── results-not-instrumented.txt                    # Results for uninstrumented JS code
│       ├── results-instrumented-forward-analysis.txt       # Results for forward analysis instrumented JS
│       ├── results-instrumented-linvail.txt                # Results for Linvail analysis instrumented JS
│       └── results-instrumented-taint-analysis.txt         # Results for taint analysis instrumented JS
└── rs/
    ├── src/
    │   └── lib.rs                                          # Uninstrumented Rust source code
    ├── Cargo.toml                                          # Rust project configuration
    ├── instrumented/
    │   ├── not-instrumented.wasm                           # Compiled uninstrumented WASM code
    │   ├── instrumented-forward-analysis.wasm              # WASM code instrumented with forward analysis
    │   ├── instrumented-shadow-execution-analysis.wasm     # WASM code instrumented with shadow execution
    │   └── instrumented-taint-analysis.wasm                # WASM code instrumented with taint analysis
    └── benchmark-results/
        ├── results-not-instrumented.txt                    # Results for uninstrumented WASM code
        ├── results-instrumented-forward-analysis.txt       # Results for forward analysis instrumented WASM
        ├── results-instrumented-shadow-execution-analysis.txt # Results for shadow execution instrumented WASM
        └── results-instrumented-taint-analysis.txt         # Results for taint analysis instrumented WASM
```

## Included Benchmarks

The following benchmark problems from The Computer Language Benchmarks Game have been adapted:

-   [ ] N-body
-   [x] Binary Trees
-   [x] Fannkuch Redux
-   [x] Spectral Norm
-   [x] Mandelbrot
-   [x] Fasta
-   [ ] Reverse Complement
-   [ ] K-Nucleotide
-   [ ] Regex Redux

## Usage

### Running Benchmarks

First, configure the benchmarks you want to run, and their parameters, in `setup.js`.

```bash
node benchmarks.js
```

### Acknowledgments

Credits to Jacob Kreindl for the JavaScript programs used in this benchmark suite.
