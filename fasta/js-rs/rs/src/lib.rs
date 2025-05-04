// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
//
use std::io::{self, Write};
use std::mem::{self, offset_of};
use std::sync::atomic::{AtomicBool, Ordering};

// #[link(wasm_import_module = "taint")]
// unsafe extern "C" {
//     fn taint_char(val: char) -> char;
//     fn taint_i32(val: i32) -> i32;
//     fn taint_i64(val: i64) -> i64;
//     fn taint_f32(val: f32) -> f32;
//     fn taint_f64(val: f64) -> f64;
//     fn sanitize_char(val: char) -> char;
//     fn sanitize_i32(val: i32) -> i32;
//     fn sanitize_i64(val: i64) -> i64;
//     fn sanitize_f32(val: f32) -> f32;
//     fn sanitize_f64(val: f64) -> f64;
//     fn assert_is_tainted_char(val: char) -> char;
//     fn assert_is_tainted_i32(val: i32);
//     fn assert_is_tainted_i64(val: i64);
//     fn assert_is_tainted_f32(val: f32);
//     fn assert_is_tainted_f64(val: f64);
//     fn assert_is_not_tainted_char(val: char) -> char;
//     fn assert_is_not_tainted_i32(val: i32);
//     fn assert_is_not_tainted_i64(val: i64);
//     fn assert_is_not_tainted_f32(val: f32);
//     fn assert_is_not_tainted_f64(val: f64);
//     fn check_is_tainted_char(val: char) -> bool;
//     fn check_is_tainted_i32(val: i32) -> bool;
//     fn check_is_tainted_i64(val: i64) -> bool;
//     fn check_is_tainted_f32(val: f32) -> bool;
//     fn check_is_tainted_f64(val: f64) -> bool;
//     fn js_log(value: f64);
// }

struct AminoAcid {
    c: char,
    p: f64,
}

fn write_fasta_header(id: &str, desc: &str) {
    println!(">{} {}", id, desc);
}

fn write_fasta(s: &[char], from: usize) {
    let mut stdout = io::stdout().lock();

    for i in from..s.len() {
        let ch = s[i];

        if ch == 'G' || ch == 'T' {
            stdout.write_all(&[ch as u8]).unwrap();
            continue;
        }

        if ch == 'g' || ch == 't' {
            stdout.write_all(&[ch as u8]).unwrap();
            continue;
        }

        if ch == '\n' {
            stdout.write_all(b"\n").unwrap();
            return;
        }

        stdout.write_all(&[ch as u8]).unwrap();
    }
    stdout.write_all(b"\n").unwrap();
}

struct Random {
    last: u32,
}

impl Random {
    fn new() -> Self {
        Self { last: 42 }
    }
}

fn make_cumulative(gene_list: &mut [AminoAcid]) {
    let mut cp = 0.0;

    for gene in gene_list.iter_mut() {
        cp += gene.p;
        gene.p = cp;
    }
}

#[link(wasm_import_module = "js")]
unsafe extern "C" {
    fn selectRandom(
        rng: *const Random,
        gene_list: *const AminoAcid,
        gene_list_len: usize,
        amino_acid_size: usize, // size in bytes
        c_offset: usize,        // offset in bytes
        p_offset: usize,        // offset in bytes
    ) -> char;
    // fn js_log(value: f64);
}

fn make_random_fasta(rng: &mut Random, id: &str, desc: &str, gene_list: &[AminoAcid], n: usize) {
    const LINE_LENGTH: usize = 60;
    let mut todo = n;

    write_fasta_header(id, desc);

    while todo > 0 {
        let m = std::cmp::min(todo, LINE_LENGTH);
        let mut pick = vec!['\0'; m + 1];

        for i in 0..m {
            pick[i] = unsafe {
                selectRandom(
                    rng,
                    gene_list.as_ptr(),
                    gene_list.len(),
                    mem::size_of::<AminoAcid>(),
                    offset_of!(AminoAcid, c),
                    offset_of!(AminoAcid, p),
                )
            };
            // pick[i] = select_random(rng, gene_list);
        }

        write_fasta(&pick, 0);
        todo -= m;
    }
}

fn make_repeat_fasta(id: &str, desc: &str, s: &[char], n: usize) {
    const LINE_LENGTH: usize = 60;
    let mut todo = n;
    let mut k = 0;
    let kn = s.len();

    write_fasta_header(id, desc);

    while todo > 0 {
        let mut m = std::cmp::min(todo, LINE_LENGTH);

        if m >= kn - k {
            write_fasta(s, k);
            m -= kn - k;
            k = 0;

            while m >= kn {
                write_fasta(s, 0);
                m -= kn;
            }
        }

        if m > 0 {
            let mut ss = s.to_vec();
            write_fasta(&ss, k);
            k += m;
        }

        todo -= std::cmp::min(todo, LINE_LENGTH);
    }
}

fn setup_base_data() -> (Vec<AminoAcid>, Vec<AminoAcid>, Vec<char>) {
    let mut homosapiens = vec![
        AminoAcid {
            c: 'a',
            p: 0.302954942668,
        },
        AminoAcid {
            c: 'c',
            p: 0.1979883004921,
        },
        AminoAcid {
            c: 'g',
            p: 0.1975473066391,
        },
        AminoAcid {
            c: 't',
            p: 0.3015094502008,
        },
    ];

    let mut iub = vec![
        AminoAcid { c: 'a', p: 0.27 },
        AminoAcid { c: 'c', p: 0.12 },
        AminoAcid { c: 'g', p: 0.12 },
        AminoAcid { c: 't', p: 0.27 },
        AminoAcid { c: 'B', p: 0.02 },
        AminoAcid { c: 'D', p: 0.02 },
        AminoAcid { c: 'H', p: 0.02 },
        AminoAcid { c: 'K', p: 0.02 },
        AminoAcid { c: 'M', p: 0.02 },
        AminoAcid { c: 'N', p: 0.02 },
        AminoAcid { c: 'R', p: 0.02 },
        AminoAcid { c: 'S', p: 0.02 },
        AminoAcid { c: 'V', p: 0.02 },
        AminoAcid { c: 'W', p: 0.02 },
        AminoAcid { c: 'Y', p: 0.02 },
    ];

    let alu_init = "GGCCGGGCGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGG\
                   GAGGCCGAGGCGGGCGGATCACCTGAGGTCAGGAGTTCGAGA\
                   CCAGCCTGGCCAACATGGTGAAACCCCGTCTCTACTAAAAAT\
                   ACAAAAATTAGCCGGGCGTGGTGGCGCGCGCCTGTAATCCCA\
                   GCTACTCGGGAGGCTGAGGCAGGAGAATCGCTTGAACCCGGG\
                   AGGCGGAGGTTGCAGTGAGCCGAGATCGCGCCACTGCACTCC\
                   AGCCTGGGCGACAGAGCGAGACTCCGTCTCAAAAA";

    let mut alu = Vec::with_capacity(alu_init.len());
    for ch in alu_init.chars() {
        if ch == 'G' {
            alu.push('G');
        } else if ch == 'T' {
            alu.push('T');
        } else {
            alu.push(ch);
        }
    }

    (homosapiens, iub, alu)
}

fn benchmark(n: usize) -> i32 {
    let (mut homosapiens, mut iub, alu) = setup_base_data();
    let mut rng = Random::new();

    make_cumulative(&mut iub);
    make_cumulative(&mut homosapiens);

    make_repeat_fasta("ONE", "Homo sapiens alu", &alu, n * 2);
    make_random_fasta(&mut rng, "TWO", "IUB ambiguity codes", &iub, n * 3);
    make_random_fasta(
        &mut rng,
        "THREE",
        "Homo sapiens frequency",
        &homosapiens,
        n * 5,
    );

    0
}

#[unsafe(no_mangle)]
fn main(n: i32) -> i32 {
    let result = benchmark(n as usize);
    // assert_eq!(result, 0);
    result
}
