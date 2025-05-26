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
    fn js_log(val: i32);
}

const CHUNK_SIZE: usize = 65526;
const MAX_LINE_LENGTH: usize = 60;

struct IOObj {
    input_lines: Vec<String>,
    output_data: Vec<String>,
    input_index: usize,
}

impl IOObj {
    fn new() -> Self {
        IOObj {
            input_lines: Vec::new(),
            output_data: Vec::new(),
            input_index: 0,
        }
    }

    fn set_input(&mut self, data: &str) {
        self.input_lines = data.lines().map(|s| s.to_string()).collect();
        self.input_index = 0;
        self.output_data.clear();
    }

    fn get_output(&self) -> String {
        self.output_data.join("")
    }

    fn can_read_line(&self) -> bool {
        self.input_index < self.input_lines.len()
    }

    fn read_line(&mut self) -> Option<String> {
        if self.can_read_line() {
            let line = self.input_lines[self.input_index].clone();
            self.input_index += 1;
            Some(line)
        } else {
            None
        }
    }

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
        -1
    }

    fn write(&mut self, data: &str) {
        self.output_data.push(data.to_string());
    }
}

#[link(wasm_import_module = "js")]
unsafe extern "C" {
    fn get_complement_char(original: char) -> char;
}

// Represents a chunk of DNA/RNA sequence data in a linked list.
struct Chunk {
    next: Option<Box<Chunk>>,
    previous: *mut Chunk,
    data: Vec<char>,
    length: usize,
}

impl Chunk {
    fn new() -> Box<Chunk> {
        Box::new(Chunk {
            next: None,
            previous: ptr::null_mut(),
            data: vec!['\0'; CHUNK_SIZE],
            length: 0,
        })
    }
}

// Computes the reverse complement of the sequence stored in the linked list of chunks.
fn compute_reverse_complement(mut begin_node: Box<Chunk>, end_ptr: *mut Chunk) -> Box<Chunk> {
    let mut current_begin_chunk_ref: &mut Chunk = &mut begin_node;
    let mut begin_index = 0;
    let mut current_end_chunk_ptr = end_ptr;
    let mut end_index = unsafe { (*current_end_chunk_ptr).length - 1 };

    loop {
        unsafe {
            while begin_index < current_begin_chunk_ref.length
                && current_begin_chunk_ref.data[begin_index] == '\n'
            {
                begin_index += 1;
                if begin_index == current_begin_chunk_ref.length {
                    if let Some(ref mut next_chunk) = current_begin_chunk_ref.next {
                        current_begin_chunk_ref = next_chunk;
                        begin_index = 0;
                    } else {
                        break;
                    }
                }
            }

            while end_index == usize::MAX
                || (end_index < (*current_end_chunk_ptr).length
                    && (*current_end_chunk_ptr).data[end_index] == '\n')
            {
                if end_index == 0 || end_index == usize::MAX {
                    if !(*current_end_chunk_ptr).previous.is_null() {
                        current_end_chunk_ptr = (*current_end_chunk_ptr).previous;
                        end_index = (*current_end_chunk_ptr).length - 1;
                    } else {
                        break;
                    }
                } else {
                    end_index -= 1;
                }
            }

            let current_begin_ptr_raw = current_begin_chunk_ref as *mut Chunk;
            if current_begin_ptr_raw == current_end_chunk_ptr {
                if begin_index >= end_index {
                    break;
                }
            }

            let temp = get_complement_char(current_begin_chunk_ref.data[begin_index]);

            current_begin_chunk_ref.data[begin_index] =
                get_complement_char((*current_end_chunk_ptr).data[end_index]);
            (*current_end_chunk_ptr).data[end_index] = temp;

            begin_index += 1;
            if end_index > 0 {
                end_index -= 1;
            } else {
                end_index = usize::MAX;
            }
        }
    }
    begin_node
}

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

fn peek_next_char(io_obj: &IOObj) -> char {
    let char_code = io_obj.peek_next_char();
    if char_code == -1 {
        '\0'
    } else {
        char::from_u32(char_code as u32).unwrap_or('\0')
    }
}

fn reverse_complement(io_obj: &mut IOObj) {
    while io_obj.can_read_line() {
        if let Some(line) = io_obj.read_line() {
            io_obj.write(&line);
            io_obj.write("\n");

            let mut start = Chunk::new();
            let mut end_ptr = start.as_mut() as *mut Chunk;

            while io_obj.can_read_line() && peek_next_char(io_obj) != '>' {
                for _line_nr in 0..1074 {
                    if !io_obj.can_read_line() || peek_next_char(io_obj) == '>' {
                        break;
                    }

                    if let Some(line) = io_obj.read_line() {
                        if line.len() > MAX_LINE_LENGTH {
                            panic!("Unexpected line length");
                        }

                        unsafe {
                            for ch in line.chars() {
                                (*end_ptr).data[(*end_ptr).length] = ch;
                                (*end_ptr).length += 1;
                            }
                            (*end_ptr).data[(*end_ptr).length] = '\n';
                            (*end_ptr).length += 1;
                        }
                    }
                }

                if io_obj.can_read_line() && peek_next_char(io_obj) != '>' {
                    unsafe {
                        let old_end = end_ptr;
                        let mut new_end = Chunk::new();
                        new_end.previous = old_end;
                        end_ptr = new_end.as_mut() as *mut Chunk;
                        (*old_end).next = Some(new_end);
                    }
                }
            }

            unsafe {
                if (*end_ptr).length > 0 && (*end_ptr).data[(*end_ptr).length - 1] == '\n' {
                    (*end_ptr).length -= 1;
                }
            }

            start = compute_reverse_complement(start, end_ptr);
            check_reverse_complement(&start);

            let mut current = Some(start);
            while let Some(mut chunk) = current {
                for i in 0..chunk.length {
                    let ch = chunk.data[i];
                    let sanitized = unsafe { sanitize_char(ch) };
                    io_obj.write(&sanitized.to_string());
                }
                current = chunk.next.take();
            }
            io_obj.write("\n");
        }
    }
}

fn benchmark(io_obj: &mut IOObj) -> i32 {
    reverse_complement(io_obj);
    0
}

#[unsafe(no_mangle)]
fn main(_n: i32) -> i32 {
    let mut io_obj = IOObj::new();
    let input_data = include_str!("input.fasta");
    io_obj.set_input(&input_data);
    benchmark(&mut io_obj);
    println!("{}", io_obj.get_output());
    0
}
