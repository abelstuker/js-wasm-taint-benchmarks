export const benchmarks = [
    {
        name: "spectral-norm",
        iterations: 100,
    },
];

export const throwNotImplementedError = (name) => {
    return () => {
        throw new Error(`${name} not implemented`);
    };
};

export const TaintImport = {
    taint_i32: throwNotImplementedError("taint_i32"),
    taint_i64: throwNotImplementedError("taint_i64"),
    taint_f32: throwNotImplementedError("taint_f32"),
    taint_f64: throwNotImplementedError("taint_f64"),
    sanitize_i32: throwNotImplementedError("sanitize_i32"),
    sanitize_i64: throwNotImplementedError("sanitize_i64"),
    sanitize_f32: throwNotImplementedError("sanitize_f32"),
    sanitize_f64: throwNotImplementedError("sanitize_f64"),
    assert_is_tainted_i32: throwNotImplementedError("assert_is_tainted_i32"),
    assert_is_tainted_i64: throwNotImplementedError("assert_is_tainted_i64"),
    assert_is_tainted_f32: throwNotImplementedError("assert_is_tainted_f32"),
    assert_is_tainted_f64: throwNotImplementedError("assert_is_tainted_f64"),
    assert_is_not_tainted_i32: throwNotImplementedError("assert_is_not_tainted_i32"),
    assert_is_not_tainted_i64: throwNotImplementedError("assert_is_not_tainted_i64"),
    assert_is_not_tainted_f32: throwNotImplementedError("assert_is_not_tainted_f32"),
    assert_is_not_tainted_f64: throwNotImplementedError("assert_is_not_tainted_f64"),
    js_log: throwNotImplementedError("js_log"),
};

export function fillTaintFunctions(wasmExports) {
    const { prepare_for_result_taints, set_result_taint, get_argument_taint } = wasmExports;
    TaintImport.taint_i32 = (val) => {
        if (prepare_for_result_taints && set_result_taint) {
            prepare_for_result_taints(1);
            set_result_taint(0, 1);
        } else {
            return val;
        }
    };
    TaintImport.assert_is_tainted_f64 = (val) => {
        if (get_argument_taint && prepare_for_result_taints && set_result_taint) {
            const taint = get_argument_taint(0);
            if (taint !== 1) {
                throw new Error("Value is not tainted");
            }
            prepare_for_result_taints(1);
            set_result_taint(0, taint);
        }
        return val;
    };
    TaintImport.js_log = (val) => {
        const taint = (get_argument_taint && get_argument_taint(0)) || -1;
        console.log("Value:", val, "is tainted:", get_argument_taint ? taint === 1 : "n/a");
    };
}

export const taintMethods = Object.keys(TaintImport).reduce((methods, key) => {
    methods[key] = (...args) => TaintImport[key](...args);
    return methods;
}, {});

export default function setup() {
    globalThis.taintSetup = {
        fillTaintFunctions,
        taintMethods,
        throwNotImplementedError,
    };
}
