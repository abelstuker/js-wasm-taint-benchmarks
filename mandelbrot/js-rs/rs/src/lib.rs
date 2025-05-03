// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
//
use std::sync::atomic::{AtomicBool, Ordering};

// #[link(wasm_import_module = "taint")]
// unsafe extern "C" {
//     fn taint_i32(val: i32) -> i32;
//     fn taint_i64(val: i64) -> i64;
//     fn taint_f32(val: f32) -> f32;
//     fn taint_f64(val: f64) -> f64;
//     fn sanitize_i32(val: i32) -> i32;
//     fn sanitize_i64(val: i64) -> i64;
//     fn sanitize_f32(val: f32) -> f32;
//     fn sanitize_f64(val: f64) -> f64;
//     fn assert_is_tainted_i32(val: i32);
//     fn assert_is_tainted_i64(val: i64);
//     fn assert_is_tainted_f32(val: f32);
//     fn assert_is_tainted_f64(val: f64);
//     fn assert_is_not_tainted_i32(val: i32);
//     fn assert_is_not_tainted_i64(val: i64);
//     fn assert_is_not_tainted_f32(val: f32);
//     fn assert_is_not_tainted_f64(val: f64);
//     fn check_is_tainted_i32(val: i32) -> bool;
//     fn check_is_tainted_i64(val: i64) -> bool;
//     fn check_is_tainted_f32(val: f32) -> bool;
//     fn check_is_tainted_f64(val: f64) -> bool;
//     fn js_log(value: f64);
// }

#[link(wasm_import_module = "js")]
unsafe extern "C" {
    fn do_loop(
        ziPtr: *mut f64,
        zrPtr: *mut f64,
        tiPtr: *mut f64,
        trPtr: *mut f64,
        ci: f64,
        cr: f64,
    );
}
// fn do_loop(body_data: &mut LoopBodyData) {
//     body_data.zi = 2.0 * body_data.zr * body_data.zi + body_data.ci;
//     body_data.zr = body_data.tr - body_data.ti + body_data.cr;
//     body_data.tr = body_data.zr * body_data.zr;
//     body_data.ti = body_data.zi * body_data.zi;
// }

struct LoopBodyData {
    zi: f64,
    zr: f64,
    ti: f64,
    tr: f64,
    ci: f64,
    cr: f64,
}

impl LoopBodyData {
    fn new() -> Self {
        LoopBodyData {
            zi: 0.0,
            zr: 0.0,
            ti: 0.0,
            tr: 0.0,
            ci: 0.0,
            cr: 0.0,
        }
    }
}

fn should_do_loop(i: i32, body_data: &LoopBodyData, limit: f64) -> bool {
    if i >= 50 {
        return false;
    }

    if body_data.tr + body_data.ti > limit * limit {
        return false;
    }

    true
}

fn mandelbrot(n: i32) -> i32 {
    let mut bit_num = 0;
    let mut byte_acc = 0;
    let limit = 2.0;

    let w = n;
    let h = n;

    let mut result = 0;

    for y in 0..h {
        for x in 0..w {
            let mut body_data = LoopBodyData::new();
            body_data.zi = 0.0; //unsafe { taint_f64(0.0) };
            body_data.cr = (2.0 * x as f64) / w as f64 - 1.5;
            body_data.ci = (2.0 * y as f64) / h as f64 - 1.0;

            let mut i = 0;
            while should_do_loop(i, &body_data, limit) {
                unsafe {
                    do_loop(
                        &mut body_data.zi,
                        &mut body_data.zr,
                        &mut body_data.ti,
                        &mut body_data.tr,
                        body_data.ci,
                        body_data.cr,
                    )
                };
                i += 1;
            }

            byte_acc <<= 1;
            if body_data.tr + body_data.ti <= limit * limit {
                byte_acc |= 0x01;
                // if unsafe { check_is_tainted_f64(body_data.tr) } {
                //     if unsafe { check_is_tainted_i32(n) } {
                //         byte_acc = unsafe { taint_i32(byte_acc) };
                //     }
                // }
            }

            bit_num += 1;

            if bit_num == 8 {
                // In the original code this would output the byte
                result += byte_acc;
                byte_acc = 0;
                bit_num = 0;
            } else if x == w - 1 {
                byte_acc <<= 8 - (w % 8) as i32;
                // In the original code this would output the byte
                result += byte_acc;
                byte_acc = 0;
                bit_num = 0;
            }
        }
    }

    result
}

fn benchmark(n: i32) -> i32 {
    let mut sum = 0;
    for i in 0..10 {
        let mut n_value = n;
        if i & 0x11 != 0 {
            n_value = n; //unsafe { taint_i32(n) };
        }
        sum += mandelbrot(n_value);
    }
    // unsafe { assert_is_tainted_i32(sum) };
    // sum = unsafe { sanitize_i32(sum) };
    sum
}

fn get_expected_result() -> i32 {
    20213330
}

#[unsafe(no_mangle)]
fn main(n: i32) -> i32 {
    let result = benchmark(n);
    // println!("Result: {}", result);
    let expected = get_expected_result();
    // println!("Expected: {}", expected);
    // assert_eq!(result, expected);
    result
}
