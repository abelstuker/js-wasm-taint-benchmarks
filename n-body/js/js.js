// adapted from https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/fannkuchredux-clang-1.html
// by Jacob Kreindl https://github.com/jkreindl/taint-benchmarks

// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
//
// contributed by Shakhno DV, Shakhno AV

const benchmarkName = "n-body";

const Taint = globalThis.Taint;

var solar_mass;

var x = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_x(nBody) {
    return x[nBody];
}

function set_x(nBody, value) {
    x[nBody] = value;
}

var y = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_y(nBody) {
    return y[nBody];
}

function set_y(nBody, value) {
    y[nBody] = value;
}

var z = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_z(nBody) {
    return z[nBody];
}

function set_z(nBody, value) {
    z[nBody] = value;
}

var vx = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_vx(nBody) {
    return vx[nBody];
}

function set_vx(nBody, value) {
    vx[nBody] = value;
}

var vy = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_vy(nBody) {
    return vy[nBody];
}

function set_vy(nBody, value) {
    vy[nBody] = value;
}

var vz = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_vz(nBody) {
    return vz[nBody];
}

function set_vz(nBody, value) {
    vz[nBody] = value;
}

var mass = Array(0.0, 0.0, 0.0, 0.0, 0.0);

function get_mass(nBody) {
    return mass[nBody];
}

function set_mass(nBody, value) {
    mass[nBody] = value;
}

function init() {
    const pi = 3.141592653589793;
    solar_mass = 4 * pi * pi;
    const days_per_year = 365.24;

    const SUN = 0;
    const JUPITER = 1;
    const SATURN = 2;
    const URANUS = 3;
    const NEPTUNE = 4;

    set_x(SUN, Taint.source(0.0));
    set_y(SUN, Taint.source(0.0));
    set_z(SUN, Taint.source(0.0));
    set_vx(SUN, 0);
    set_vy(SUN, 0);
    set_vz(SUN, 0);
    set_mass(SUN, solar_mass);
    set_x(JUPITER, Taint.source(4.8414314424647209));
    set_y(JUPITER, Taint.source(-1.16032004402742839));
    set_z(JUPITER, Taint.source(-1.03622044471123109e-1));
    set_vx(JUPITER, 1.66007664274403694e-3 * days_per_year);
    set_vy(JUPITER, 7.69901118419740425e-3 * days_per_year);
    set_vz(JUPITER, -6.90460016972063023e-5 * days_per_year);
    set_mass(JUPITER, 9.54791938424326609e-4 * solar_mass);
    set_x(SATURN, Taint.source(8.34336671824457987));
    set_y(SATURN, Taint.source(4.12479856412430479));
    set_z(SATURN, Taint.source(-4.03523417114321381e-1));
    set_vx(SATURN, -2.76742510726862411e-3 * days_per_year);
    set_vy(SATURN, 4.99852801234917238e-3 * days_per_year);
    set_vz(SATURN, 2.30417297573763929e-5 * days_per_year);
    set_mass(SATURN, 2.85885980666130812e-4 * solar_mass);
    set_x(URANUS, Taint.source(1.2894369562139131e1));
    set_y(URANUS, Taint.source(-1.51111514016986312e1));
    set_z(URANUS, Taint.source(-2.23307578892655734e-1));
    set_vx(URANUS, 2.96460137564761618e-3 * days_per_year);
    set_vy(URANUS, 2.3784717395948095e-3 * days_per_year);
    set_vz(URANUS, -2.96589568540237556e-5 * days_per_year);
    set_mass(URANUS, 4.36624404335156298e-5 * solar_mass);
    set_x(NEPTUNE, Taint.source(1.53796971148509165e1));
    set_y(NEPTUNE, Taint.source(-2.59193146099879641e1));
    set_z(NEPTUNE, Taint.source(1.79258772950371181e-1));
    set_vx(NEPTUNE, 2.68067772490389322e-3 * days_per_year);
    set_vy(NEPTUNE, 1.62824170038242295e-3 * days_per_year);
    set_vz(NEPTUNE, -9.5159225451971587e-5 * days_per_year);
    set_mass(NEPTUNE, 5.15138902046611451e-5 * solar_mass);
}

function tearDown() {
    for (let i = 0; i < 5; i++) {
        set_x(i, 0.0);
        set_y(i, 0.0);
        set_z(i, 0.0);
        set_vx(i, 0.0);
        set_vy(i, 0.0);
        set_vz(i, 0.0);
        set_mass(i, 0.0);
    }
}

function advance() {
    for (let i = 0; i < 5; ++i) {
        const x1 = get_x(i);
        const y1 = get_y(i);
        const z1 = get_z(i);
        for (let j = i + 1; j < 5; ++j) {
            const dx = x1 - get_x(j);
            let R = dx * dx;
            const dy = y1 - get_y(j);
            R += dy * dy;
            const dz = z1 - get_z(j);
            R += dz * dz;
            R = Math.sqrt(R);
            const mag = 0.01 / (R * R * R);
            set_vx(i, get_vx(i) - dx * get_mass(j) * mag);
            set_vy(i, get_vy(i) - dy * get_mass(j) * mag);
            set_vz(i, get_vz(i) - dz * get_mass(j) * mag);
            set_vx(j, get_vx(j) + dx * get_mass(i) * mag);
            set_vy(j, get_vy(j) + dy * get_mass(i) * mag);
            set_vz(j, get_vz(j) + dz * get_mass(i) * mag);
        }
    }

    for (let i = 0; i < 5; ++i) {
        set_x(i, get_x(i) + 0.01 * get_vx(i));
        set_y(i, get_y(i) + 0.01 * get_vy(i));
        set_z(i, get_z(i) + 0.01 * get_vz(i));
    }
}

function energy() {
    var e = 0.0;
    for (let i = 0; i < 5; ++i) {
        e += 0.5 * get_mass(i) * (get_vx(i) * get_vx(i) + get_vy(i) * get_vy(i) + get_vz(i) * get_vz(i));
        for (let j = i + 1; j < 5; ++j) {
            const dx = get_x(i) - get_x(j);
            const dy = get_y(i) - get_y(j);
            const dz = get_z(i) - get_z(j);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            e -= (get_mass(i) * get_mass(j)) / distance;
        }
    }
    return e;
}

function offset_momentum() {
    var px = 0.0,
        py = 0.0,
        pz = 0.0;
    for (let i = 0; i < 5; ++i) {
        px += get_vx(i) * get_mass(i);
        py += get_vy(i) * get_mass(i);
        pz += get_vz(i) * get_mass(i);
    }
    set_vx(0, -px / solar_mass);
    set_vy(0, -py / solar_mass);
    set_vz(0, -pz / solar_mass);
}

function benchmark(n) {
    init();
    offset_momentum();

    for (let k = 0; k <= n; ++k) {
        advance();
    }

    let result = energy();
    result = Taint.sanitize(result);

    for (let i = 0; i < 5; i++) {
        Taint.assertIsTainted(get_x(i));
        Taint.assertIsTainted(get_y(i));
        Taint.assertIsTainted(get_z(i));
    }

    tearDown();

    return result;
}

function getExpectedResult() {
    return -0.16902646009754382;
}

console.assert(typeof benchmark == "function", "'benchmark' is not a function");
console.assert(typeof benchmarkName == "string", "'benchmarkName' is not defined or invalid");

export default function main(n = 2000000) {
    const restult = benchmark(n);
    return restult;
}
