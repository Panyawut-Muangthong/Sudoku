/**
 * Sudoku Engine - Supports both:
 * 1. Mode 4x4 (2x2 blocks, 4 blocks total, digits 1-4) - Ideal for beginners & quick accessibility testing
 * 2. Mode 9x9 (3x3 blocks, 9 blocks total, digits 1-9) - Standard Sudoku
 */

class SudokuEngine {
    constructor() {}

    // สร้างตารางเปล่าขนาด size x size
    createEmptyGrid(size = 9) {
        return Array.from({ length: size }, () => Array(size).fill(0));
    }

    // ตรวจสอบว่าใส่เลข num ในแถว row, คอลัมน์ col ได้หรือไม่
    isValid(grid, row, col, num, size = 9, boxSize = 3) {
        for (let c = 0; c < size; c++) {
            if (grid[row][c] === num) return false;
        }
        for (let r = 0; r < size; r++) {
            if (grid[r][col] === num) return false;
        }
        const startRow = Math.floor(row / boxSize) * boxSize;
        const startCol = Math.floor(col / boxSize) * boxSize;
        for (let r = 0; r < boxSize; r++) {
            for (let c = 0; c < boxSize; c++) {
                if (grid[startRow + r][startCol + c] === num) return false;
            }
        }
        return true;
    }

    // สลับลำดับอาเรย์แบบสุ่ม (Fisher-Yates)
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // เติมตารางแบบสุ่มให้สมบูรณ์ (Complete Valid Solution)
    fillGrid(grid, size = 9, boxSize = 3) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === 0) {
                    const numbers = this.shuffle(Array.from({ length: size }, (_, i) => i + 1));
                    for (const num of numbers) {
                        if (this.isValid(grid, r, c, num, size, boxSize)) {
                            grid[r][c] = num;
                            if (this.fillGrid(grid, size, boxSize)) return true;
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    // นับจำนวนคำตอบที่เป็นไปได้ (เพื่อตรวจสอบ Unique Solution)
    countSolutions(grid, size = 9, boxSize = 3, countObj = { count: 0 }, limit = 2) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === 0) {
                    for (let num = 1; num <= size; num++) {
                        if (this.isValid(grid, r, c, num, size, boxSize)) {
                            grid[r][c] = num;
                            this.countSolutions(grid, size, boxSize, countObj, limit);
                            grid[r][c] = 0;
                            if (countObj.count >= limit) return countObj.count;
                        }
                    }
                    return countObj.count;
                }
            }
        }
        countObj.count++;
        return countObj.count;
    }

    // คัดลอกตาราง
    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    // สร้างเกมใหม่ตามโหมด ('4x4' หรือ '9x9') และระดับความยาก
    generateGame(mode = '9x9', difficulty = 'easy') {
        const size = mode === '4x4' ? 4 : 9;
        const boxSize = mode === '4x4' ? 2 : 3;

        const fullGrid = this.createEmptyGrid(size);
        this.fillGrid(fullGrid, size, boxSize);

        const solution = this.cloneGrid(fullGrid);
        const puzzle = this.cloneGrid(fullGrid);

        let removals;
        if (mode === '4x4') {
            // ตาราง 4x4 มี 16 ช่อง: ลบออก 6 ช่อง (เหลือ 10 ช่อง) ในระดับง่าย, ลบ 8 ช่องในระดับปกติ
            removals = (difficulty === 'easy') ? 6 : 8;
        } else {
            // ตาราง 9x9 มี 81 ช่อง
            switch (difficulty) {
                case 'easy': removals = 40; break;       // เหลือ ~41 ตัว
                case 'medium': removals = 48; break;     // เหลือ ~33 ตัว
                case 'hard': removals = 53; break;       // เหลือ ~28 ตัว
                case 'expert': removals = 57; break;     // เหลือ ~24 ตัว
                default: removals = 40;
            }
        }

        const positions = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                positions.push({ r, c });
            }
        }
        this.shuffle(positions);

        let removedCount = 0;
        for (const pos of positions) {
            if (removedCount >= removals) break;

            const temp = puzzle[pos.r][pos.c];
            puzzle[pos.r][pos.c] = 0;

            const copy = this.cloneGrid(puzzle);
            const countObj = { count: 0 };
            const solutions = this.countSolutions(copy, size, boxSize, countObj, 2);

            if (solutions !== 1) {
                puzzle[pos.r][pos.c] = temp;
            } else {
                removedCount++;
            }
        }

        return {
            mode,
            size,
            boxSize,
            puzzle,
            solution,
            initialClues: puzzle.map(row => row.map(val => val !== 0))
        };
    }

    // คำนวณหาตัวเลขที่เป็นไปได้ (Candidates)
    getCandidates(grid, row, col, size = 9, boxSize = 3) {
        if (grid[row][col] !== 0) return [];
        const candidates = [];
        for (let num = 1; num <= size; num++) {
            if (this.isValid(grid, row, col, num, size, boxSize)) {
                candidates.push(num);
            }
        }
        return candidates;
    }

    // ระบบ Smart Hint อธิบายขั้นตอนการคิดเป็นภาษาไทย
    getSmartHint(currentGrid, solutionGrid, targetRow = null, targetCol = null, size = 9, boxSize = 3) {
        // 1. ถ้าผู้เล่นเลือกช่องอยู่ และช่องนั้นว่างอยู่
        if (targetRow !== null && targetCol !== null && currentGrid[targetRow][targetCol] === 0) {
            const correctNum = solutionGrid[targetRow][targetCol];
            const candidates = this.getCandidates(currentGrid, targetRow, targetCol, size, boxSize);

            if (candidates.length === 1 && candidates[0] === correctNum) {
                return {
                    row: targetRow,
                    col: targetCol,
                    number: correctNum,
                    type: 'SingleCandidate',
                    title: 'ตัวเลขเดี่ยวที่ชัดเจน',
                    speechText: `คำใบ้สำหรับแถว ${targetRow + 1} คอลัมน์ ${targetCol + 1}: ใส่เลข ${correctNum} ได้เพียงตัวเดียว เพราะตัวเลขอื่นถูกใช้ไปหมดแล้ว`,
                    displayText: `ในแถว ${targetRow + 1} คอลัมน์ ${targetCol + 1} ตัวเลขอื่นในแถว คอลัมน์ หรือบล็อก ถูกใช้หมดแล้ว เหลือเพียงเลข <strong>${correctNum}</strong> เท่านั้น`
                };
            }
        }

        // 2. ค้นหาช่องว่างสุดท้ายในแถว
        for (let r = 0; r < size; r++) {
            const emptyCols = [];
            for (let c = 0; c < size; c++) {
                if (currentGrid[r][c] === 0) emptyCols.push(c);
            }
            if (emptyCols.length === 1) {
                const c = emptyCols[0];
                const num = solutionGrid[r][c];
                return {
                    row: r,
                    col: c,
                    number: num,
                    type: 'LastFreeCellRow',
                    title: 'ช่องว่างสุดท้ายในแถว',
                    speechText: `คำใบ้: แถว ${r + 1} เหลือช่องว่างสุดท้ายที่คอลัมน์ ${c + 1} ตัวเลขที่ขาดไปคือ ${num}`,
                    displayText: `แถวที่ ${r + 1} เหลือช่องว่างเพียงช่องเดียวในคอลัมน์ ${c + 1} จึงต้องเป็นเลข <strong>${num}</strong>`
                };
            }
        }

        // ค้นหาช่องว่างสุดท้ายในคอลัมน์
        for (let c = 0; c < size; c++) {
            const emptyRows = [];
            for (let r = 0; r < size; r++) {
                if (currentGrid[r][c] === 0) emptyRows.push(r);
            }
            if (emptyRows.length === 1) {
                const r = emptyRows[0];
                const num = solutionGrid[r][c];
                return {
                    row: r,
                    col: c,
                    number: num,
                    type: 'LastFreeCellCol',
                    title: 'ช่องว่างสุดท้ายในคอลัมน์',
                    speechText: `คำใบ้: คอลัมน์ ${c + 1} เหลือช่องว่างสุดท้ายที่แถว ${r + 1} ตัวเลขที่ขาดไปคือ ${num}`,
                    displayText: `คอลัมน์ที่ ${c + 1} เหลือช่องว่างเพียงช่องเดียวในแถว ${r + 1} จึงต้องเป็นเลข <strong>${num}</strong>`
                };
            }
        }

        // ค้นหาช่องว่างสุดท้ายในบล็อก
        const numBlocks = size / boxSize;
        for (let br = 0; br < numBlocks; br++) {
            for (let bc = 0; bc < numBlocks; bc++) {
                const emptyCells = [];
                for (let r = br * boxSize; r < br * boxSize + boxSize; r++) {
                    for (let c = bc * boxSize; c < bc * boxSize + boxSize; c++) {
                        if (currentGrid[r][c] === 0) emptyCells.push({ r, c });
                    }
                }
                if (emptyCells.length === 1) {
                    const { r, c } = emptyCells[0];
                    const num = solutionGrid[r][c];
                    const blockNum = br * numBlocks + bc + 1;
                    return {
                        row: r,
                        col: c,
                        number: num,
                        type: 'LastFreeCellBlock',
                        title: 'ช่องว่างสุดท้ายในบล็อก',
                        speechText: `คำใบ้: บล็อก ${blockNum} เหลือช่องว่างสุดท้ายที่แถว ${r + 1} คอลัมน์ ${c + 1} ต้องเป็นเลข ${num}`,
                        displayText: `บล็อกที่ ${blockNum} เหลือช่องว่างเพียงช่องเดียว ต้องเป็นเลข <strong>${num}</strong>`
                    };
                }
            }
        }

        // 3. ค้นหาช่องใดก็ได้ที่มีตัวเลือกเดี่ยว (Naked Single)
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (currentGrid[r][c] === 0) {
                    const cand = this.getCandidates(currentGrid, r, c, size, boxSize);
                    if (cand.length === 1 && cand[0] === solutionGrid[r][c]) {
                        return {
                            row: r,
                            col: c,
                            number: cand[0],
                            type: 'NakedSingle',
                            title: 'ตัวเลขเดี่ยวที่เป็นไปได้',
                            speechText: `คำใบ้: ที่แถว ${r + 1} คอลัมน์ ${c + 1} ใส่ได้เฉพาะเลข ${cand[0]}`,
                            displayText: `ที่แถว ${r + 1} คอลัมน์ ${c + 1} สามารถใส่ได้เฉพาะเลข <strong>${cand[0]}</strong>`
                        };
                    }
                }
            }
        }

        // 4. กรณีทั่วไป
        let rTarget = targetRow !== null ? targetRow : 0;
        let cTarget = targetCol !== null ? targetCol : 0;
        if (currentGrid[rTarget][cTarget] !== 0) {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (currentGrid[r][c] === 0) {
                        rTarget = r;
                        cTarget = c;
                        break;
                    }
                }
                if (currentGrid[rTarget][cTarget] === 0) break;
            }
        }

        const num = solutionGrid[rTarget][cTarget];
        return {
            row: rTarget,
            col: cTarget,
            number: num,
            type: 'DirectClue',
            title: 'คำใบ้ตัวเลขที่ถูกต้อง',
            speechText: `คำใบ้: แถว ${rTarget + 1} คอลัมน์ ${cTarget + 1} ตัวเลขคำตอบคือ ${num}`,
            displayText: `แถวที่ ${rTarget + 1} คอลัมน์ที่ ${cTarget + 1} ตัวเลขคำตอบที่ถูกต้องคือ <strong>${num}</strong>`
        };
    }

    // ตรวจสอบว่าชนะเกมหรือยัง
    isGameWon(grid, solution, size = 9) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === 0 || grid[r][c] !== solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    // คำนวณจำนวนตัวเลขที่ยังขาดอยู่ในตาราง
    getRemainingCounts(grid, size = 9) {
        const counts = Array(size + 1).fill(size);
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const val = grid[r][c];
                if (val >= 1 && val <= size) {
                    counts[val]--;
                }
            }
        }
        return counts;
    }
}

if (typeof window !== 'undefined') {
    window.SudokuEngine = SudokuEngine;
} else if (typeof module !== 'undefined') {
    module.exports = SudokuEngine;
}
