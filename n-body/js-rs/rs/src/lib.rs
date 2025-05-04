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
    fn advanceSingle(
        x1: f64,
        y1: f64,
        z1: f64,
        x2: f64,
        y2: f64,
        z2: f64,
        vx1: &mut f64,
        vy1: &mut f64,
        vz1: &mut f64,
        vx2: &mut f64,
        vy2: &mut f64,
        vz2: &mut f64,
        mass1: &mut f64,
        mass2: &mut f64,
        dt: f64,
    );
}

const BENCHMARK_NAME: &str = "n-body";
const BODIES_COUNT: usize = 5;

// Solar system bodies
const SUN: usize = 0;
const JUPITER: usize = 1;
const SATURN: usize = 2;
const URANUS: usize = 3;
const NEPTUNE: usize = 4;

struct Body {
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mass: f64,
}

struct NBodySystem {
    bodies: Vec<Body>,
    solar_mass: f64,
}

impl NBodySystem {
    fn new() -> Self {
        let pi = 3.141592653589793;
        let solar_mass = 4.0 * pi * pi;
        let days_per_year = 365.24;

        let mut bodies = vec![
            // Sun
            Body {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                vx: 0.0,
                vy: 0.0,
                vz: 0.0,
                mass: solar_mass,
            },
            // Jupiter
            Body {
                x: 4.8414314424647209,
                y: -1.16032004402742839,
                z: -1.03622044471123109e-1,
                vx: 1.66007664274403694e-3 * days_per_year,
                vy: 7.69901118419740425e-3 * days_per_year,
                vz: -6.90460016972063023e-5 * days_per_year,
                mass: 9.54791938424326609e-4 * solar_mass,
            },
            // Saturn
            Body {
                x: 8.34336671824457987,
                y: 4.12479856412430479,
                z: -4.03523417114321381e-1,
                vx: -2.76742510726862411e-3 * days_per_year,
                vy: 4.99852801234917238e-3 * days_per_year,
                vz: 2.30417297573763929e-5 * days_per_year,
                mass: 2.85885980666130812e-4 * solar_mass,
            },
            // Uranus
            Body {
                x: 1.2894369562139131e1,
                y: -1.51111514016986312e1,
                z: -2.23307578892655734e-1,
                vx: 2.96460137564761618e-3 * days_per_year,
                vy: 2.3784717395948095e-3 * days_per_year,
                vz: -2.96589568540237556e-5 * days_per_year,
                mass: 4.36624404335156298e-5 * solar_mass,
            },
            // Neptune
            Body {
                x: 1.53796971148509165e1,
                y: -2.59193146099879641e1,
                z: 1.79258772950371181e-1,
                vx: 2.68067772490389322e-3 * days_per_year,
                vy: 1.62824170038242295e-3 * days_per_year,
                vz: -9.5159225451971587e-5 * days_per_year,
                mass: 5.15138902046611451e-5 * solar_mass,
            },
        ];

        let system = NBodySystem { bodies, solar_mass };

        system
    }

    fn offset_momentum(&mut self) {
        let mut px = 0.0;
        let mut py = 0.0;
        let mut pz = 0.0;

        for body in &self.bodies {
            px += body.vx * body.mass;
            py += body.vy * body.mass;
            pz += body.vz * body.mass;
        }

        self.bodies[SUN].vx = -px / self.solar_mass;
        self.bodies[SUN].vy = -py / self.solar_mass;
        self.bodies[SUN].vz = -pz / self.solar_mass;
    }

    fn advance(&mut self, dt: f64) {
        for i in 0..BODIES_COUNT {
            // let x1 = self.bodies[i].x;
            // let y1 = self.bodies[i].y;
            // let z1 = self.bodies[i].z;

            for j in (i + 1)..BODIES_COUNT {
                let (left, right) = self.bodies.split_at_mut(j);
                let body_i = &mut left[i];
                let body_j = &mut right[0];

                unsafe {
                    advanceSingle(
                        body_i.x,
                        body_i.y,
                        body_i.z,
                        body_j.x,
                        body_j.y,
                        body_j.z,
                        &mut body_i.vx,
                        &mut body_i.vy,
                        &mut body_i.vz,
                        &mut body_j.vx,
                        &mut body_j.vy,
                        &mut body_j.vz,
                        &mut body_i.mass,
                        &mut body_j.mass,
                        dt,
                    )
                };
                // let dx = x1 - self.bodies[j].x;
                // let dy = y1 - self.bodies[j].y;
                // let dz = z1 - self.bodies[j].z;

                // let mut r = dx * dx + dy * dy + dz * dz;
                // r = r.sqrt();
                // let mag = dt / (r * r * r);

                // let mass_j = self.bodies[j].mass;
                // let mass_i = self.bodies[i].mass;

                // // For body i
                // self.bodies[i].vx -= dx * mass_j * mag;
                // self.bodies[i].vy -= dy * mass_j * mag;
                // self.bodies[i].vz -= dz * mass_j * mag;

                // // For body j
                // self.bodies[j].vx += dx * mass_i * mag;
                // self.bodies[j].vy += dy * mass_i * mag;
                // self.bodies[j].vz += dz * mass_i * mag;
            }
        }

        // Update positions
        for body in &mut self.bodies {
            body.x += dt * body.vx;
            body.y += dt * body.vy;
            body.z += dt * body.vz;
        }
    }

    fn energy(&self) -> f64 {
        let mut e = 0.0;

        for i in 0..BODIES_COUNT {
            // Kinetic energy
            let body_i = &self.bodies[i];
            e += 0.5
                * body_i.mass
                * (body_i.vx * body_i.vx + body_i.vy * body_i.vy + body_i.vz * body_i.vz);

            // Potential energy with respect to other bodies
            for j in (i + 1)..BODIES_COUNT {
                let body_j = &self.bodies[j];
                let dx = body_i.x - body_j.x;
                let dy = body_i.y - body_j.y;
                let dz = body_i.z - body_j.z;
                let distance = (dx * dx + dy * dy + dz * dz).sqrt();
                e -= (body_i.mass * body_j.mass) / distance;
            }
        }

        e
    }
}

fn benchmark(n: usize) -> f64 {
    let mut system = NBodySystem::new();
    system.offset_momentum();

    for _ in 0..=n {
        system.advance(0.01);
    }

    system.energy()
}

fn get_expected_result() -> f64 {
    -0.16902646009754382
}

#[unsafe(no_mangle)]
fn main(n: i32) -> f64 {
    benchmark(n as usize)
}
