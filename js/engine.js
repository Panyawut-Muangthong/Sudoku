/**
 * Sudoku Engine - Generator, Solver, and Smart Hint System
 */

class SudokuEngine {
    constructor() {
        this.size = 9;
        this.boxSize = 3;
    }

    // สร้างตารางเปล่า 9x9
    createEmptyGrid() {
        return Array.from({ length: 9 }, () => Array(9).fill(0));
    }

    // ตรวจสอบว่าใส่เลข num ในแถว row, คอลัมน์ col ได้หรือไม่
    isValid(grid, row, col, num) {
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === num) return false;
        }
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === num) return false;
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
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
    fillGrid(grid) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (const num of numbers) {
                        if (this.isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (this.fillGrid(grid)) return true;
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
    countSolutions(grid, countObj = { count: 0 }, limit = 2) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            this.countSolutions(grid, countObj, limit);
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

    // คัดลอกตาราง 9x9
    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    // สร้างเกมใหม่ตามระดับความยาก
    generateGame(difficulty = 'easy') {
        const fullGrid = this.createEmptyGrid();
        this.fillGrid(fullGrid);

        const solution = this.cloneGrid(fullGrid);
        const puzzle = this.cloneGrid(fullGrid);

        // กำหนดจำนวนช่องที่ลบออกตามระดับความยาก
        let removals;
        switch (difficulty) {
            case 'easy': removals = 40; break;       // เหลือ ~41 ตัว
            case 'medium': removals = 48; break;     // เหลือ ~33 ตัว
            case 'hard': removals = 53; break;       // เหลือ ~28 ตัว
            case 'expert': removals = 57; break;     // เหลือ ~24 ตัว
            default: removals = 40;
        }

        const positions = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push({ r, c });
            }
        }
        this.shuffle(positions);

        let removedCount = 0;
        for (const pos of positions) {
            if (removedCount >= removals) break;

            const temp = puzzle[pos.r][pos.c];
            puzzle[pos.r][pos.c] = 0;

            // ตรวจสอบว่ายังมีคำตอบเดียวอยู่หรือไม่
            const copy = this.cloneGrid(puzzle);
            const countObj = { count: 0 };
            const solutions = this.countSolutions(copy, countObj, 2);

            if (solutions !== 1) {
                // ถ้ามีหลายคำตอบ ให้ใส่คืน
                puzzle[pos.r][pos.c] = temp;
            } else {
                removedCount++;
            }
        }

        return {
            puzzle,
            solution,
            initialClues: puzzle.map(row => row.map(val => val !== 0))
        };
    }

    // คำนวณหาตัวเลขที่เป็นไปได้ (Candidates) สำหรับแต่ละช่อง
    getCandidates(grid, row, col) {
        if (grid[row][col] !== 0) return [];
        const candidates = [];
        for (let num = 1; num <= 9; num++) {
            if (this.isValid(grid, row, col, num)) {
                candidates.push(num);
            }
        }
        return candidates;
    }

    // ระบบ Smart Hint อธิบายขั้นตอนการคิดเป็นภาษาไทยตามแบบ Sudoku.com
    getSmartHint(currentGrid, solutionGrid, targetRow = null, targetCol = null) {
        // 1. ถ้าผู้เล่นเลือกช่องอยู่ และช่องนั้นว่างอยู่
        if (targetRow !== null && targetCol !== null && currentGrid[targetRow][targetCol] === 0) {
            const correctNum = solutionGrid[targetRow][targetCol];
            const candidates = this.getCandidates(currentGrid, targetRow, targetCol);

            // ถ้าในช่องนี้มีตัวเลือกที่เป็นไปได้เพียงเลขเดียว
            if (candidates.length === 1 && candidates[0] === correctNum) {
                return {
                    row: targetRow,
                    col: targetCol,
                    number: correctNum,
                    type: 'SingleCandidate',
                    title: 'ตัวเลขเดี่ยวที่ชัดเจน',
                    speechText: `คำใบ้สำหรับแถว ${targetRow + 1} คอลัมน์ ${targetCol + 1}: ใส่เลข ${correctNum} ได้เพียงตัวเดียว เพราะตัวเลขอื่นในแถว คอลัมน์ หรือบล็อก ถูกใช้ไปหมดแล้ว`,
                    displayText: `ในแถว ${targetRow + 1} คอลัมน์ ${targetCol + 1} ตัวเลขอื่นในแถว คอลัมน์ หรือบล็อก 3x3 ถูกใช้หมดแล้ว เหลือเพียงเลข <strong>${correctNum}</strong> เท่านั้น`
                };
            }
        }

        // 2. ค้นหาช่องว่างสุดท้ายใน แถว / คอลัมน์ / บล็อก (LastFreeCell)
        // ตรวจสอบแถว
        for (let r = 0; r < 9; r++) {
            const emptyCols = [];
            for (let c = 0; c < 9; c++) {
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

        // ตรวจสอบคอลัมน์
        for (let c = 0; c < 9; c++) {
            const emptyRows = [];
            for (let r = 0; r < 9; r++) {
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

        // ตรวจสอบบล็อก 3x3
        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const emptyCells = [];
                for (let r = br * 3; r < br * 3 + 3; r++) {
                    for (let c = bc * 3; c < bc * 3 + 3; c++) {
                        if (currentGrid[r][c] === 0) emptyCells.push({ r, c });
                    }
                }
                if (emptyCells.length === 1) {
                    const { r, c } = emptyCells[0];
                    const num = solutionGrid[r][c];
                    const blockNum = br * 3 + bc + 1;
                    return {
                        row: r,
                        col: c,
                        number: num,
                        type: 'LastFreeCellBlock',
                        title: 'ช่องว่างสุดท้ายในบล็อก',
                        speechText: `คำใบ้: บล็อก ${blockNum} เหลือช่องว่างสุดท้ายที่แถว ${r + 1} คอลัมน์ ${c + 1} ต้องเป็นเลข ${num}`,
                        displayText: `บล็อก 3x3 บล็อกที่ ${blockNum} เหลือช่องว่างเพียงช่องเดียว ต้องเป็นเลข <strong>${num}</strong>`
                    };
                }
            }
        }

        // 3. ค้นหาช่องใดก็ได้ที่มีตัวเลือกเดี่ยว (Naked Single)
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (currentGrid[r][c] === 0) {
                    const cand = this.getCandidates(currentGrid, r, c);
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

        // 4. กรณีทั่วไป ถ้ายังไม่เข้าเงื่อนไข ให้เฉลยช่องเป้าหมายหรือช่องว่างแรกที่พบ
        let rTarget = targetRow !== null ? targetRow : 0;
        let cTarget = targetCol !== null ? targetCol : 0;
        if (currentGrid[rTarget][cTarget] !== 0) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
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

    // ตรวจสอบว่าชนะเกมหรือยัง (ตารางเต็มและถูกต้องทั้งหมด)
    isGameWon(grid, solution) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0 || grid[r][c] !== solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    // คำนวณจำนวนตัวเลข 1-9 ที่ยังขาดอยู่ในตาราง
    getRemainingCounts(grid) {
        const counts = Array(10).fill(9);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                if (val >= 1 && val <= 9) {
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
