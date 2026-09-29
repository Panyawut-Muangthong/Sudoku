/**
 * Main Application Controller for Accessible Sudoku
 * Thai localized & Screen-Reader / Blind Accessible
 */

class SudokuApp {
    constructor() {
        this.engine = new SudokuEngine();
        this.audio = new SudokuAudio();
        this.tts = new SudokuTTS();

        // Game State
        this.difficulty = 'easy';
        this.puzzle = null;
        this.solution = null;
        this.initialClues = null;
        this.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
        
        this.selectedRow = 0;
        this.selectedCol = 0;
        this.isNotesMode = false;
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.score = 0;
        this.timerSeconds = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.isGameOver = false;
        this.isGameWon = false;
        this.undoStack = [];

        // Accessibility settings
        this.highContrast = localStorage.getItem('sudoku_high_contrast') === 'true';
        this.audio.enabled = localStorage.getItem('sudoku_sound_enabled') !== 'false';
        this.tts.enabled = localStorage.getItem('sudoku_tts_enabled') !== 'false';

        this.initDOM();
        this.bindEvents();
        this.applySettingsUI();
        this.newGame(this.difficulty);
    }

    // แคช DOM Elements
    initDOM() {
        this.boardEl = document.getElementById('sudoku-board');
        this.timerEl = document.getElementById('timer-display');
        this.mistakesEl = document.getElementById('mistakes-count');
        this.scoreEl = document.getElementById('score-display');
        this.diffLabelEl = document.getElementById('current-difficulty-label');
        this.notesBtn = document.getElementById('btn-notes');
        this.pauseBtn = document.getElementById('btn-pause');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.hintBanner = document.getElementById('hint-banner');
        this.hintText = document.getElementById('hint-text');
        this.numpadEl = document.getElementById('numpad');

        // Modals
        this.gameOverModal = document.getElementById('game-over-modal');
        this.winModal = document.getElementById('win-modal');
        this.helpModal = document.getElementById('help-modal');
    }

    // เริ่มเกมใหม่
    newGame(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.isGameOver = false;
        this.isGameWon = false;
        this.mistakes = 0;
        this.score = 0;
        this.timerSeconds = 0;
        this.isPaused = false;
        this.undoStack = [];
        this.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

        const gameData = this.engine.generateGame(difficulty);
        this.puzzle = gameData.puzzle;
        this.solution = gameData.solution;
        this.initialClues = gameData.initialClues;

        this.selectedRow = 0;
        this.selectedCol = 0;

        this.closeModals();
        this.renderBoard();
        this.updateStatsUI();
        this.updateNumpadBadges();
        this.startTimer();

        // แจ้งเตือนเสียงและข้อความเริ่มต้น
        const diffNames = {
            easy: 'ง่าย',
            medium: 'ปานกลาง',
            hard: 'ยาก',
            expert: 'ผู้เชี่ยวชาญ'
        };
        const welcomeText = `เริ่มเกมใหม่ ระดับ${diffNames[difficulty]} กระดาน 9 คูณ 9 พร้อมแล้ว กดปุ่มลูกศรเพื่อเลื่อนช่อง หรือกดเครื่องหมายคำถาม เพื่อฟังวิธีใช้แป้นพิมพ์`;
        this.tts.speak(welcomeText, true);
    }

    // คำนวณข้อความบรรยายภาษาไทยสำหรับ Screen Reader (VoiceOver, TalkBack, NVDA)
    getCellAriaLabel(r, c) {
        const blockNum = Math.floor(r / 3) * 3 + Math.floor(c / 3) + 1;
        const val = this.puzzle[r][c];
        const isGiven = this.initialClues[r][c];
        const notesArr = Array.from(this.notes[r][c]).sort((a, b) => a - b);
        const isError = (val !== 0 && val !== this.solution[r][c]);

        let desc = `แถว ${r + 1} คอลัมน์ ${c + 1} บล็อก ${blockNum}: `;
        if (isError) {
            desc += `ตัวเลข ${val} ไม่ถูกต้อง`;
        } else if (val !== 0) {
            desc += `ตัวเลข ${val} ${isGiven ? '(โจทย์)' : ''}`;
        } else {
            desc += `ว่าง`;
            if (notesArr.length > 0) {
                desc += `, โน้ต ${notesArr.join(' ')}`;
            }
        }
        return desc;
    }

    // เรนเดอร์ตาราง 9x9 พร้อมโครงสร้าง ARIA ที่สมบูรณ์
    renderBoard() {
        this.boardEl.innerHTML = '';

        for (let r = 0; r < 9; r++) {
            const rowEl = document.createElement('div');
            rowEl.className = 'sudoku-row';
            rowEl.setAttribute('role', 'row');

            for (let c = 0; c < 9; c++) {
                const cellEl = document.createElement('button');
                cellEl.type = 'button';
                cellEl.className = 'sudoku-cell';
                cellEl.id = `cell-${r}-${c}`;
                cellEl.setAttribute('role', 'gridcell');
                cellEl.setAttribute('data-row', r);
                cellEl.setAttribute('data-col', c);
                cellEl.setAttribute('aria-rowindex', r + 1);
                cellEl.setAttribute('aria-colindex', c + 1);

                // ทุกช่องต้องมี tabIndex = 0 เพื่อให้การ "ปัดหน้าจอ" (Swipe) ใน TalkBack / VoiceOver และ Tab บนคอมพิวเตอร์เข้าถึงได้ทุกช่อง!
                cellEl.tabIndex = 0;

                // กำหนด aria-label ชัดเจนตั้งแต่เริ่มต้น
                cellEl.setAttribute('aria-label', this.getCellAriaLabel(r, c));
                cellEl.setAttribute('aria-selected', (r === this.selectedRow && c === this.selectedCol) ? 'true' : 'false');

                // เส้นแบ่งบล็อก 3x3
                if ((c + 1) % 3 === 0 && c !== 8) cellEl.classList.add('border-right-thick');
                if ((r + 1) % 3 === 0 && r !== 8) cellEl.classList.add('border-bottom-thick');

                // คอนเทนต์ภายในช่อง: ตัวเลขหลัก หรือ ตารางโน้ตย่อย
                const val = this.puzzle[r][c];
                const isGiven = this.initialClues[r][c];

                if (isGiven) {
                    cellEl.classList.add('cell-given');
                    cellEl.setAttribute('aria-readonly', 'true');
                }

                const valueSpan = document.createElement('span');
                valueSpan.className = 'cell-value';
                valueSpan.setAttribute('aria-hidden', 'true'); // ซ่อนจากโปรแกรมอ่านจอภาพ ให้อ่านจาก aria-label ที่สมบูรณ์เท่านั้น
                valueSpan.textContent = val !== 0 ? val : '';
                cellEl.appendChild(valueSpan);

                // กริดโน้ต 3x3
                const notesGrid = document.createElement('div');
                notesGrid.className = 'cell-notes';
                notesGrid.setAttribute('aria-hidden', 'true'); // ซ่อนตัวเลขย่อยไม่ให้รบกวน Screen Reader
                for (let n = 1; n <= 9; n++) {
                    const noteSpan = document.createElement('span');
                    noteSpan.className = `note-item note-${n}`;
                    noteSpan.textContent = this.notes[r][c].has(n) ? n : '';
                    notesGrid.appendChild(noteSpan);
                }
                cellEl.appendChild(notesGrid);

                // Event focus: ทำงานทันทีเมื่อผู้ใช้กด Tab หรือคนตาบอด "ปัดหน้าจอ" (Swipe ขวา/ซ้าย ใน TalkBack/VoiceOver)
                cellEl.addEventListener('focus', () => {
                    if (this.selectedRow !== r || this.selectedCol !== c) {
                        this.selectCell(r, c, true, false);
                    }
                });

                // Event click: สำหรับการแตะหน้าจอ หรือ Double Tap ใน TalkBack / VoiceOver
                cellEl.addEventListener('click', () => {
                    this.selectCell(r, c, true, true);
                });

                rowEl.appendChild(cellEl);
            }
            this.boardEl.appendChild(rowEl);
        }

        this.updateCellHighlights();
    }

    // เลือกช่อง (Focus & Select)
    selectCell(row, col, isUserAction = true, shouldFocusDom = true) {
        if (this.isPaused || this.isGameOver || this.isGameWon) return;

        // ตรวจสอบการข้ามบล็อก
        const prevBlock = Math.floor(this.selectedRow / 3) * 3 + Math.floor(this.selectedCol / 3);
        const newBlock = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        if (prevBlock !== newBlock && isUserAction) {
            this.audio.playBlockCross();
        }

        const prevCell = document.getElementById(`cell-${this.selectedRow}-${this.selectedCol}`);
        if (prevCell) {
            prevCell.setAttribute('aria-selected', 'false');
        }

        this.selectedRow = row;
        this.selectedCol = col;

        const currentCell = document.getElementById(`cell-${row}-${col}`);
        if (currentCell) {
            currentCell.setAttribute('aria-selected', 'true');
            if (shouldFocusDom && document.activeElement !== currentCell) {
                currentCell.focus();
            }
        }

        this.updateCellHighlights();

        const val = this.puzzle[row][col];
        const isGiven = this.initialClues[row][col];
        const notesArr = Array.from(this.notes[row][col]).sort((a, b) => a - b);
        const isError = val !== 0 && val !== this.solution[row][col];

        // เสียงนำทางตามระดับเสียงความถี่
        if (isUserAction) {
            this.audio.playNavigate(row, col, val === 0, isGiven);
        }

        // เสียงบรรยายข้อมูลช่อง (TTS ในตัว)
        this.tts.announceCell(row, col, val, isGiven, notesArr, isError);

        // อัปเดต aria-label ให้เป็นข้อมูลล่าสุดเสมอ
        if (currentCell) {
            currentCell.setAttribute('aria-label', this.getCellAriaLabel(row, col));
        }
    }

    // ไฮไลต์แถว คอลัมน์ บล็อก และตัวเลขที่เหมือนกัน (แบบ Sudoku.com)
    updateCellHighlights() {
        const selectedVal = this.puzzle[this.selectedRow][this.selectedCol];
        const selBlockRow = Math.floor(this.selectedRow / 3);
        const selBlockCol = Math.floor(this.selectedCol / 3);

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (!cell) continue;

                cell.classList.remove('selected', 'highlighted', 'same-number', 'cell-error');

                const val = this.puzzle[r][c];

                if (r === this.selectedRow && c === this.selectedCol) {
                    cell.classList.add('selected');
                } else if (
                    r === this.selectedRow ||
                    c === this.selectedCol ||
                    (Math.floor(r / 3) === selBlockRow && Math.floor(c / 3) === selBlockCol)
                ) {
                    cell.classList.add('highlighted');
                }

                if (selectedVal !== 0 && val === selectedVal) {
                    cell.classList.add('same-number');
                }

                // ไฮไลต์ข้อผิดพลาด
                if (val !== 0 && val !== this.solution[r][c]) {
                    cell.classList.add('cell-error');
                }
            }
        }
    }

    // กรอกตัวเลขลงในช่องที่เลือก
    inputNumber(num) {
        if (this.isPaused || this.isGameOver || this.isGameWon) return;

        const r = this.selectedRow;
        const c = this.selectedCol;

        // ถ้าเป็นช่องโจทย์ ไม่สามารถแก้ไขได้
        if (this.initialClues[r][c]) {
            this.tts.speak(`แถว ${r + 1} คอลัมน์ ${c + 1} เป็นตัวเลขโจทย์ ไม่สามารถเปลี่ยนแปลงได้`, false);
            this.audio.playEdgeBump();
            return;
        }

        // โหมดจดบันทึก (Pencil Notes)
        if (this.isNotesMode) {
            // ถ้าช่องนั้นมีตัวเลขหลักอยู่แล้ว ไม่สามารถจดโน้ตได้
            if (this.puzzle[r][c] !== 0) {
                this.tts.speak(`ช่องนี้มีตัวเลข ${this.puzzle[r][c]} อยู่แล้ว โปรดลบก่อนจดบันทึก`, false);
                return;
            }

            const cellNotes = this.notes[r][c];
            const prevNotes = new Set(cellNotes);
            let actionText = '';

            if (cellNotes.has(num)) {
                cellNotes.delete(num);
                actionText = `ลบโน้ตเลข ${num}`;
            } else {
                cellNotes.add(num);
                actionText = `เพิ่มโน้ตเลข ${num}`;
            }

            this.undoStack.push({
                type: 'notes',
                row: r,
                col: c,
                prevNotes,
                newNotes: new Set(cellNotes)
            });

            this.audio.playNoteEdit();
            this.updateCellDOM(r, c);
            this.tts.speak(actionText, false);
            return;
        }

        // โหมดกรอกตัวเลขปกติ
        const currentVal = this.puzzle[r][c];
        if (currentVal === num) return; // ถ้าเป็นเลขเดิมอยู่แล้ว ไม่ทำซ้ำ

        const prevVal = currentVal;
        const prevNotes = new Set(this.notes[r][c]);
        const isCorrect = (num === this.solution[r][c]);

        if (isCorrect) {
            this.puzzle[r][c] = num;
            this.notes[r][c].clear(); // เคลียร์โน้ตในช่องนี้

            // ลบโน้ตเลขนี้ออกจากแถว, คอลัมน์, และบล็อกเดียวกันโดยอัตโนมัติ
            this.autoRemoveNotes(r, c, num);

            this.score += 100;
            this.audio.playCorrect();

            this.undoStack.push({
                type: 'value',
                row: r,
                col: c,
                prevVal,
                newVal: num,
                prevNotes
            });

            this.updateCellDOM(r, c);
            this.updateCellHighlights();
            this.updateNumpadBadges();
            this.updateStatsUI();

            // ตรวจสอบว่าเต็ม 1 ยูนิต (แถว/คอลัมน์/บล็อก) หรือยัง
            const completedUnits = this.checkCompletedUnits(r, c);
            if (completedUnits.length > 0) {
                this.audio.playCompletedUnit();
                const unitMsg = `ยอดเยี่ยม! คุณเติมเต็ม ${completedUnits.join(' และ ')} สำเร็จแล้ว`;
                this.tts.speak(unitMsg, true);
            } else {
                this.tts.speak(`ใส่เลข ${num} ถูกต้อง!`, false);
            }

            // ตรวจสอบว่าชนะเกมหรือยัง
            if (this.engine.isGameWon(this.puzzle, this.solution)) {
                this.handleGameWon();
            }
        } else {
            // ใส่ผิดพลาด
            this.mistakes++;
            this.puzzle[r][c] = num;
            this.audio.playMistake();

            this.undoStack.push({
                type: 'value',
                row: r,
                col: c,
                prevVal,
                newVal: num,
                prevNotes
            });

            this.updateCellDOM(r, c);
            this.updateCellHighlights();
            this.updateStatsUI();

            if (this.mistakes >= this.maxMistakes) {
                this.handleGameOver();
            } else {
                const mistakeMsg = `ข้อผิดพลาด! เลข ${num} ไม่ถูกต้อง ผิดครั้งที่ ${this.mistakes} จาก ${this.maxMistakes} ครั้ง`;
                this.tts.speak(mistakeMsg, true);
            }
        }
    }

    // ลบโน้ตเลขที่ใส่แล้วออกจากแถว คอลัมน์ และบล็อก
    autoRemoveNotes(row, col, num) {
        for (let c = 0; c < 9; c++) {
            if (this.notes[row][c].has(num)) {
                this.notes[row][c].delete(num);
                this.updateCellDOM(row, c);
            }
        }
        for (let r = 0; r < 9; r++) {
            if (this.notes[r][col].has(num)) {
                this.notes[r][col].delete(num);
                this.updateCellDOM(r, col);
            }
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (this.notes[startRow + r][startCol + c].has(num)) {
                    this.notes[startRow + r][startCol + c].delete(num);
                    this.updateCellDOM(startRow + r, startCol + c);
                }
            }
        }
    }

    // ตรวจสอบว่าแถว คอลัมน์ หรือบล็อกเพิ่งจะเต็มและถูกต้องหรือไม่
    checkCompletedUnits(row, col) {
        const completed = [];

        // เช็คแถว
        const rowComplete = this.puzzle[row].every((v, c) => v === this.solution[row][c]);
        if (rowComplete) completed.push(`แถวที่ ${row + 1}`);

        // เช็คคอลัมน์
        let colComplete = true;
        for (let r = 0; r < 9; r++) {
            if (this.puzzle[r][col] !== this.solution[r][col]) {
                colComplete = false;
                break;
            }
        }
        if (colComplete) completed.push(`คอลัมน์ที่ ${col + 1}`);

        // เช็คบล็อก
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        let blockComplete = true;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (this.puzzle[startRow + r][startCol + c] !== this.solution[startRow + r][startCol + c]) {
                    blockComplete = false;
                    break;
                }
            }
        }
        if (blockComplete) {
            const blockNum = Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;
            completed.push(`บล็อกที่ ${blockNum}`);
        }

        return completed;
    }

    // ลบตัวเลขหรือโน้ตในช่องที่เลือก
    eraseCell() {
        if (this.isPaused || this.isGameOver || this.isGameWon) return;

        const r = this.selectedRow;
        const c = this.selectedCol;

        if (this.initialClues[r][c]) {
            this.tts.speak(`แถว ${r + 1} คอลัมน์ ${c + 1} เป็นตัวเลขโจทย์ ไม่สามารถลบได้`, false);
            return;
        }

        const prevVal = this.puzzle[r][c];
        const prevNotes = new Set(this.notes[r][c]);

        if (prevVal === 0 && prevNotes.size === 0) {
            this.tts.speak(`ช่องนี้ว่างอยู่แล้ว`, false);
            return;
        }

        this.puzzle[r][c] = 0;
        this.notes[r][c].clear();

        this.undoStack.push({
            type: 'erase',
            row: r,
            col: c,
            prevVal,
            prevNotes
        });

        this.audio.playErase();
        this.updateCellDOM(r, c);
        this.updateCellHighlights();
        this.updateNumpadBadges();
        this.tts.speak(`ลบตัวเลขในแถว ${r + 1} คอลัมน์ ${c + 1} แล้ว`, false);
    }

    // สลับโหมดจดบันทึก (Notes / Pencil Mode)
    toggleNotes() {
        this.isNotesMode = !this.isNotesMode;
        this.notesBtn.classList.toggle('active', this.isNotesMode);
        this.notesBtn.setAttribute('aria-pressed', this.isNotesMode ? 'true' : 'false');

        const stateText = this.isNotesMode ? 'เปิดโหมดจดบันทึกแล้ว' : 'ปิดโหมดจดบันทึก กลับสู่โหมดตัวเลขปกติแล้ว';
        this.audio.playNoteToggle(this.isNotesMode);
        this.tts.speak(stateText, false);
    }

    // เลิกทำ (Undo)
    undo() {
        if (this.isPaused || this.isGameOver || this.isGameWon) return;
        if (this.undoStack.length === 0) {
            this.tts.speak(`ไม่มีรายการให้เลิกทำ`, false);
            return;
        }

        const action = this.undoStack.pop();
        const r = action.row;
        const c = action.col;

        if (action.type === 'notes') {
            this.notes[r][c] = new Set(action.prevNotes);
        } else if (action.type === 'value' || action.type === 'erase') {
            this.puzzle[r][c] = action.prevVal;
            this.notes[r][c] = new Set(action.prevNotes);
        }

        this.selectCell(r, c, false);
        this.updateCellDOM(r, c);
        this.updateCellHighlights();
        this.updateNumpadBadges();
        this.audio.playErase();
        this.tts.speak(`เลิกทำการกระทำล่าสุดที่แถว ${r + 1} คอลัมน์ ${c + 1} แล้ว`, false);
    }

    // ขอคำใบ้ (Smart Hint)
    giveHint() {
        if (this.isPaused || this.isGameOver || this.isGameWon) return;

        const hint = this.engine.getSmartHint(this.puzzle, this.solution, this.selectedRow, this.selectedCol);
        if (!hint) return;

        this.selectCell(hint.row, hint.col, false);

        // แสดงแบนเนอร์คำใบ้
        this.hintBanner.classList.remove('hidden');
        this.hintText.innerHTML = `<strong>${hint.title}:</strong> ${hint.displayText}`;

        // ใส่ตัวเลขคำตอบลงในช่องให้ทันที
        this.puzzle[hint.row][hint.col] = hint.number;
        this.notes[hint.row][hint.col].clear();
        this.autoRemoveNotes(hint.row, hint.col, hint.number);

        this.updateCellDOM(hint.row, hint.col);
        this.updateCellHighlights();
        this.updateNumpadBadges();

        this.audio.playHint();
        this.tts.speak(hint.speechText, true);

        if (this.engine.isGameWon(this.puzzle, this.solution)) {
            setTimeout(() => this.handleGameWon(), 1000);
        }
    }

    // ปรับปรุง DOM ของเซลล์เดี่ยวให้ตรงกับ State
    updateCellDOM(r, c) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        if (!cell) return;

        const val = this.puzzle[r][c];
        const valSpan = cell.querySelector('.cell-value');
        if (valSpan) valSpan.textContent = val !== 0 ? val : '';

        // อัปเดตโน้ต
        const noteItems = cell.querySelectorAll('.note-item');
        noteItems.forEach((item, idx) => {
            const num = idx + 1;
            item.textContent = (val === 0 && this.notes[r][c].has(num)) ? num : '';
        });

        // อัปเดต aria-label เสมอเมื่อมีการเปลี่ยนแปลงค่า
        cell.setAttribute('aria-label', this.getCellAriaLabel(r, c));
    }

    // อัปเดตจำนวนตัวเลขที่เหลือในปุ่ม Numpad (แบบ Sudoku.com)
    updateNumpadBadges() {
        const remaining = this.engine.getRemainingCounts(this.puzzle);
        for (let num = 1; num <= 9; num++) {
            const btn = document.querySelector(`.numpad-btn[data-val="${num}"]`);
            if (!btn) continue;

            const badge = btn.querySelector('.num-remaining');
            const count = remaining[num];
            if (badge) badge.textContent = count;

            if (count === 0) {
                btn.classList.add('completed');
                btn.setAttribute('aria-disabled', 'true');
                btn.setAttribute('aria-label', `ตัวเลข ${num} ใส่ครบแล้ว`);
            } else {
                btn.classList.remove('completed');
                btn.removeAttribute('aria-disabled');
                btn.setAttribute('aria-label', `ใส่ตัวเลข ${num}, เหลืออีก ${count} ช่อง`);
            }
        }
    }

    // ตัวจับเวลา
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver && !this.isGameWon) {
                this.timerSeconds++;
                this.updateTimerUI();
            }
        }, 1000);
    }

    updateTimerUI() {
        const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
        const secs = (this.timerSeconds % 60).toString().padStart(2, '0');
        this.timerEl.textContent = `${mins}:${secs}`;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseOverlay.classList.toggle('hidden', !this.isPaused);
        this.pauseBtn.setAttribute('aria-pressed', this.isPaused ? 'true' : 'false');

        const pauseIcon = this.pauseBtn.querySelector('.icon');
        if (pauseIcon) {
            pauseIcon.textContent = this.isPaused ? '▶' : '⏸';
        }

        const pauseText = this.isPaused ? 'หยุดเกมชั่วคราวแล้ว กดปุ่ม Space หรือคลิกเพื่อเล่นต่อ' : 'เล่นเกมต่อแล้ว';
        this.tts.speak(pauseText, true);
    }

    // อัปเดตสถิติต่างๆ ในหน้าจอ
    updateStatsUI() {
        this.mistakesEl.textContent = `${this.mistakes}/${this.maxMistakes}`;
        this.scoreEl.textContent = this.score;

        const diffNames = {
            easy: 'ง่าย',
            medium: 'ปานกลาง',
            hard: 'ยาก',
            expert: 'ผู้เชี่ยวชาญ'
        };
        this.diffLabelEl.textContent = diffNames[this.difficulty];
    }

    // จบเกม (Game Over)
    handleGameOver() {
        this.isGameOver = true;
        clearInterval(this.timerInterval);
        this.gameOverModal.classList.remove('hidden');

        const gameOverMsg = `จบเกม! คุณทำข้อผิดพลาดครบ 3 ครั้ง กดปุ่มเริ่มเกมใหม่ เพื่อเริ่มท้าทายใหม่อีกครั้ง`;
        this.tts.speak(gameOverMsg, true);
    }

    // ชนะเกม (Victory)
    handleGameWon() {
        this.isGameWon = true;
        clearInterval(this.timerInterval);

        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        const timeStr = `${mins > 0 ? mins + ' นาที ' : ''}${secs} วินาที`;

        document.getElementById('win-time').textContent = timeStr;
        document.getElementById('win-score').textContent = this.score;
        this.winModal.classList.remove('hidden');

        this.audio.playVictory();
        const victoryMsg = `ยินดีด้วยครับ! คุณแก้ปริศนาซูโดกุสำเร็จ ด้วยเวลา ${timeStr} ได้คะแนน ${this.score} คะแนน!`;
        this.tts.speak(victoryMsg, true);
    }

    closeModals() {
        this.gameOverModal.classList.add('hidden');
        this.winModal.classList.add('hidden');
        this.helpModal.classList.add('hidden');
        this.pauseOverlay.classList.add('hidden');
        this.hintBanner.classList.add('hidden');
    }

    // สลับธีมคอนทราสต์สูง (High Contrast Dark Mode)
    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        document.body.classList.toggle('high-contrast', this.highContrast);
        localStorage.setItem('sudoku_high_contrast', this.highContrast);

        const status = this.highContrast ? 'เปิดโหมดคอนทราสต์สูงแล้ว' : 'กลับสู่โหมดสีมาตรฐานแล้ว';
        this.tts.speak(status, false);
    }

    // สลับเปิด/ปิดเสียงพูด
    toggleTTS() {
        const enabled = this.tts.toggle();
        localStorage.setItem('sudoku_tts_enabled', enabled);
        this.updateSettingsButtonUI();
        const msg = enabled ? 'เปิดเสียงบรรยายภาษาไทยแล้ว' : 'ปิดเสียงบรรยายภาษาไทยแล้ว';
        this.tts.announceAria(msg, true);
    }

    // สลับเปิด/ปิดเสียงเอฟเฟกต์
    toggleSound() {
        const enabled = this.audio.toggle();
        localStorage.setItem('sudoku_sound_enabled', enabled);
        this.updateSettingsButtonUI();
        const msg = enabled ? 'เปิดเอฟเฟกต์เสียงแล้ว' : 'ปิดเอฟเฟกต์เสียงแล้ว';
        this.tts.speak(msg, false);
    }

    updateSettingsButtonUI() {
        const ttsBtn = document.getElementById('btn-toggle-tts');
        const soundBtn = document.getElementById('btn-toggle-sound');
        const contrastBtn = document.getElementById('btn-toggle-contrast');

        if (ttsBtn) ttsBtn.classList.toggle('btn-off', !this.tts.enabled);
        if (soundBtn) soundBtn.classList.toggle('btn-off', !this.audio.enabled);
        if (contrastBtn) contrastBtn.classList.toggle('active', this.highContrast);
    }

    applySettingsUI() {
        if (this.highContrast) {
            document.body.classList.add('high-contrast');
        }
        this.updateSettingsButtonUI();
    }

    // ผูก Event Listeners ต่างๆ
    bindEvents() {
        // แป้นพิมพ์ Keyboard Navigation & Shortcuts
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // ปุ่มควบคุมการเล่น
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-erase').addEventListener('click', () => this.eraseCell());
        this.notesBtn.addEventListener('click', () => this.toggleNotes());
        document.getElementById('btn-hint').addEventListener('click', () => this.giveHint());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.pauseOverlay.addEventListener('click', () => this.togglePause());

        // ปุ่ม Numpad 1-9
        this.numpadEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.numpad-btn');
            if (btn && btn.dataset.val) {
                this.inputNumber(parseInt(btn.dataset.val, 10));
            }
        });

        // ปุ่มเมนูเกมใหม่และเลือกระดับความยาก
        const newGameDropdown = document.getElementById('new-game-dropdown');
        document.getElementById('btn-new-game-main').addEventListener('click', () => {
            newGameDropdown.classList.toggle('hidden');
        });

        document.querySelectorAll('.diff-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.currentTarget.dataset.difficulty;
                newGameDropdown.classList.add('hidden');
                this.newGame(diff);
            });
        });

        // ปุ่มใน Modal ต่างๆ
        document.querySelectorAll('.btn-restart-game').forEach(btn => {
            btn.addEventListener('click', () => this.newGame(this.difficulty));
        });

        // ปุ่มตั้งค่าการเข้าถึง
        document.getElementById('btn-toggle-tts').addEventListener('click', () => this.toggleTTS());
        document.getElementById('btn-toggle-sound').addEventListener('click', () => this.toggleSound());
        document.getElementById('btn-toggle-contrast').addEventListener('click', () => this.toggleHighContrast());
        document.getElementById('btn-help').addEventListener('click', () => {
            this.helpModal.classList.remove('hidden');
            this.tts.speak('เปิดคู่มือปุ่มลัดแป้นพิมพ์แล้ว กดปุ่ม Escape เพื่อปิด', true);
        });

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // ปิด Dropdown เมื่อคลิกที่อื่น
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.new-game-wrapper')) {
                newGameDropdown.classList.add('hidden');
            }
        });
    }

    // จัดการการกดแป้นพิมพ์
    handleKeyDown(e) {
        // ถ้า Modal กำลังเปิดอยู่
        if (!this.helpModal.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                this.helpModal.classList.add('hidden');
                this.tts.speak('ปิดคู่มือแล้ว', false);
            }
            return;
        }

        // จัดการปุ่มลูกศรเลื่อนช่อง
        let r = this.selectedRow;
        let c = this.selectedCol;
        let moved = false;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (r > 0) { r--; moved = true; }
                else { this.audio.playEdgeBump(); }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (r < 8) { r++; moved = true; }
                else { this.audio.playEdgeBump(); }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (c > 0) { c--; moved = true; }
                else { this.audio.playEdgeBump(); }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (c < 8) { c++; moved = true; }
                else { this.audio.playEdgeBump(); }
                break;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                this.inputNumber(parseInt(e.key, 10));
                e.preventDefault();
                return;
            case 'Backspace':
            case 'Delete':
                this.eraseCell();
                e.preventDefault();
                return;
            case 'n':
            case 'N':
            case 'p':
            case 'P':
                this.toggleNotes();
                e.preventDefault();
                return;
            case 'u':
            case 'U':
                this.undo();
                e.preventDefault();
                return;
            case 'z':
            case 'Z':
                if (e.ctrlKey || e.metaKey) {
                    this.undo();
                    e.preventDefault();
                }
                return;
            case 'h':
            case 'H':
                this.giveHint();
                e.preventDefault();
                return;
            case 'r':
            case 'R': // อ่านทั้งแถว
                this.tts.announceRow(r, this.puzzle[r]);
                e.preventDefault();
                return;
            case 'c':
            case 'C': // อ่านทั้งคอลัมน์
                const colVals = [];
                for (let rowIdx = 0; rowIdx < 9; rowIdx++) {
                    colVals.push(this.puzzle[rowIdx][c]);
                }
                this.tts.announceCol(c, colVals);
                e.preventDefault();
                return;
            case 'b':
            case 'B': // อ่านทั้งบล็อก 3x3
                const blockRow = Math.floor(r / 3);
                const blockCol = Math.floor(c / 3);
                const blockNum = blockRow * 3 + blockCol + 1;
                const blockVals = [];
                for (let br = 0; br < 3; br++) {
                    for (let bc = 0; bc < 3; bc++) {
                        blockVals.push(this.puzzle[blockRow * 3 + br][blockCol * 3 + bc]);
                    }
                }
                this.tts.announceBlock(blockNum, blockVals);
                e.preventDefault();
                return;
            case ' ':
            case 'Enter': // ทวนข้อมูลช่องปัจจุบัน หรือ Resume เมื่อ Pause
                if (this.isPaused) {
                    this.togglePause();
                } else {
                    const val = this.puzzle[r][c];
                    const isGiven = this.initialClues[r][c];
                    const notesArr = Array.from(this.notes[r][c]).sort((a, b) => a - b);
                    const isError = val !== 0 && val !== this.solution[r][c];
                    this.tts.announceCell(r, c, val, isGiven, notesArr, isError);
                }
                e.preventDefault();
                return;
            case '?':
            case 'F1':
                this.helpModal.classList.remove('hidden');
                this.tts.speak('คู่มือแป้นพิมพ์: ใช้ลูกศรเพื่อเลื่อนช่อง, กดเลข 1 ถึง 9 เพื่อใส่เลข, กด N สลับโหมดโน้ต, กด Backspace เพื่อลบ, กด R ฟังทั้งแถว, กด C ฟังทั้งคอลัมน์, กด B ฟังทั้งบล็อก, กด H ขอคำใบ้, กด Escape เพื่อปิดหน้านี้', true);
                e.preventDefault();
                return;
            case 'Escape':
                this.closeModals();
                return;
        }

        if (moved) {
            e.preventDefault();
            this.selectCell(r, c, true);
        }
    }
}

// เริ่มต้นแอปเมื่อโหลดหน้าเสร็จสมบูรณ์
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SudokuApp();
});
