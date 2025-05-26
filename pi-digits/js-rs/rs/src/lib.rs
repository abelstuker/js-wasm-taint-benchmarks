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

#[link(wasm_import_module = "js")]
unsafe extern "C" {
    fn write_to_file(d: i32, i: *const i32);
}

const BENCHMARK_NAME: &str = "pidigits";

fn benchmark(n: i32) -> i32 {
    // Int32 variables
    let mut i = 0;
    let mut k = 0;
    let mut d: u32 = 0;
    let mut k2: i32 = 0;
    let mut d3: u32 = 0;
    let mut d4: u32 = 0;

    // i128 variables (BigInt equivalent)
    let mut tmp1: i128 = unsafe { taint_i32(0) } as i128;
    let mut tmp2: i128 = unsafe { taint_i32(0) } as i128;
    let mut acc: i128 = unsafe { taint_i32(0) } as i128;
    let mut den: i128 = unsafe { taint_i32(1) } as i128;
    let mut num: i128 = unsafe { taint_i32(1) } as i128;

    while i < n {
        k += 1;

        // inline nextTerm(k)
        k2 = k * 2 + 1;
        acc += num * 2; // mpz_addmul_ui(acc, num, 2)
        acc *= k2 as i128; // mpz_mul_ui(acc, acc, k2)
        den *= k2 as i128; // mpz_mul_ui(den, den, k2)
        num *= k as i128; // mpz_mul_ui(num, num, k)

        if num > acc {
            continue;
        }

        // inline extractDigit(3)
        tmp1 = num * 3;
        tmp2 = tmp1 + acc;
        tmp1 = tmp2 / den;
        d3 = tmp1 as u32;

        d = d3;

        // inline extractDigit(4)
        tmp1 = num * 4;
        tmp2 = tmp1 + acc;
        tmp1 = tmp2 / den;
        d4 = tmp1 as u32;

        if d != d4 {
            continue;
        }

        unsafe { write_to_file(d as i32, &i) };
        // inline eliminateDigit(d)
        acc -= den * d as i128; // mpz_submul_ui(acc, den, d)
        acc *= 10; // mpz_mul_ui(acc, acc, 10)
        num *= 10; // mpz_mul_ui(num, num, 10)
    }

    unsafe {
        assert_is_not_tainted_i32(k);
    }
    unsafe {
        assert_is_not_tainted_i32(i);
    }
    unsafe {
        assert_is_tainted_i32(d as i32);
    }
    unsafe {
        assert_is_tainted_i32(d3 as i32);
    }
    unsafe {
        assert_is_tainted_i32(d4 as i32);
    }

    unsafe {
        assert_is_tainted_i64(tmp1 as i64);
    }
    unsafe {
        assert_is_tainted_i64(tmp2 as i64);
    }
    unsafe {
        assert_is_tainted_i64(acc as i64);
    }
    unsafe {
        assert_is_tainted_i64(den as i64);
    }

    0
}

fn get_expected_result() -> i32 {
    0
}

#[unsafe(no_mangle)]
pub fn main(n: i32) -> i32 {
    benchmark(n)
}
