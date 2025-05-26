use std::ptr;

// Taint functionality
#[link(wasm_import_module = "taint")]
unsafe extern "C" {
    fn taint_char(val: char) -> char;
    fn taint_i32(val: i32) -> i32;
    fn taint_i64(val: i64) -> i64;
    fn taint_f32(val: f32) -> f32;
    fn taint_f64(val: f64) -> f64;
    fn sanitize_char(val: char) -> char;
    fn sanitize_i32(val: i32) -> i32;
    fn sanitize_i64(val: i64) -> i64;
    fn sanitize_f32(val: f32) -> f32;
    fn sanitize_f64(val: f64) -> f64;
    fn assert_is_tainted_char(val: char);
    fn assert_is_tainted_i32(val: i32);
    fn assert_is_tainted_i64(val: i64);
    fn assert_is_tainted_f32(val: f32);
    fn assert_is_tainted_f64(val: f64);
    fn assert_is_not_tainted_char(val: char);
    fn assert_is_not_tainted_i32(val: i32);
    fn assert_is_not_tainted_i64(val: i64);
    fn assert_is_not_tainted_f32(val: f32);
    fn assert_is_not_tainted_f64(val: f64);
    fn check_is_tainted_char(val: char) -> bool;
    fn check_is_tainted_i32(val: i32) -> bool;
    fn check_is_tainted_i64(val: i64) -> bool;
    fn check_is_tainted_f32(val: f32) -> bool;
    fn check_is_tainted_f64(val: f64) -> bool;
}

// Defines the size of each data chunk.
const CHUNK_SIZE: usize = 65526;
// Defines the maximum expected line length for input.
const MAX_LINE_LENGTH: usize = 60;

/// `IOObj` manages input lines and collects output data.
struct IOObj {
    input_lines: Vec<String>,
    output_data: Vec<String>,
    input_index: usize,
}

impl IOObj {
    /// Creates a new `IOObj` instance.
    fn new() -> Self {
        IOObj {
            input_lines: Vec::new(),
            output_data: Vec::new(),
            input_index: 0,
        }
    }

    /// Sets the input data from a string, splitting it into lines.
    fn set_input(&mut self, data: &str) {
        self.input_lines = data.lines().map(|s| s.to_string()).collect();
        self.input_index = 0;
        self.output_data.clear();
    }

    /// Retrieves the collected output data as a single string.
    fn get_output(&self) -> String {
        self.output_data.join("")
    }

    /// Checks if there are more lines to read.
    fn can_read_line(&self) -> bool {
        self.input_index < self.input_lines.len()
    }

    /// Reads the next line from the input.
    fn read_line(&mut self) -> Option<String> {
        if self.can_read_line() {
            let line = self.input_lines[self.input_index].clone();
            self.input_index += 1;
            Some(line)
        } else {
            None
        }
    }

    /// Peeks at the next character in the input without consuming it.
    /// Returns -1 if EOF.
    fn peek_next_char(&self) -> i32 {
        if self.can_read_line() {
            let current_line = &self.input_lines[self.input_index];
            if !current_line.is_empty() {
                return current_line.chars().next().unwrap() as i32;
            }
            if self.input_index + 1 < self.input_lines.len() {
                return '\n' as i32;
            }
        }
        -1 // EOF
    }

    /// Writes data to the output buffer.
    fn write(&mut self, data: &str) {
        self.output_data.push(data.to_string());
    }
}

/// Returns the complement character for a given DNA/RNA base, along with a boolean
/// indicating if the complement is "tainted" (as per the `taint_char` FFI).
fn complement(character: char) -> (char, bool) {
    match character {
        'A' | 'a' => (unsafe { taint_char('T') }, true),
        'C' | 'c' => (unsafe { taint_char('G') }, true),
        'G' | 'g' => (unsafe { taint_char('C') }, true),
        'T' | 't' => ('A', false),
        'U' | 'u' => ('A', false),
        'M' | 'm' => ('K', false), // A or C -> T or G
        'R' | 'r' => ('Y', false), // A or G -> T or C
        'W' | 'w' => ('W', false), // A or T -> T or A
        'S' | 's' => (unsafe { taint_char('S') }, true), // C or G -> G or C
        'Y' | 'y' => (unsafe { taint_char('R') }, true), // C or T -> G or A
        'K' | 'k' => (unsafe { taint_char('M') }, true), // G or T -> C or A
        'V' | 'v' => (unsafe { taint_char('B') }, true), // A or C or G -> T or G or C
        'H' | 'h' => ('D', false), // A or C or T -> T or G or A
        'D' | 'd' => ('H', false), // A or G or T -> T or C or A
        'B' | 'b' => ('V', false), // C or G or T -> G or C or A
        'N' | 'n' => (unsafe { taint_char('N') }, true), // Any -> Any
        _ => ('\0', false),        // Default for unknown characters
    }
}

/// Helper function to get the complement character and assert its taint status.
fn get_complement_char(original: char) -> char {
    let (ch, is_tainted) = complement(original);
    if is_tainted {
        unsafe {
            assert_is_tainted_char(ch);
        }
    } else {
        unsafe {
            assert_is_not_tainted_char(ch);
        }
    }
    ch
}

/// Represents a chunk of DNA/RNA sequence data in a linked list.
struct Chunk {
    next: Option<Box<Chunk>>,
    previous: *mut Chunk, // Raw pointer to the previous chunk for doubly linked list behavior
    data: Vec<char>,
    length: usize, // Actual number of characters stored in data
}

impl Chunk {
    /// Creates a new `Chunk` initialized with a fixed capacity.
    fn new() -> Box<Chunk> {
        Box::new(Chunk {
            next: None,
            previous: ptr::null_mut(),
            data: vec!['\0'; CHUNK_SIZE], // Pre-allocate data vector
            length: 0,
        })
    }
}

/// Computes the reverse complement of the sequence stored in the linked list of chunks.
/// This function modifies the chunks in place.
///
/// `begin_node`: The head of the linked list (owned by this function, returned at the end).
/// `end_ptr`: A raw mutable pointer to the last chunk in the list.
fn compute_reverse_complement(mut begin_node: Box<Chunk>, end_ptr: *mut Chunk) -> Box<Chunk> {
    // Get a mutable reference to the current 'begin' chunk.
    let mut current_begin_chunk_ref: &mut Chunk = &mut begin_node;
    let mut begin_index = 0;

    // We need to manage the 'end' side with a mutable raw pointer.
    let mut current_end_chunk_ptr = end_ptr;
    let mut end_index = unsafe { (*current_end_chunk_ptr).length - 1 };

    // Loop until the 'begin' and 'end' pointers/indices cross or meet.
    loop {
        unsafe {
            // Skip newline characters from the beginning side.
            while begin_index < current_begin_chunk_ref.length
                && current_begin_chunk_ref.data[begin_index] == '\n'
            {
                begin_index += 1;
                if begin_index == current_begin_chunk_ref.length {
                    // If we reached the end of the current chunk, move to the next.
                    if let Some(ref mut next_chunk) = current_begin_chunk_ref.next {
                        current_begin_chunk_ref = next_chunk; // Move reference to the next chunk
                        begin_index = 0; // Reset index for the new chunk
                    } else {
                        // Reached the end of the entire sequence from the beginning side.
                        break; // Exit the main loop
                    }
                }
            }

            // Skip newline characters from the end side.
            // `usize::MAX` is used to detect underflow when `end_index` goes below 0.
            while end_index == usize::MAX
                || (end_index < (*current_end_chunk_ptr).length
                    && (*current_end_chunk_ptr).data[end_index] == '\n')
            {
                if end_index == 0 || end_index == usize::MAX {
                    // If at the start of the current chunk or underflowed, move to the previous chunk.
                    if !(*current_end_chunk_ptr).previous.is_null() {
                        current_end_chunk_ptr = (*current_end_chunk_ptr).previous;
                        end_index = (*current_end_chunk_ptr).length - 1; // Set index to the end of the previous chunk
                    } else {
                        // Reached the beginning of the entire sequence from the end side.
                        break; // Exit the main loop
                    }
                } else {
                    end_index -= 1; // Move to the previous character in the current chunk
                }
            }

            // Check if the pointers have crossed or met.
            // Convert the mutable reference to a raw pointer for comparison.
            let current_begin_ptr_raw = current_begin_chunk_ref as *mut Chunk;
            if current_begin_ptr_raw == current_end_chunk_ptr {
                // If both pointers are in the same chunk, check their indices.
                if begin_index >= end_index {
                    break; // Pointers have met or crossed within the same chunk
                }
            } else {
                // If they are in different chunks, we continue.
                // The loop will eventually terminate when they meet or cross.
            }

            // Perform the swap of characters and their complements.
            let temp = get_complement_char(current_begin_chunk_ref.data[begin_index]);
            current_begin_chunk_ref.data[begin_index] =
                get_complement_char((*current_end_chunk_ptr).data[end_index]);
            (*current_end_chunk_ptr).data[end_index] = temp;

            // Advance the 'begin' index and decrement the 'end' index.
            begin_index += 1;
            if end_index > 0 {
                end_index -= 1;
            } else {
                // If end_index would underflow, set it to usize::MAX to signal
                // moving to the previous chunk in the next iteration.
                end_index = usize::MAX;
            }
        }
    }
    begin_node // Return the modified head Box, transferring ownership back.
}

/// Checks the taint status of characters in the reversed complement sequence.
fn check_reverse_complement(start: &Chunk) {
    let mut current = Some(start);
    while let Some(chunk) = current {
        for i in 0..chunk.length {
            let ch = chunk.data[i];
            match ch {
                'T' | 'G' | 'C' | 'M' | 'N' | 'S' | 'B' | 'R' => unsafe {
                    assert_is_tainted_char(ch);
                },
                _ => unsafe {
                    assert_is_not_tainted_char(ch);
                },
            }
        }
        current = chunk.next.as_ref().map(|b| b.as_ref());
    }
}

/// Peeks at the next character from the IO object, handling EOF.
fn peek_next_char(io_obj: &IOObj) -> char {
    let char_code = io_obj.peek_next_char();
    if char_code == -1 {
        '\0' // Return null character for EOF
    } else {
        char::from_u32(char_code as u32).unwrap_or('\0')
    }
}

/// Main function to perform reverse complement operation on input data.
fn reverse_complement(io_obj: &mut IOObj) {
    // Process each sequence block in the input.
    while io_obj.can_read_line() {
        if let Some(line) = io_obj.read_line() {
            // Write the header line (e.g., ">sequence_id") directly to output.
            io_obj.write(&line);
            io_obj.write("\n");

            // Initialize the first chunk for the sequence data.
            let mut start = Chunk::new();
            // `end_ptr` will always point to the last chunk in the current sequence's linked list.
            let mut end_ptr = start.as_mut() as *mut Chunk;

            // Read sequence data into chunks until a new header or EOF.
            while io_obj.can_read_line() && peek_next_char(io_obj) != '>' {
                // Read up to 1074 lines at a time to fill chunks efficiently.
                for _line_nr in 0..1074 {
                    if !io_obj.can_read_line() || peek_next_char(io_obj) == '>' {
                        break; // Stop if no more lines or new sequence header found
                    }

                    if let Some(line) = io_obj.read_line() {
                        if line.len() > MAX_LINE_LENGTH {
                            panic!("Unexpected line length"); // Enforce line length constraint
                        }

                        unsafe {
                            // Copy characters from the line into the current chunk's data.
                            for ch in line.chars() {
                                (*end_ptr).data[(*end_ptr).length] = ch;
                                (*end_ptr).length += 1;
                            }
                            // Add newline character to the chunk data.
                            (*end_ptr).data[(*end_ptr).length] = '\n';
                            (*end_ptr).length += 1;
                        }
                    }
                }

                // If more sequence data exists after filling a chunk, create a new chunk.
                if io_obj.can_read_line() && peek_next_char(io_obj) != '>' {
                    unsafe {
                        let old_end = end_ptr;
                        let mut new_end = Chunk::new();
                        new_end.previous = old_end; // Link new chunk to the previous one
                        end_ptr = new_end.as_mut() as *mut Chunk; // Update end_ptr to the new chunk
                        (*old_end).next = Some(new_end); // Link previous chunk to the new one
                    }
                }
            }

            // Adjust the length of the last chunk to remove the trailing newline if present.
            unsafe {
                if (*end_ptr).length > 0 && (*end_ptr).data[(*end_ptr).length - 1] == '\n' {
                    (*end_ptr).length -= 1;
                }
            }

            // Compute the reverse complement for the entire sequence (linked list of chunks).
            start = compute_reverse_complement(start, end_ptr);
            // Verify the taint status of characters after computing the reverse complement.
            check_reverse_complement(&start);

            // Write the processed sequence data to output, sanitizing characters.
            let mut current = Some(start);
            while let Some(mut chunk) = current {
                for i in 0..chunk.length {
                    let ch = chunk.data[i];
                    let sanitized = unsafe { sanitize_char(ch) }; // Sanitize character before writing
                    io_obj.write(&sanitized.to_string());
                }
                // Move to the next chunk in the list. `take()` transfers ownership.
                current = chunk.next.take();
            }
            io_obj.write("\n"); // Add a final newline after each sequence block
        }
    }
}

/// Benchmarking function.
fn benchmark(io_obj: &mut IOObj) -> i32 {
    reverse_complement(io_obj);
    0
}

/// The main entry point for the WASM module.
#[unsafe(no_mangle)]
fn main(_n: i32) -> i32 {
    let mut io_obj = IOObj::new();

    // Include the input FASTA data.
    let input_data = include_str!("input.fasta");
    io_obj.set_input(&input_data);

    // Run the benchmark (reverse complement computation).
    benchmark(&mut io_obj);

    // Print the final output.
    println!("{}", io_obj.get_output());
    0
}
