// adapted from https://benchmarksgame-team.pages.debian.net/benchmarksgame/program/revcomp-gpp-3.html

// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
// Contributed by Paul Kitchin
import fs from "fs";

const benchmarkName = "reverse-complement";

const Taint = globalThis.Taint;

const CHUNK_SIZE = 65526;
const MAX_LINE_LENGTH = 60;

// IO state management functions
function createIOState() {
    return {
        inputLines: [],
        outputData: [],
        inputIndex: 0,
    };
}

function setInput(ioState, data) {
    ioState.inputLines = data.split("\n");
    ioState.inputIndex = 0;
    ioState.outputData = [];
}

function getOutput(ioState) {
    return ioState.outputData.join("");
}

function canReadLine(ioState) {
    return ioState.inputIndex < ioState.inputLines.length;
}

function readLine(ioState) {
    if (canReadLine(ioState)) {
        return ioState.inputLines[ioState.inputIndex++];
    }
    return null;
}

function peekNextChar(ioState) {
    if (canReadLine(ioState)) {
        const currentLine = ioState.inputLines[ioState.inputIndex];
        if (currentLine.length > 0) {
            return currentLine.charCodeAt(0);
        }
        if (ioState.inputIndex + 1 < ioState.inputLines.length) {
            return "\n".charCodeAt(0);
        }
    }
    return -1; // EOF
}

function writeOutput(ioState, data) {
    ioState.outputData.push(data);
}

function complement(character) {
    switch (character) {
        case "A":
        case "a":
            return Taint.source("T");
        case "C":
        case "c":
            return Taint.source("G");
        case "G":
        case "g":
            return Taint.source("C");
        case "T":
        case "t":
            return "A";
        case "U":
        case "u":
            return "A";
        case "M":
        case "m":
            return "K";
        case "R":
        case "r":
            return "Y";
        case "W":
        case "w":
            return "W";
        case "S":
        case "s":
            return Taint.source("S");
        case "Y":
        case "y":
            return Taint.source("R");
        case "K":
        case "k":
            return Taint.source("M");
        case "V":
        case "v":
            return Taint.source("B");
        case "H":
        case "h":
            return "D";
        case "D":
        case "d":
            return "H";
        case "B":
        case "b":
            return "V";
        case "N":
        case "n":
            return Taint.source("N");
        default:
            return "\0";
    }
}

function getComplementChar(original) {
    var ch;

    ch = complement(original);
    if (ch === "T" || ch === "G" || ch === "C" || ch === "M" || ch === "N" || ch === "S" || ch === "B" || ch === "R") {
        Taint.assertIsTainted(ch);
    } else {
        Taint.assertIsNotTainted(ch);
    }
    return ch;
}

function chunk() {
    this.next = null;
    this.previous = null;
    this.data = [].fill("\0", 0, CHUNK_SIZE);
    this.length = 0;
}

function compute_reverse_complement(begin, end) {
    var start = begin;

    var begin_arr = begin.data;
    var end_arr = end.data;
    var beginIndex = 0;
    var endIndex = end.length - 1;

    while (begin != end || beginIndex < endIndex) {
        const temp = getComplementChar(begin_arr[beginIndex]);
        begin_arr[beginIndex++] = getComplementChar(end_arr[endIndex]);
        end_arr[endIndex--] = temp;

        if (begin_arr[beginIndex] == "\n") {
            beginIndex++;
        }

        if (end_arr[endIndex] == "\n") {
            --endIndex;
        }

        if (beginIndex == begin.length) {
            begin = begin.next;
            begin_arr = begin.data;
            beginIndex = 0;
            if (begin_arr[beginIndex] == "\n") {
                beginIndex++;
            }
        }

        if (endIndex < 0) {
            end = end.previous;
            end_arr = end.data;
            endIndex = end.length - 1;
            if (end_arr[endIndex] == "\n") {
                --endIndex;
            }
        }
    }

    return start;
}

function checkReverseComplement(start) {
    for (let current = start; current != null; current = current.next) {
        for (let i = 0; i < current.length; i++) {
            const ch = current.data[i];
            switch (ch) {
                case "T":
                case "G":
                case "C":
                case "M":
                case "N":
                case "S":
                case "B":
                case "R":
                    Taint.assertIsTainted(ch);
                    break;
                default:
                    Taint.assertIsNotTainted(ch);
                    break;
            }
        }
    }
}

function getNextCharAsString(ioState) {
    const charCode = peekNextChar(ioState);
    return String.fromCharCode(charCode);
}

function reverseComplement(ioState) {
    while (canReadLine(ioState)) {
        let line = readLine(ioState);

        writeOutput(ioState, line);
        writeOutput(ioState, "\n");
        let start = new chunk();
        let end = start;
        while (canReadLine(ioState) && getNextCharAsString(ioState) != ">") {
            for (
                var lineNr = 0;
                lineNr < 1074 && canReadLine(ioState) && getNextCharAsString(ioState) != ">";
                lineNr++
            ) {
                line = readLine(ioState);

                if (line.length > MAX_LINE_LENGTH) {
                    throw "Unexpected line length";
                }

                for (var charIndex = 0; charIndex < line.length; charIndex++) {
                    end.data[end.length++] = line.charAt(charIndex);
                }

                end.data[end.length++] = "\n";
            }

            if (canReadLine(ioState) && getNextCharAsString(ioState) != ">") {
                var oldEnd = end;
                end = new chunk();
                end.previous = oldEnd;
                oldEnd.next = end;
            }
        }
        end.length--;

        start = compute_reverse_complement(start, end);

        checkReverseComplement(start);

        for (var current = start; current != null; current = current.next) {
            for (var i = 0; i < current.length; i++) {
                var ch = current.data[i];
                ch = Taint.sanitize(ch);
                writeOutput(ioState, ch);
            }
            if (current.next != null) {
                current.next.previous = null;
            }
        }
        start = null;
        writeOutput(ioState, "\n");
    }
}

function benchmark(n, ioState) {
    reverseComplement(ioState);
    return 0;
}

function getExpectedResult() {
    return 0;
}

export default function main(n) {
    const ioState = createIOState();
    setInput(ioState, fs.readFileSync("reverse-complement/input.fasta", "utf8"));
    benchmark(n, ioState);
    console.log(getOutput(ioState));
    return 0;
}
