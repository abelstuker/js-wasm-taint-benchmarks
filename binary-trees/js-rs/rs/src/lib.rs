// Binary Trees benchmark
// Adapted from JavaScript version, originally from:
// https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/binarytrees-clang-1.html
/* The Computer Language Benchmarks Game
 * https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
 */

use std::cell::RefCell;
use std::rc::Rc;

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
//     fn js_log(value: f64);
// }

#[link(wasm_import_module = "js")]
unsafe extern "C" {
    fn getItem(level: i32) -> i32;
}

// fn getItem(level: i32) -> i32 {
//     1
// }

fn should_be_tainted(level: i32) -> bool {
    (level & 0b11) == 0b11
}

struct TreeNode {
    left: Option<Rc<RefCell<TreeNode>>>,
    right: Option<Rc<RefCell<TreeNode>>>,
    item: i32,
}

impl TreeNode {
    fn new(
        level: i32,
        left: Option<Rc<RefCell<TreeNode>>>,
        right: Option<Rc<RefCell<TreeNode>>>,
    ) -> Rc<RefCell<TreeNode>> {
        let item = unsafe { getItem(level) };
        Rc::new(RefCell::new(TreeNode { left, right, item }))
    }
}

fn item_check(tree: &Rc<RefCell<TreeNode>>) -> i32 {
    let tree_ref = tree.borrow();
    let mut result = tree_ref.item;

    if let (Some(left), Some(right)) = (&tree_ref.left, &tree_ref.right) {
        result += item_check(left);
        result += item_check(right);
    }

    result
}

fn bottom_up_tree(depth: i32) -> Option<Rc<RefCell<TreeNode>>> {
    if depth > 0 {
        Some(TreeNode::new(
            depth,
            bottom_up_tree(depth - 1),
            bottom_up_tree(depth - 1),
        ))
    } else {
        Some(TreeNode::new(depth, None, None))
    }
}

fn delete_tree(depth: i32, tree: &Rc<RefCell<TreeNode>>) {
    let mut tree_ref = tree.borrow_mut();

    if let (Some(left), Some(right)) = (&tree_ref.left, &tree_ref.right) {
        delete_tree(depth - 1, left);
        delete_tree(depth - 1, right);
    }

    let item = tree_ref.item;

    if should_be_tainted(depth) {
        // unsafe { assert_is_tainted_i32(item) };
        tree_ref.item = 0; // Setting to 0 instead of undefined
    } else {
        // unsafe { assert_is_not_tainted_i32(item) };
    }
}

fn benchmark(n: i32) -> i32 {
    let min_depth = 4;
    let max_depth = if min_depth + 2 > n { min_depth + 2 } else { n };
    let stretch_depth = max_depth + 1;

    let mut result = 0;
    let mut check;

    // Stretch tree
    let stretch_tree = bottom_up_tree(stretch_depth).unwrap();
    check = item_check(&stretch_tree);
    // unsafe { assert_is_tainted_i32(check) };
    result += check;

    delete_tree(stretch_depth, &stretch_tree);

    // Long lived tree
    let long_lived_tree = bottom_up_tree(max_depth).unwrap();

    // Iterations for various depths
    for depth in (min_depth..=max_depth).step_by(2) {
        let iterations = 2i32.pow((max_depth - depth + min_depth) as u32);
        check = 0;

        for _ in 1..=iterations {
            let temp_tree = bottom_up_tree(depth).unwrap();
            let cur_check = item_check(&temp_tree);

            // if depth >= 0b11 {
            //     unsafe { assert_is_tainted_i32(cur_check) };
            // } else {
            //     unsafe { assert_is_not_tainted_i32(cur_check) };
            // }

            check += cur_check;
            delete_tree(depth, &temp_tree);
        }

        // if iterations > 0 && depth >= 0b11 {
        //     unsafe { assert_is_tainted_i32(check) };
        // } else {
        //     unsafe { assert_is_not_tainted_i32(check) };
        // }

        result += check;
        check = 0;
    }

    check = item_check(&long_lived_tree);
    result += check;

    delete_tree(max_depth, &long_lived_tree);
    // unsafe { assert_is_tainted_i32(result) };

    // Sanitize result
    // unsafe { sanitize_i32(result) }
    result
}

fn get_expected_result() -> i32 {
    6444382
}

#[unsafe(no_mangle)]
fn main(n: i32) -> i32 {
    let result = benchmark(n);
    result
}
