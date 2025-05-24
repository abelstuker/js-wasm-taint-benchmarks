export const benchmarks = [
    // {
    //     name: "spectral-norm",
    //     iterations: 2,
    //     input: 100,
    // },
    // {
    //     name: "binary-trees",
    //     iterations: 2,
    //     input: 21,
    // },
    // {
    //     name: "mandelbrot",
    //     iterations: 1,
    //     input: 100,
    // },
    // {
    //     name: "fannkuch-redux",
    //     iterations: 2,
    //     input: 5,
    // },
    // {
    //     name: "n-body",
    //     iterations: 2,
    //     input: 500, // 2000,
    // },
    // {
    //     name: "fasta",
    //     iterations: 2,
    //     input: 500, //10000,
    // },
    // {
    //     name: "pi-digits",
    //     iterations: 2,
    //     input: 1000,
    // },
    {
        name: "reverse-complement",
        iterations: 2,
        input: 0,
    },
];

export const benchmarkTypes = {
    javascript: {
        enabled: false,
        baseline_enabled: true,
        forward_enabled: true,
        linvail_enabled: true,
        taint_enabled: true,
    },
    webassembly: {
        enabled: true,
        baseline_enabled: true,
        forward_enabled: true,
        shadow_enabled: true,
        taint_enabled: true,
    },
    javascript_webassembly: {
        enabled: true,
        forward_enabled: true,
        taint_enabled: true,
    },
};
