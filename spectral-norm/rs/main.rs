use spectral_norm::spectralnorm;

fn main() {
    // Define array sizes to test
    let sizes = [100, 1000, 5000];

    println!("Spectral Norm Calculation Demo");
    println!("==============================");

    for &size in &sizes {
        println!("\nCalculating spectral norm for size = {}", size);

        // Ensure size is even as required by the implementation
        let size = if size % 2 != 0 { size + 1 } else { size };

        // Measure execution time
        let start = std::time::Instant::now();
        let result = spectralnorm(size);
        let duration = start.elapsed();

        println!("Result: {:.9}", result);
        println!("Time taken: {:?}", duration);
    }
}
