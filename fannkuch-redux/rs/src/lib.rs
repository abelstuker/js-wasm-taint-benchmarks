// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
//
use std::sync::atomic::{AtomicBool, Ordering};

#[link(wasm_import_module = "taint")]
unsafe extern "C" {
    fn taint_i32(val: i32) -> i32;
    fn taint_i64(val: i64) -> i64;
    fn taint_f32(val: f32) -> f32;
    fn taint_f64(val: f64) -> f64;
    fn sanitize_i32(val: i32) -> i32;
    fn sanitize_i64(val: i64) -> i64;
    fn sanitize_f32(val: f32) -> f32;
    fn sanitize_f64(val: f64) -> f64;
    fn assert_is_tainted_i32(val: i32);
    fn assert_is_tainted_i64(val: i64);
    fn assert_is_tainted_f32(val: f32);
    fn assert_is_tainted_f64(val: f64);
    fn assert_is_not_tainted_i32(val: i32);
    fn assert_is_not_tainted_i64(val: i64);
    fn assert_is_not_tainted_f32(val: f32);
    fn assert_is_not_tainted_f64(val: f64);
    fn check_is_tainted_i32(val: i32) -> bool;
    fn check_is_tainted_i64(val: i64) -> bool;
    fn check_is_tainted_f32(val: f32) -> bool;
    fn check_is_tainted_f64(val: f64) -> bool;
    fn js_log(value: f64);
}
// Fannkuch Redux benchmark in Rust
// Converted from JavaScript version

fn max(a: i32, b: i32) -> i32 {
    if a > b {
        a
    } else {
        b
    }
}

fn fannkuch_redux(n: usize) -> i32 {
    let mut perm: Vec<i32> = vec![0; n];
    let mut perm1: Vec<i32> = (0..n as i32).collect();
    let mut count: Vec<usize> = vec![0; n];
    let mut max_flips_count = 0;
    let mut perm_count = 0;
    let mut checksum = 0;

    let mut r = n;

    for i in (0..n).step_by(3) {
        perm1[i] = unsafe { taint_i32(perm1[i]) };
    }

    loop {
        while r != 1 {
            count[r - 1] = r;
            r -= 1;
        }

        for i in 0..n {
            perm[i] = perm1[i];
        }

        let mut flips_count = unsafe { taint_i32(0) };

        loop {
            let k = perm[0];
            if k == 0 {
                break;
            }

            let k2 = (k + 1) >> 1;
            for i in 0..k2 as usize {
                let temp = perm[i];
                perm[i] = perm[k as usize - i];
                perm[k as usize - i] = temp;
            }
            flips_count += 1;
            unsafe { assert_is_tainted_i32(flips_count) };
        }

        max_flips_count = max(max_flips_count, flips_count);
        if perm_count % 2 == 0 {
            checksum += flips_count;
        } else {
            checksum -= flips_count;
        }

        if (max_flips_count == flips_count) {
            unsafe { assert_is_tainted_i32(checksum) };
        }

        loop {
            // /// Log the taints of all perm1 elements
            // perm1.iter().enumerate().for_each(|(idx, &x)| {
            //     let t = unsafe { check_is_tainted_i32(x) };
            //     unsafe { js_log(if t { 1.0 } else { 0.0 }) };
            // });

            if r == n {
                for idx in (0..n).step_by(3) {
                    unsafe { assert_is_tainted_i32(perm1[idx]) };
                }
                // for idx in (1..n).step_by(3) {
                //     unsafe { assert_is_not_tainted_i32(perm1[idx]) };
                // }
                // for idx in (2..n).step_by(3) {
                //     unsafe { assert_is_not_tainted_i32(perm1[idx]) };
                // }
                return unsafe { sanitize_i32(max_flips_count) };
            }

            let perm0 = perm1[0];
            let mut i = 0;
            while i < r {
                let j = i + 1;
                perm1[i] = perm1[j];
                i = j;
            }
            perm1[r] = perm0;
            let perm10_tainted: bool = unsafe { check_is_tainted_i32(perm0) };
            count[r] -= 1;
            if count[r] > 0 {
                break;
            }
            r += 1;
        }
        perm_count += 1;
    }
}

fn benchmark(n: i32) -> i32 {
    fannkuch_redux(n as usize)
}

fn get_expected_result() -> i32 {
    38
}
#[unsafe(no_mangle)]
fn main(n: i32) -> i32 {
    benchmark(n)
}
