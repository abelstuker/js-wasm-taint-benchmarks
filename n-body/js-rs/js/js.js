import fs from "fs";

const Taint = globalThis.Taint;

const JSImport = {
    advanceSingle: () => {
        throw new Error("advanceSingle not implemented");
    },
};

/**
 * let x1 = self.bodies[i].x;
            let y1 = self.bodies[i].y;
            let z1 = self.bodies[i].z;

                let dx = x1 - self.bodies[j].x;
                let dy = y1 - self.bodies[j].y;
                let dz = z1 - self.bodies[j].z;

                let mut r = dx * dx + dy * dy + dz * dz;
                r = r.sqrt();
                let mag = dt / (r * r * r);

                let mass_j = self.bodies[j].mass;
                let mass_i = self.bodies[i].mass;

                // For body i
                self.bodies[i].vx -= dx * mass_j * mag;
                self.bodies[i].vy -= dy * mass_j * mag;
                self.bodies[i].vz -= dz * mass_j * mag;

                // For body j
                self.bodies[j].vx += dx * mass_i * mag;
                self.bodies[j].vy += dy * mass_i * mag;
                self.bodies[j].vz += dz * mass_i * mag;
            }

            this was the orginal code.
            now the advancesingle is called using:

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
                    )

 */
function advanceSingle(memory, x1, y1, z1, x2, y2, z2, vx1Ptr, vy1Ptr, vz1Ptr, vx2Ptr, vy2Ptr, vz2Ptr, mass1Ptr, mass2Ptr, dt) {
    const vx1Arr = new Float64Array(memory.buffer, vx1Ptr, 1);
    const vy1Arr = new Float64Array(memory.buffer, vy1Ptr, 1);
    const vz1Arr = new Float64Array(memory.buffer, vz1Ptr, 1);

    const vx2Arr = new Float64Array(memory.buffer, vx2Ptr, 1);
    const vy2Arr = new Float64Array(memory.buffer, vy2Ptr, 1);
    const vz2Arr = new Float64Array(memory.buffer, vz2Ptr, 1);

    const mass1Arr = new Float64Array(memory.buffer, mass1Ptr, 1);
    const mass2Arr = new Float64Array(memory.buffer, mass2Ptr, 1);

    let dx = x1 - x2;
    let dy = y1 - y2;
    let dz = z1 - z2;

    let r = dx * dx + dy * dy + dz * dz;
    r = Math.sqrt(r);
    let mag = Taint.source(dt) / (r * r * r);

    // For body i
    vx1Arr[0] -= dx * mass2Arr[0] * mag;
    vy1Arr[0] -= dy * mass2Arr[0] * mag;
    vz1Arr[0] -= dz * mass2Arr[0] * mag;
    // For body j
    vx2Arr[0] += dx * mass1Arr[0] * mag;
    vy2Arr[0] += dy * mass1Arr[0] * mag;
    vz2Arr[0] += dz * mass1Arr[0] * mag;
}

export default async function main(insturmentedWasmPath, iterations) {
    const wasmBuffer = fs.readFileSync(insturmentedWasmPath);

    const jsMethods = Object.keys(JSImport).reduce((methods, key) => {
        methods[key] = (...args) => JSImport[key](...args);
        return methods;
    }, {});

    const module = await WebAssembly.instantiate(wasmBuffer, {
        js: jsMethods,
    });

    const memory = module.instance.exports.memory;
    JSImport.advanceSingle = (...args) => advanceSingle(memory, ...args);

    const wasmMain = module.instance.exports.main;
    const res = wasmMain(iterations);
    return res;
}
