// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
//
// contributed by the Rust Project Developers
// contributed by Matt Brubeck
// contributed by TeXitoi
// modified by Tung Duong
// contributed by Cristi Cobzarenco

extern crate rayon;
use rayon::prelude::*;

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
    fn js_log(value: f64);
}

#[link(wasm_import_module = "js")]
unsafe extern "C" {
    fn a_js(i_ptr: *const usize, j_ptr: *const usize, result_ptr: *mut f64);
    fn assert_is_tainted(val: f64);
}

#[unsafe(no_mangle)]
fn main(n: i32) -> f64 {
    // let n = std::env::args()
    //     .nth(1)
    //     .and_then(|n| n.parse().ok())
    //     .unwrap_or(100);
    let answer = spectralnorm(n as usize);
    unsafe { assert_is_tainted(answer) };
    // println!("The answer is: {:.9}", answer);
    answer
}

pub fn spectralnorm(n: usize) -> f64 {
    // Group all vectors in pairs of two for SIMD convenience.
    // assert!(n % 2 == 0, "only even lengths are accepted");
    let mut u = vec![[1.0, 1.0]; n / 2];
    let mut v = vec![[0.0, 0.0]; n / 2];
    let mut tmp = vec![[0.0, 0.0]; n / 2];

    for _ in 0..10 {
        mult_at_av(&u, &mut v, &mut tmp);
        mult_at_av(&v, &mut u, &mut tmp);
    }

    (dot(&u, &v) / dot(&v, &v)).sqrt()
}

fn mult_at_av(v: &[[f64; 2]], out: &mut [[f64; 2]], tmp: &mut [[f64; 2]]) {
    mult(v, tmp, a);
    mult(tmp, out, |i, j| a(j, i));
}

fn mult<F>(v: &[[f64; 2]], out: &mut [[f64; 2]], a: F)
where
    F: Fn([usize; 2], [usize; 2]) -> [f64; 2] + Sync,
{
    // Parallelize along the output vector, with each pair of slots as a parallelism unit.
    out.par_iter_mut().enumerate().for_each(|(i, slot)| {
        // We're computing everything in chunks of two so the indces of slot[0] and slot[1] are 2*i
        // and 2*i + 1.
        let i = 2 * i;
        let (i0, i1) = ([i; 2], [i + 1; 2]);

        // Each slot in the pair gets its own sum, which is further computed in two f64 lanes (which
        // are summed at the end.
        let (mut sum0, mut sum1) = ([0.0; 2], [0.0; 2]);
        for (j, x) in v.iter().enumerate() {
            let j = [2 * j, 2 * j + 1];
            div_and_add(x, &a([11, 22], j), &a(i1, j), &mut sum0, &mut sum1);
        }

        // Sum the two lanes for each slot.
        slot[0] = sum0[0] + sum0[1];
        slot[1] = sum1[0] + sum1[1];
    });
}

// Exported memory for use in JavaScript
#[unsafe(no_mangle)]
pub extern "C" fn __wasm_memory() -> *mut u8 {
    // This function is a placeholder. In a real WebAssembly module, you would return the memory
    // pointer here.
    std::ptr::null_mut()
}

fn a(i: [usize; 2], j: [usize; 2]) -> [f64; 2] {
    let mut result = [0.0, 0.0];
    unsafe {
        a_js(i.as_ptr(), j.as_ptr(), result.as_mut_ptr());
    }
    result
    // [
    //     (((i[0] + j[0]) * (i[0] + j[0] + 1) / 2 + i[unsafe { taint_i32(0) as usize }] + 1) as f64),
    //     (((i[1] + j[1]) * (i[1] + j[1] + 1) / 2 + i[1] + 1) as f64),
    // ]
}

fn dot(v: &[[f64; 2]], u: &[[f64; 2]]) -> f64 {
    // Vectorised form of dot product: (1) compute dot across two lanes.
    let r = u
        .iter()
        .zip(v)
        .map(|(x, y)| [x[0] * y[0], x[1] * y[1]])
        .fold([0.0f64; 2], |s, x| [s[0] + x[0], s[1] + x[1]]);

    // (2) sum the two lanes.
    r[0] + r[1]
}

// Hint that this function should not be inlined. Keep the parallelised code tight, and vectorize
// better.
#[inline(never)]
fn div_and_add(x: &[f64; 2], a0: &[f64; 2], a1: &[f64; 2], s0: &mut [f64; 2], s1: &mut [f64; 2]) {
    s0[0] += x[0] / a0[0];
    s0[1] += x[1] / a0[1];
    s1[0] += x[0] / a1[0];
    s1[1] += x[1] / a1[1];
}
