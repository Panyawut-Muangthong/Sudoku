/**
 * Web Audio API Sound Synthesizer for Sudoku Accessibility
 * Provides auditory feedback, spatial cues, and sound effects without external audio files.
 */

class SudokuAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    // เริ่มต้น AudioContext เมื่อมีการโต้ตอบครั้งแรก (ตามนโยบาย Web Audio ของเบราว์เซอร์)
    initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // เปิด / ปิดเสียงเอฟเฟกต์
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // เล่นเสียงระดับเสียง (Frequency) ที่กำหนด
    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Web Audio error:', e);
        }
    }

    // เสียงเมื่อเลื่อนไปยังช่องต่างๆ (ปรับระดับเสียงตามตำแหน่งแถวและคอลัมน์ เพื่อให้ผู้เล่นตาบอดรู้สึกถึงตำแหน่งในตาราง)
    playNavigate(row, col, isEmpty, isGiven) {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        // คำนวณความถี่จากตำแหน่งแถว (200 - 450 Hz) และคอลัมน์ (ความต่างเล็กน้อย)
        const baseFreq = 220 + (row * 24) + (col * 8);

        if (isGiven) {
            // ช่องโจทย์เดิม: เสียงหนักแน่น กังวานคล้ายเปียโน/ระนาด
            this.playTone(baseFreq, 'triangle', 0.12, 0.2);
        } else if (!isEmpty) {
            // ช่องที่ผู้เล่นใส่เลขไว้แล้ว: เสียงใส
            this.playTone(baseFreq * 1.25, 'sine', 0.1, 0.15);
        } else {
            // ช่องว่าง: เสียงสั้นๆ นุ่มนวล
            this.playTone(baseFreq, 'sine', 0.08, 0.1);
        }
    }

    // เสียงเมื่อชนขอบกระดาน (ไม่สามารถเลื่อนต่อไปได้)
    playEdgeBump() {
        this.playTone(130, 'sawtooth', 0.12, 0.18);
    }

    // เสียงเมื่อข้ามเส้นแบ่งบล็อก 3x3
    playBlockCross() {
        this.playTone(600, 'sine', 0.05, 0.1);
    }

    // เสียงเมื่อกรอกตัวเลขถูกต้อง
    playCorrect() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25]; // C5, E5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.18);
        });
    }

    // เสียงเมื่อเกิดข้อผิดพลาด (ใส่เลขผิด)
    playMistake() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.25);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // เสียงเมื่อเปิด/ปิดโหมดจดบันทึก (Notes Mode)
    playNoteToggle(active) {
        if (!this.enabled) return;
        this.initContext();
        const freq1 = active ? 440 : 550;
        const freq2 = active ? 660 : 330;
        this.playTone(freq1, 'triangle', 0.06, 0.12);
        setTimeout(() => this.playTone(freq2, 'triangle', 0.08, 0.12), 60);
    }

    // เสียงเมื่อใส่/ลบโน้ต
    playNoteEdit() {
        this.playTone(880, 'sine', 0.05, 0.08);
    }

    // เสียงเมื่อลบตัวเลขในช่อง (Erase)
    playErase() {
        this.playTone(280, 'triangle', 0.1, 0.15);
    }

    // เสียงเมื่อกดคำใบ้ (Hint)
    playHint() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0.18, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.2);
        });
    }

    // เสียงเมื่อเติมเต็ม 1 แถว / คอลัมน์ / บล็อก 3x3 สำเร็จ
    playCompletedUnit() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.22, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.09);
            osc.stop(now + i * 0.09 + 0.3);
        });
    }

    // เสียงฉลองเมื่อชนะเกม (Game Won Fanfare)
    playVictory() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const chordNotes = [
            { f: 523.25, d: 0.15, delay: 0 },
            { f: 659.25, d: 0.15, delay: 0.15 },
            { f: 783.99, d: 0.15, delay: 0.3 },
            { f: 1046.50, d: 0.5, delay: 0.45 },
            { f: 880, d: 0.2, delay: 0.75 },
            { f: 1046.50, d: 0.7, delay: 0.95 }
        ];

        const now = this.ctx.currentTime;
        chordNotes.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.f, now + item.delay);
            gain.gain.setValueAtTime(0.25, now + item.delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + item.delay + item.d);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + item.delay);
            osc.stop(now + item.delay + item.d);
        });
    }
}

if (typeof window !== 'undefined') {
    window.SudokuAudio = SudokuAudio;
} else if (typeof module !== 'undefined') {
    module.exports = SudokuAudio;
}
