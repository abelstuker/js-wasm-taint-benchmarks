// adapted from https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/binarytrees-clang-1.html

/* The Computer Language Benchmarks Game
 * https://salsa.debian.org/benchmarksgame-team/benchmarksgame/

   contributed by Kevin Carson
   *reset*
*/

const Taint = globalThis.Taint;
const benchmarkName = "binarytrees";

function shouldBeTainted(level) {
    return (level & 0b11) == 0b11;
}

function treeNode() {
    this.left = undefined;
    this.right = undefined;
    this.item = undefined;
}

function getItem(level) {
    let item = 1;
    if (shouldBeTainted(level)) {
        item = Taint.source(item);
    }
    return item;
}

function NewTreeNode(level, left, right) {
    const node = new treeNode();

    node.left = left;
    node.right = right;
    node.item = getItem(level);

    return node;
} /* NewTreeNode() */

function ItemCheck(tree) {
    let result = 0;
    result += tree.item;
    if (tree.left != undefined) {
        result += ItemCheck(tree.left);
        result += ItemCheck(tree.right);
    }
    return result;
} /* ItemCheck() */

function BottomUpTree(depth) {
    let node = undefined;
    if (depth > 0) {
        node = NewTreeNode(depth, BottomUpTree(depth - 1), BottomUpTree(depth - 1));
    } else {
        node = NewTreeNode(depth, undefined, undefined);
    }
    return node;
} /* BottomUpTree() */

function DeleteTree(depth, tree) {
    if (tree.left != undefined) {
        DeleteTree(depth - 1, tree.left);
        DeleteTree(depth - 1, tree.right);
    }

    let item = tree.item;

    if (shouldBeTainted(depth)) {
        Taint.assertIsTainted(item);
        tree.item = undefined;
    } else {
        Taint.assertIsNotTainted(item);
    }
} /* DeleteTree() */

function benchmark(N) {
    const minDepth = 4;

    let maxDepth;
    if (minDepth + 2 > N) maxDepth = minDepth + 2;
    else maxDepth = N;

    const stretchDepth = maxDepth + 1;

    let result = 0;
    let check = 0;

    const stretchTree = BottomUpTree(stretchDepth);
    check = ItemCheck(stretchTree);
    Taint.assertIsTainted(check);
    result += check;

    DeleteTree(stretchDepth, stretchTree);

    const longLivedTree = BottomUpTree(maxDepth);

    for (let depth = minDepth; depth <= maxDepth; depth += 2) {
        const iterations = Math.pow(2, maxDepth - depth + minDepth);

        check = 0;

        for (let i = 1; i <= iterations; i++) {
            let tempTree = BottomUpTree(depth);

            const curCheck = ItemCheck(tempTree);

            if (depth >= 0b11) Taint.assertIsTainted(curCheck);
            else Taint.assertIsNotTainted(curCheck);

            check += curCheck;
            DeleteTree(depth, tempTree);
        } /* for(i = 1...) */

        if (iterations > 0 && depth >= 0b11) Taint.assertIsTainted(check);
        else Taint.assertIsNotTainted(check);

        result += check;

        check = 0;
    } /* for(depth = minDepth...) */

    check = ItemCheck(longLivedTree);
    result += check;

    DeleteTree(maxDepth, longLivedTree);
    Taint.assertIsTainted(result);
    result = Taint.sanitize(result);

    return result;
} /* benchmark() */

function getExpectedResult() {
    return 6444382;
}

function setup(arg) {}

console.assert(typeof benchmark == "function", "'benchmark' is not a function");
console.assert(typeof benchmarkName == "string", "'benchmarkName' is not defined or invalid");

export default function main(n) {
    return benchmark(n);
}
