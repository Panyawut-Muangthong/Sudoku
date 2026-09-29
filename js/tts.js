/**
 * Thai Voice Text-To-Speech (TTS) & ARIA Live Announcer
 * Provides voice announcements for navigation, actions, clues, and errors.
 */

class SudokuTTS {
    constructor() {
        this.synth = window.speechSynthesis || null;
        this.enabled = true;
        this.thaiVoice = null;
        this.rate = 1.1; // ความเร็วเสียงพูดที่กำลังดีสำหรับการเล่นเกม
        this.pitch = 1.0;

        // ค้นหาเสียงภาษาไทยเมื่อโหลด
        this.initVoice();
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.initVoice();
        }

        // Live regions ใน DOM
        this.politeRegion = document.getElementById('aria-live-polite');
        this.assertiveRegion = document.getElementById('aria-live-assertive');
    }

    // ค้นหาเสียงภาษาไทย (th-TH)
    initVoice() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        // ค้นหาเสียงภาษาไทย
        this.thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th')) || null;
    }

    // เปิด / ปิดเสียงบรรยาย
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.synth) {
            this.synth.cancel();
        }
        return this.enabled;
    }

    // พูดข้อความ
    speak(text, priority = false) {
        // อัปเดตข้อความใน ARIA Live Region เสมอ เพื่อให้โปรแกรมอ่านจอภาพ (NVDA / VoiceOver / JAWS) รับรู้
        this.announceAria(text, priority);

        if (!this.enabled || !this.synth) return;

        // ถ้าไม่ใช่ข้อความสำคัญมาก ให้ยกเลิกเสียงเก่าที่กำลังพูดค้างอยู่ เพื่อไม่ให้เสียงค้างเมื่อผู้ใช้กดเลื่อนช่องเร็วๆ
        if (!priority) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        if (this.thaiVoice) {
            utterance.voice = this.thaiVoice;
        }
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        this.synth.speak(utterance);
    }

    // อัปเดต ARIA Live Region
    announceAria(text, priority = false) {
        if (!this.politeRegion) this.politeRegion = document.getElementById('aria-live-polite');
        if (!this.assertiveRegion) this.assertiveRegion = document.getElementById('aria-live-assertive');

        const target = priority ? this.assertiveRegion : this.politeRegion;
        if (target) {
            target.textContent = '';
            // เล็กน้อยเพื่อให้ Screen Reader รับรู้การเปลี่ยนแปลงข้อความ
            setTimeout(() => {
                target.textContent = text;
            }, 30);
        }
    }

    // บรรยายข้อมูลของช่องที่ผู้เล่นโฟกัสอยู่
    announceCell(row, col, value, isGiven, notes = [], isError = false) {
        const block = Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;
        let desc = `แถว ${row + 1} คอลัมน์ ${col + 1}, บล็อก ${block}. `;

        if (isError) {
            desc += `ตัวเลข ${value}, มีข้อผิดพลาด. `;
        } else if (value !== 0) {
            if (isGiven) {
                desc += `ตัวเลข ${value}, เป็นโจทย์ ไม่สามารถแก้ไขได้. `;
            } else {
                desc += `ตัวเลข ${value}, ที่คุณกรอก. `;
            }
        } else {
            desc += `ว่าง. `;
            if (notes && notes.length > 0) {
                desc += `โน้ตตัวเลข: ${notes.join(', ')}. `;
            }
        }

        this.speak(desc, false);
    }

    // บรรยายทั้งแถว (เมื่อกดปุ่ม R)
    announceRow(row, rowValues) {
        const items = rowValues.map((val, idx) => {
            return val === 0 ? `ช่องที่ ${idx + 1} ว่าง` : `ช่องที่ ${idx + 1} เลข ${val}`;
        });
        const text = `แถวที่ ${row + 1}: ${items.join(', ')}`;
        this.speak(text, true);
    }

    // บรรยายทั้งคอลัมน์ (เมื่อกดปุ่ม C)
    announceCol(col, colValues) {
        const items = colValues.map((val, idx) => {
            return val === 0 ? `ช่องที่ ${idx + 1} ว่าง` : `ช่องที่ ${idx + 1} เลข ${val}`;
        });
        const text = `คอลัมน์ที่ ${col + 1}: ${items.join(', ')}`;
        this.speak(text, true);
    }

    // บรรยายทั้งบล็อก 3x3 (เมื่อกดปุ่ม B)
    announceBlock(blockNum, blockValues) {
        const items = blockValues.map((val, idx) => {
            return val === 0 ? `ช่องที่ ${idx + 1} ว่าง` : `ช่องที่ ${idx + 1} เลข ${val}`;
        });
        const text = `บล็อกที่ ${blockNum}: ${items.join(', ')}`;
        this.speak(text, true);
    }
}

if (typeof window !== 'undefined') {
    window.SudokuTTS = SudokuTTS;
} else if (typeof module !== 'undefined') {
    module.exports = SudokuTTS;
}
