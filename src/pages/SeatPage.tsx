import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Save, RotateCcw,
  Star, Flame, X, CheckCircle2, Eye, Pencil, Play, Square, Trash2, LayoutTemplate, Plus, Minus, Rows3, Columns3,
} from 'lucide-react';
import type { Student, GridCell, SeatAssignment, SeatHistoryEntry, ThumbnailData, FrontLevel, BackLevel } from '../types';
import { useStudents } from '../lib/store';
import { useConfig } from '../contexts/ConfigContext';
import { getLevelName } from '../lib/cardLogic';
import {
  createDefaultGridLayout, getSeatPriority, canChooseSeat, DEFAULT_APP_CONFIG,
} from '../data/config';
import { LevelIcon } from '../components/LevelIcon';
import { D, INK } from '../data/theme';

// ===== Teaching week from config =====
function getCurrentTeachingWeek(teachingWeeks: Array<{ weekNumber: number; startDate: string; endDate: string }>): number {
  const now = new Date();
  for (const tw of teachingWeeks) {
    const start = new Date(tw.startDate);
    const end = new Date(tw.endDate);
    end.setHours(23, 59, 59, 999);
    if (now >= start && now <= end) return tw.weekNumber;
  }
  // If not in any week range, calculate from first week start
  if (teachingWeeks.length > 0) {
    const firstStart = new Date(teachingWeeks[0].startDate);
    const diffMs = now.getTime() - firstStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(20, Math.floor(diffDays / 7) + 1));
  }
  return 1;
}

// ===== Layout templates =====
function createAllSingleLayout(): GridCell[] {
  const cells: GridCell[] = [];
  const ROWS = 7;
  const COLS = 13;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = `${r + 1}-${c + 1}`;
      let active = false;
      if (r < 6 && c % 2 === 0) active = true;
      if (r === 6 && c === 6) active = true;
      cells.push({ id, row: r, col: c, active, mergedWith: undefined });
    }
  }
  return cells;
}

// ===== localStorage keys =====
const STORAGE_KEY_GRID_LAYOUT = 'seat-grid-layout';
const STORAGE_KEY_ASSIGNMENTS = 'seat-assignments';
const STORAGE_KEY_HISTORY = 'seat-history';
const STORAGE_KEY_MIGRATED = 'seat-data-migrated-v2';
const OLD_STORAGE_KEY_LAYOUT = 'seat-layout';

// ===== Data migration =====
interface OldDeskUnit {
  id: string;
  row: number;
  col: number;
  type: 'single' | 'double';
}

function migrateOldData(): { cells: GridCell[]; assignments: SeatAssignment[]; history: SeatHistoryEntry[] } | null {
  if (localStorage.getItem(STORAGE_KEY_MIGRATED) === 'true') return null;
  const oldLayoutRaw = localStorage.getItem(OLD_STORAGE_KEY_LAYOUT);
  if (!oldLayoutRaw) {
    localStorage.setItem(STORAGE_KEY_MIGRATED, 'true');
    return null;
  }

  let oldDesks: OldDeskUnit[] = [];
  try { oldDesks = JSON.parse(oldLayoutRaw); } catch { return null; }

  // Build grid cells from old desk layout
  const defaultCells = createDefaultGridLayout();
  const cells: GridCell[] = defaultCells.map(c => ({ ...c }));

  // Map old seat assignments
  const oldAssignRaw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
  let oldAssignments: SeatAssignment[] = [];
  try { oldAssignments = oldAssignRaw ? JSON.parse(oldAssignRaw) : []; } catch {}

  const newAssignments: SeatAssignment[] = oldAssignments.map(a => {
    const oldId: string = a.seatId;
    // Old format: "desk-N-seatA" or "desk-N-seatB"
    const match = oldId.match(/^desk-(\d+)-seat([AB])$/);
    if (!match) return a;
    const deskNum = parseInt(match[1], 10);
    const seatKey = match[2];
    const desk = oldDesks.find(d => d.id === String(deskNum));
    if (!desk) return a;
    // Convert to M-N format
    const row = desk.row;
    const col = desk.col;
    const m = row + 1;
    const n = seatKey === 'A' ? col * 2 + 1 : col * 2 + 2;
    // Adjust: in old system, double desks had seatA and seatB at same col
    // In new system we need to map to grid positions
    // For a double desk at col position, seatA -> first cell, seatB -> second cell
    const newSeatId = `${m}-${n}`;
    return { seatId: newSeatId, studentId: a.studentId };
  });

  // Migrate history entries
  const oldHistoryRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
  let oldHistory: Array<{ date: string; assignments: SeatAssignment[] }> = [];
  try { oldHistory = oldHistoryRaw ? JSON.parse(oldHistoryRaw) : []; } catch {}

  const students = getStudentsStatic();
  const newHistory: SeatHistoryEntry[] = oldHistory.map(entry => {
    const migratedAssignments = entry.assignments.map(a => {
      const match = a.seatId.match(/^desk-(\d+)-seat([AB])$/);
      if (!match) return a;
      const deskNum = parseInt(match[1], 10);
      const seatKey = match[2];
      const desk = oldDesks.find(d => d.id === String(deskNum));
      if (!desk) return a;
      const m = desk.row + 1;
      const n = seatKey === 'A' ? desk.col * 2 + 1 : desk.col * 2 + 2;
      return { seatId: `${m}-${n}`, studentId: a.studentId };
    });
    return {
      date: entry.date,
      assignments: migratedAssignments,
      layout: [...cells],
      thumbnailData: buildThumbnailData(cells, migratedAssignments, students, DEFAULT_APP_CONFIG.seatPriorityMap),
    };
  });

  localStorage.setItem(STORAGE_KEY_MIGRATED, 'true');
  return { cells, assignments: newAssignments, history: newHistory };
}

function getStudentsStatic(): Student[] {
  try {
    const raw = localStorage.getItem('students');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// ===== localStorage helpers =====
function loadGridLayout(): GridCell[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GRID_LAYOUT);
    if (raw) return JSON.parse(raw);
  } catch {}
  return createDefaultGridLayout();
}

function saveGridLayout(cells: GridCell[]) {
  localStorage.setItem(STORAGE_KEY_GRID_LAYOUT, JSON.stringify(cells));
}

function loadAssignments(): SeatAssignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveAssignments(assignments: SeatAssignment[]) {
  localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
}

function loadHistory(): SeatHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveHistoryToStorage(history: SeatHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

// ===== buildThumbnailData helper =====
function buildThumbnailData(cells: GridCell[], assignments: SeatAssignment[], students: Student[], seatPriorityMap: Record<string, number>): ThumbnailData {
  const rows = cells.reduce((max, c) => Math.max(max, c.row), 0) + 1;
  const cols = cells.reduce((max, c) => Math.max(max, c.col), 0) + 1;

  const thumbnailCells: ThumbnailData['cells'] = cells.map(cell => {
    const assignment = assignments.find(a => a.seatId === cell.id);
    const student = assignment ? students.find(s => s.id === assignment.studentId) : undefined;
    return {
      row: cell.row,
      col: cell.col,
      active: cell.active,
      merged: cell.mergedWith === 'right',
      studentName: student?.name,
      priority: student ? getSeatPriority(student.cardSide, student.currentLevel, seatPriorityMap) : undefined,
    };
  });

  return { rows, cols, cells: thumbnailCells };
}

// ===== GridHeader helpers for edit mode (rendered as grid cells) =====
const HEADER_BTN_STYLE = {
  padding: '2px 0', borderRadius: D.radiusXs, fontSize: 9, cursor: 'pointer' as const,
  display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  fontFamily: "'LXGW WenKai', 'Cinzel', serif" as const,
};

function headerStyle(allActive: boolean) {
  return {
    ...HEADER_BTN_STYLE,
    background: allActive ? 'rgba(139,170,122,0.15)' : INK.flameFaint,
    border: `1px solid ${allActive ? 'rgba(139,170,122,0.3)' : 'rgba(196,65,37,0.2)'}`,
    color: allActive ? '#8baa7a' : INK.flameCinnabar,
  };
}

// ===== Priority color helpers =====
function priorityColor(priority: number): string {
  if (priority <= 3) return INK.starGold;
  if (priority <= 8) return INK.starBlue;
  return INK.flameCinnabar;
}

function priorityBorderColor(priority: number, alpha = 0.4): string {
  if (priority <= 3) return `rgba(212, 168, 83, ${alpha})`;
  if (priority <= 8) return `rgba(123, 139, 181, ${alpha})`;
  return `rgba(196, 65, 37, ${alpha})`;
}

function priorityBgColor(priority: number, alpha = 0.06): string {
  if (priority <= 3) return `rgba(212, 168, 83, ${alpha})`;
  if (priority <= 8) return `rgba(123, 139, 181, ${alpha})`;
  return `rgba(196, 65, 37, ${alpha})`;
}

// ===== ThumbnailMiniMap component =====
function ThumbnailMiniMap({
  data,
  onClick,
}: {
  data: ThumbnailData;
  onClick?: () => void;
}) {
  const cellSize = 10;
  const width = data.cols * cellSize;
  const height = data.rows * cellSize;

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        display: 'grid',
        gridTemplateColumns: `repeat(${data.cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${data.rows}, ${cellSize}px)`,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: D.radiusSm,
        overflow: 'hidden',
        border: `1px solid ${INK.border}`,
        background: `${INK.bgDeep}80`,
      }}
    >
      {Array.from({ length: data.rows * data.cols }, (_, i) => {
        const r = Math.floor(i / data.cols);
        const c = i % data.cols;
        const cell = data.cells.find(ch => ch.row === r && ch.col === c);
        if (!cell || !cell.active) {
          return <div key={i} style={{ width: cellSize, height: cellSize / 2, background: 'transparent' }} />;
        }
        if (cell.merged) {
          return <div key={i} style={{ width: cellSize, height: cellSize / 2, background: 'transparent' }} />;
        }
        const bgColor = cell.priority
          ? priorityBgColor(cell.priority, 0.3)
          : INK.border;
        const nameChar = cell.studentName ? cell.studentName[0] : '';
        return (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize / 2,
              background: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 5,
              color: cell.priority ? priorityColor(cell.priority) : INK.textMuted,
              fontWeight: 700,
              lineHeight: 1,
              overflow: 'hidden',
              gridColumn: cell.merged ? 'span 2' : undefined,
            }}
            title={cell.studentName || ''}
          >
            {nameChar}
          </div>
        );
      })}
    </div>
  );
}

// ===== EnlargedThumbnailModal =====
function EnlargedThumbnailModal({
  entry,
  students: _students,
  onClose,
}: {
  entry: SeatHistoryEntry;
  students: Student[];
  onClose: () => void;
}) {
  const cellSize = 48;
  const cols = entry.thumbnailData.cols;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%', maxWidth: 800, maxHeight: '85vh',
          background: D.bgCard, borderRadius: D.radius, border: D.glassBorder,
          padding: 24, overflowY: 'auto', fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          backdropFilter: D.glassBlur,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: INK.textPrimary, margin: 0 }}>
            {new Date(entry.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: INK.textMuted }}>
            <X size={20} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gap: 3,
          justifyContent: 'center',
        }}>
          {Array.from({ length: entry.thumbnailData.rows * entry.thumbnailData.cols }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const cell = entry.thumbnailData.cells.find(ch => ch.row === r && ch.col === c);
            if (!cell || !cell.active) {
              return <div key={i} style={{ width: cellSize, height: cellSize * 0.6 }} />;
            }
            if (cell.merged) {
              return <div key={i} style={{ display: 'none' }} />;
            }
            const bgColor = cell.priority ? priorityBgColor(cell.priority, 0.12) : INK.washWarm;
            const borderColor = cell.priority ? priorityBorderColor(cell.priority, 0.3) : INK.border;
            return (
              <div
                key={i}
                style={{
                  width: cellSize,
                  height: cellSize * 0.6,
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: D.radiusSm,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: cell.priority ? priorityColor(cell.priority) : INK.textMuted,
                  fontWeight: 600,
                  overflow: 'hidden',
                  gridColumn: cell.merged ? 'span 2' : undefined,
                }}
              >
                {cell.studentName && <span style={{ fontSize: 10, lineHeight: 1.1 }}>{cell.studentName}</span>}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== HistoryModal with thumbnails =====
function HistoryModal({
  history,
  students,
  onClose,
  onDelete,
}: {
  history: SeatHistoryEntry[];
  students: Student[];
  onClose: () => void;
  onDelete: (index: number) => void;
}) {
  const config = useConfig();
  const [enlargedEntry, setEnlargedEntry] = useState<SeatHistoryEntry | null>(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '90%', maxWidth: 700, maxHeight: '80vh',
            background: D.bgCard, borderRadius: D.radius, border: D.glassBorder,
            padding: 24, overflowY: 'auto', fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            backdropFilter: D.glassBlur,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: INK.textPrimary, margin: 0 }}>
              <History size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              排座历史记录
            </h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: INK.textMuted }}>
              <X size={20} />
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: INK.textMuted, padding: 40 }}>暂无历史记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.slice().reverse().map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16, borderRadius: D.radiusSm,
                    background: `${INK.bgDeep}80`, border: `1px solid ${INK.border}`,
                    display: 'flex', gap: 16, alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <ThumbnailMiniMap
                      data={entry.thumbnailData}
                      onClick={() => setEnlargedEntry(entry)}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: INK.textPrimary }}>
                        {new Date(entry.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        {entry.teachingWeek && <span style={{ marginLeft: 8, fontSize: 12, color: INK.starGold }}>第{entry.teachingWeek}周</span>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(history.length - 1 - idx); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: INK.textMuted, padding: 4 }}
                        title="删除此记录"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {entry.assignments.map(a => {
                        const student = students.find(s => s.id === a.studentId);
                        if (!student) return null;
                        const p = getSeatPriority(student.cardSide, student.currentLevel, config.seatPriorityMap);
                        return (
                          <span key={a.seatId} style={{
                            padding: '2px 8px', borderRadius: D.radiusSm, fontSize: 12,
                            background: priorityBgColor(p, 0.1), color: priorityColor(p),
                            border: `1px solid ${priorityBorderColor(p, 0.2)}`,
                          }}>
                            {a.seatId}: {student.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {enlargedEntry && (
          <EnlargedThumbnailModal
            entry={enlargedEntry}
            students={students}
            onClose={() => setEnlargedEntry(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ===== CurrentAssignBanner =====
function CurrentAssignBanner({
  currentStudent,
  nextStudent,
  seatPriorityMap,
  frontLevels: _frontLevels,
  backLevels: _backLevels,
}: {
  currentStudent: Student | null;
  nextStudent: Student | null;
  seatPriorityMap: Record<string, number>;
  frontLevels: FrontLevel[];
  backLevels: BackLevel[];
}) {
  if (!currentStudent) return null;
  const priority = getSeatPriority(currentStudent.cardSide, currentStudent.currentLevel, seatPriorityMap);

  return (
    <div style={{
      padding: '10px 12px', borderRadius: D.radiusSm,
      background: INK.starGoldFaint, border: `1px solid ${INK.borderStrong}`,
      marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
    }}>
      <div style={{ fontSize: 12, color: INK.starGold, marginBottom: 4 }}>当前选座</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LevelIcon side={currentStudent.cardSide} level={currentStudent.currentLevel} size={20} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK.textPrimary }}>{currentStudent.name}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: priorityColor(priority),
            marginLeft: 8, padding: '1px 6px', borderRadius: D.radiusSm,
            background: priorityBgColor(priority, 0.15), border: `1px solid ${priorityBorderColor(priority, 0.3)}`,
          }}>
            #{priority}
          </span>
        </div>
      </div>
      {nextStudent && (
        <div style={{ fontSize: 11, color: INK.textMuted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          下一位: <span style={{ color: INK.textSecondary }}>{nextStudent.name}</span>
        </div>
      )}
    </div>
  );
}

// ===== StudentTag =====
function StudentTag({
  student,
  isSelected,
  isAssigned,
  isSkipped,
  assignedSeatLabel,
  onClick,
  onSkip,
  seatPriorityMap,
  chooseThreshold,
  frontLevels,
  backLevels,
  rankInGroup,
}: {
  student: Student;
  isSelected: boolean;
  isAssigned: boolean;
  isSkipped?: boolean;
  assignedSeatLabel?: string;
  onClick: () => void;
  onSkip?: () => void;
  seatPriorityMap: Record<string, number>;
  chooseThreshold: number;
  frontLevels: FrontLevel[];
  backLevels: BackLevel[];
  rankInGroup?: number;
}) {
  const priority = getSeatPriority(student.cardSide, student.currentLevel, seatPriorityMap);
  const canChoose = priority <= chooseThreshold;
  const borderColor = isSelected
    ? 'rgba(212, 168, 83, 0.5)'
    : isSkipped ? INK.border : priorityBorderColor(priority, isAssigned ? 0.15 : 0.4);
  const bgColor = isSelected
    ? 'rgba(212, 168, 83, 0.15)'
    : isSkipped ? 'rgba(16,19,31,0.3)' : priorityBgColor(priority, isAssigned ? 0.02 : 0.06);
  const textColor = priority <= 3 ? INK.flameGold : priority <= 8 ? INK.starSilver : '#e07060';

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = D.goldGlow; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
      style={{
        padding: '8px 12px',
        borderRadius: D.radiusSm,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: isSkipped ? 0.4 : isAssigned ? 0.5 : 1,
        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        textDecoration: isSkipped ? 'line-through' : 'none',
        transition: 'transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <LevelIcon side={student.cardSide} level={student.currentLevel} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isSkipped ? INK.textMuted : isSelected ? INK.starGold : INK.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {student.name}
          {isSkipped && <span style={{ fontSize: 10, color: INK.flameEmber, marginLeft: 6 }}>跳过</span>}
        </div>
        <div style={{ fontSize: 11, color: textColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          {student.cardSide === 'front' ? <Star size={9} /> : <Flame size={9} />}
          {getLevelName(student.cardSide, student.currentLevel, frontLevels, backLevels)}
          {!canChoose && <span style={{ color: INK.flameCinnabar, fontWeight: 600, marginLeft: 4 }}>需指定</span>}
        </div>
      </div>
      {isAssigned && assignedSeatLabel && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: INK.textMuted,
          padding: '1px 5px', borderRadius: D.radiusSm,
          background: INK.washWarm,
        }}>
          {assignedSeatLabel}
        </span>
      )}
      {!isAssigned && !isSkipped && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: textColor,
          padding: '1px 6px', borderRadius: D.radiusSm,
          background: priorityBgColor(priority, 0.1), border: `1px solid ${priorityBorderColor(priority, 0.3)}`,
        }}>
          #{priority}{rankInGroup != null ? `·第${rankInGroup}位` : ''}
        </span>
      )}
      {onSkip && !isAssigned && (
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          style={{
            padding: '2px 6px', borderRadius: 2, fontSize: 10, cursor: 'pointer',
            background: isSkipped ? 'rgba(139,170,122,0.12)' : 'rgba(196,65,37,0.08)',
            border: `1px solid ${isSkipped ? 'rgba(139,170,122,0.3)' : 'rgba(196,65,37,0.2)'}`,
            color: isSkipped ? '#8baa7a' : INK.textMuted,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}
        >
          {isSkipped ? '恢复' : '跳过'}
        </button>
      )}
    </div>
  );
}

// ===== Main SeatPage =====
export default function SeatPage() {
  const { students } = useStudents();
  const config = useConfig();

  // Run migration on first load
  const migrationResult = useMemo(() => migrateOldData(), []);
  const initialGrid = useMemo(() => migrationResult?.cells ?? loadGridLayout(), [migrationResult]);
  const initialAssign = useMemo(() => migrationResult?.assignments ?? loadAssignments(), [migrationResult]);
  const initialHist = useMemo(() => migrationResult?.history ?? loadHistory(), [migrationResult]);

  const [gridCells, setGridCells] = useState<GridCell[]>(initialGrid);
  const [assignments, setAssignments] = useState<SeatAssignment[]>(initialAssign);
  const [history, setHistory] = useState<SeatHistoryEntry[]>(initialHist);

  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [referenceData, setReferenceData] = useState<Map<string, string> | null>(null);

  // Auto-advance assignment state
  const [assignPhase, setAssignPhase] = useState<'idle' | 'assigning' | 'complete' | 'paused-skip'>('idle');
  const [currentAssignIndex, setCurrentAssignIndex] = useState(0);

  // Save notification
  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const [saveNoticeText, setSaveNoticeText] = useState('已自动保存');

  // Drag-to-merge state
  const [mergeDragSource, setMergeDragSource] = useState<string | null>(null);

  // Drag-to-swap state
  const [swapDragSource, setSwapDragSource] = useState<string | null>(null);
  const [swapDragTarget, setSwapDragTarget] = useState<string | null>(null);

  // Skip state for seating arrangement
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('seat_skipped');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleSkip = (id: string) => {
    setSkippedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('seat_skipped', JSON.stringify([...next]));
      return next;
    });
  };

  // Persist
  useEffect(() => { saveGridLayout(gridCells); }, [gridCells]);
  useEffect(() => { saveAssignments(assignments); }, [assignments]);

  // ===== Row/Column batch operations =====
  const maxRow = gridCells.reduce((m, c) => Math.max(m, c.row), 0);
  const maxCol = gridCells.reduce((m, c) => Math.max(m, c.col), 0);
  const ROWS = maxRow + 1;
  const COLS = maxCol + 1;

  const toggleRow = (row: number) => {
    const rowCells = gridCells.filter(c => c.row === row);
    const wasAllActive = rowCells.every(c => c.active);
    const newActive = !wasAllActive;
    setGridCells(prev => prev.map(c => {
      if (c.row === row) return { ...c, active: newActive, mergedWith: undefined };
      // Unmerge partners in adjacent rows whose merge crosses into this row
      // (Merges are horizontal, so a cell above/below may have mergedWith if
      //  its row-partner was in this row — not typical but handle defensively)
      if (c.mergedWith === 'left' || c.mergedWith === 'right') {
        const partnerCol = c.mergedWith === 'right' ? c.col + 1 : c.col - 1;
        const partnerInRow = prev.some(p => p.row === row && p.col === partnerCol);
        if (partnerInRow) return { ...c, active: true, mergedWith: undefined };
      }
      return c;
    }));
    if (wasAllActive) {
      const rowCellIds = new Set(rowCells.map(c => c.id));
      setAssignments(prev => prev.filter(a => !rowCellIds.has(a.seatId)));
    }
  };

  const toggleCol = (col: number) => {
    const colCells = gridCells.filter(c => c.col === col);
    const wasAllActive = colCells.every(c => c.active);
    const newActive = !wasAllActive;
    setGridCells(prev => prev.map(c => {
      if (c.col === col) return { ...c, active: newActive, mergedWith: undefined };
      // Unmerge left neighbor (col-1) that was merged right into this column
      if (c.col === col - 1 && c.mergedWith === 'right') {
        return { ...c, mergedWith: undefined };
      }
      // Unmerge right neighbor (col+1) that was merged left into this column
      if (c.col === col + 1 && c.mergedWith === 'left') {
        return { ...c, active: true, mergedWith: undefined };
      }
      return c;
    }));
    if (wasAllActive) {
      const colCellIds = new Set(colCells.map(c => c.id));
      setAssignments(prev => prev.filter(a => !colCellIds.has(a.seatId)));
    }
  };

  const addRow = () => {
    const newRow = maxRow + 1;
    const newCells: GridCell[] = [];
    for (let c = 0; c < COLS; c++) {
      newCells.push({ id: `${newRow + 1}-${c + 1}`, row: newRow, col: c, active: true });
    }
    setGridCells(prev => [...prev, ...newCells]);
  };

  const removeLastRow = () => {
    const lastRowCells = gridCells.filter(c => c.row === maxRow);
    const hasAssignments = lastRowCells.some(c => assignments.some(a => a.seatId === c.id));
    if (hasAssignments) {
      if (!window.confirm('末行有座位分配，确定删除？')) return;
      const lastRowIds = new Set(lastRowCells.map(c => c.id));
      setAssignments(prev => prev.filter(a => !lastRowIds.has(a.seatId)));
    }
    setGridCells(prev => prev.filter(c => c.row !== maxRow));
  };

  const addCol = () => {
    const newCol = maxCol + 1;
    const newCells: GridCell[] = [];
    for (let r = 0; r < ROWS; r++) {
      newCells.push({ id: `${r + 1}-${newCol + 1}`, row: r, col: newCol, active: true });
    }
    setGridCells(prev => [...prev, ...newCells]);
  };

  const removeLastCol = () => {
    const lastColCells = gridCells.filter(c => c.col === maxCol);
    const hasAssignments = lastColCells.some(c => assignments.some(a => a.seatId === c.id));
    if (hasAssignments) {
      if (!window.confirm('末列有座位分配，确定删除？')) return;
      const lastColIds = new Set(lastColCells.map(c => c.id));
      setAssignments(prev => prev.filter(a => !lastColIds.has(a.seatId)));
    }
    setGridCells(prev => prev.filter(c => c.col !== maxCol));
  };

  // Priority-sorted student list
  const priorityOrder = useMemo(() =>
    [...students].filter(s => !skippedIds.has(s.id)).sort((a, b) => {
      const pa = getSeatPriority(a.cardSide, a.currentLevel, config.seatPriorityMap);
      const pb = getSeatPriority(b.cardSide, b.currentLevel, config.seatPriorityMap);
      if (pa !== pb) return pa - pb;
      // Same level tiebreaker: sub-score (shields - eclipses / sparks - demon marks)
      if (a.cardSide === 'front') {
        // 星辉典范(正1)用累积护盾排名，不因兑换而降
        if (a.currentLevel === 1 && b.currentLevel === 1) {
          const shieldSumA = a.starShields + (a.totalShieldsExchanged || 0);
          const shieldSumB = b.starShields + (b.totalShieldsExchanged || 0);
          const subA = shieldSumA - a.totalBlanksEverFilled;
          const subB = shieldSumB - b.totalBlanksEverFilled;
          if (subA !== subB) return subB - subA;
          if (shieldSumA !== shieldSumB) return shieldSumB - shieldSumA;
          return b.consecutiveNoViolationDays - a.consecutiveNoViolationDays;
        }
        const subA = a.starShields - a.blanksFilled;
        const subB = b.starShields - b.blanksFilled;
        if (subA !== subB) return subB - subA;
        if (a.starShields !== b.starShields) return b.starShields - a.starShields;
        return b.consecutiveNoViolationDays - a.consecutiveNoViolationDays;
      } else {
        // 不朽晨辉(背6)用累积传承值排名
        if (a.currentLevel === 6 && b.currentLevel === 6) {
          const heritageSumA = a.heritagePoints + a.totalHeritageDonated;
          const heritageSumB = b.heritagePoints + b.totalHeritageDonated;
          const subA = heritageSumA - a.heartDemonMarks;
          const subB = heritageSumB - b.heartDemonMarks;
          if (subA !== subB) return subB - subA;
          if (heritageSumA !== heritageSumB) return heritageSumB - heritageSumA;
          return b.consecutiveNoViolationDays - a.consecutiveNoViolationDays;
        }
        const subA = a.cumulativeChecks - a.heartDemonMarks;
        const subB = b.cumulativeChecks - b.heartDemonMarks;
        if (subA !== subB) return subB - subA;
        if (a.cumulativeChecks !== b.cumulativeChecks) return b.cumulativeChecks - a.cumulativeChecks;
        return b.consecutiveNoViolationDays - a.consecutiveNoViolationDays;
      }
    }),
    [students, config.seatPriorityMap, skippedIds]
  );

  // Skipped students
  const skippedStudents = useMemo(() =>
    [...students].filter(s => skippedIds.has(s.id)).sort((a, b) => a.number - b.number),
    [students, skippedIds]
  );

  // Assigned student IDs
  const assignedIds = useMemo(() => new Set(assignments.map(a => a.studentId)), [assignments]);

  // Performance: O(1) lookup maps
  const assignmentMap = useMemo(() => {
    const m = new Map<string, SeatAssignment>();
    for (const a of assignments) m.set(a.seatId, a);
    return m;
  }, [assignments]);

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  // Unassigned students (sorted by priority)
  const unassignedStudents = useMemo(() =>
    priorityOrder.filter(s => !assignedIds.has(s.id)),
    [priorityOrder, assignedIds]
  );

  // Self-choosing group (priority 1-N)
  const selfChoosing = useMemo(() =>
    unassignedStudents.filter(s => canChooseSeat(s.cardSide, s.currentLevel, config.seatPriorityMap, config.chooseThreshold)),
    [unassignedStudents, config.seatPriorityMap, config.chooseThreshold]
  );

  // Teacher-assigned group
  const teacherAssigned = useMemo(() =>
    unassignedStudents.filter(s => !canChooseSeat(s.cardSide, s.currentLevel, config.seatPriorityMap, config.chooseThreshold)),
    [unassignedStudents, config.seatPriorityMap, config.chooseThreshold]
  );

  // Rank within same priority group (for display), with tied ranks (8,8,10)
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    let lastPriority = -1;
    let rankInGroup = 0;
    let countInGroup = 0;
    let lastSubScore = 0;
    for (const s of priorityOrder) {
      const p = getSeatPriority(s.cardSide, s.currentLevel, config.seatPriorityMap);
      const subScore = s.cardSide === 'front'
        ? s.starShields - s.blanksFilled
        : s.cumulativeChecks - s.heartDemonMarks;
      if (p !== lastPriority) {
        rankInGroup = 1;
        countInGroup = 1;
        lastPriority = p;
        lastSubScore = subScore;
      } else {
        countInGroup++;
        if (subScore !== lastSubScore) {
          rankInGroup = countInGroup;
          lastSubScore = subScore;
        }
      }
      map.set(s.id, rankInGroup);
    }
    return map;
  }, [priorityOrder, config.seatPriorityMap]);

  // Current student for auto-advance
  const currentAssignStudent = useMemo(() => {
    if (assignPhase !== 'assigning') return null;
    if (currentAssignIndex >= priorityOrder.length) return null;
    return priorityOrder[currentAssignIndex];
  }, [assignPhase, currentAssignIndex, priorityOrder]);

  const nextAssignStudent = useMemo(() => {
    if (assignPhase !== 'assigning') return null;
    const nextIdx = currentAssignIndex + 1;
    if (nextIdx >= priorityOrder.length) return null;
    return priorityOrder[nextIdx];
  }, [assignPhase, currentAssignIndex, priorityOrder]);

  // Get assignment for a seat
  const getAssignmentForSeat = useCallback((seatId: string): SeatAssignment | undefined => {
    return assignmentMap.get(seatId);
  }, [assignmentMap]);

  // Get seat label for a student
  const studentSeatMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assignments) m.set(a.studentId, a.seatId);
    return m;
  }, [assignments]);

  const getSeatLabelForStudent = useCallback((studentId: string): string | undefined => {
    return studentSeatMap.get(studentId);
  }, [studentSeatMap]);

  // Grid dimensions
  const gridRows = useMemo(() => gridCells.reduce((max, c) => Math.max(max, c.row), 0) + 1, [gridCells]);
  const gridCols = useMemo(() => gridCells.reduce((max, c) => Math.max(max, c.col), 0) + 1, [gridCells]);

  // ===== Assign current student to seat =====
  const assignCurrentToSeat = useCallback((seatId: string) => {
    if (assignPhase !== 'assigning' || !currentAssignStudent) return;
    const studentId = currentAssignStudent.id;

    setAssignments(prev => {
      const withoutSeat = prev.filter(a => a.seatId !== seatId);
      const withoutStudent = withoutSeat.filter(a => a.studentId !== studentId);
      return [...withoutStudent, { seatId, studentId }];
    });

    // Advance to next unassigned student
    let nextIdx = currentAssignIndex + 1;
    while (nextIdx < priorityOrder.length && assignedIds.has(priorityOrder[nextIdx].id)) {
      nextIdx++;
    }
    if (nextIdx >= priorityOrder.length) {
      // Check if there are skipped students without seats
      const skippedWithoutSeat = [...skippedIds].filter(id => !assignedIds.has(id));
      if (skippedWithoutSeat.length > 0) {
        setAssignPhase('paused-skip');
      } else {
        setAssignPhase('complete');
      }
    } else {
      setCurrentAssignIndex(nextIdx);
    }
  }, [assignPhase, currentAssignStudent, currentAssignIndex, priorityOrder, assignedIds]);

  // ===== Manual student jump =====
  const jumpToStudent = useCallback((studentId: string) => {
    const idx = priorityOrder.findIndex(s => s.id === studentId);
    if (idx >= 0) {
      setCurrentAssignIndex(idx);
    }
  }, [priorityOrder]);

  // ===== Auto-complete check (all students including skipped have seats) =====
  useEffect(() => {
    if (assignPhase === 'assigning' && assignments.length >= students.length && students.length > 0) {
      setAssignPhase('complete');
    }
  }, [assignPhase, assignments.length, students.length]);

  // ===== Auto-save when truly complete =====
  const triggerSaveNotice = useCallback((text: string) => {
    setSaveNoticeText(text);
    setShowSaveNotice(true);
    setTimeout(() => setShowSaveNotice(false), 2500);
  }, []);

  useEffect(() => {
    if (assignPhase === 'complete') {
      // Auto-save
      const thumbnail = buildThumbnailData(gridCells, assignments, students, config.seatPriorityMap);
      const entry: SeatHistoryEntry = {
        date: new Date().toISOString(),
        assignments: [...assignments],
        layout: [...gridCells],
        thumbnailData: thumbnail,
      };
      const newHistory = [...history, entry];
      setHistory(newHistory);
      saveHistoryToStorage(newHistory);
      triggerSaveNotice('已自动保存');
      setAssignPhase('idle');
      setCurrentAssignIndex(0);
    }
  }, [assignPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Start assigning =====
  const startAssigning = useCallback(() => {
    // Find first unassigned student
    const firstUnassigned = priorityOrder.findIndex(s => !assignedIds.has(s.id));
    if (firstUnassigned < 0) return;
    setCurrentAssignIndex(firstUnassigned);
    setAssignPhase('assigning');
  }, [priorityOrder, assignedIds]);

  const stopAssigning = useCallback(() => {
    setAssignPhase('idle');
    setCurrentAssignIndex(0);
  }, []);

  // ===== Manual save =====
  const saveToHistory = useCallback(() => {
    const thumbnail = buildThumbnailData(gridCells, assignments, students, config.seatPriorityMap);
    const entry: SeatHistoryEntry = {
      date: new Date().toISOString(),
      assignments: [...assignments],
      layout: [...gridCells],
      thumbnailData: thumbnail,
      teachingWeek: getCurrentTeachingWeek(config.teachingWeeks),
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);
    saveHistoryToStorage(newHistory);
    triggerSaveNotice('已保存');
  }, [gridCells, assignments, students, history]);

  // ===== Start new week =====
  const startNewWeek = useCallback(() => {
    // Save current first
    const thumbnail = buildThumbnailData(gridCells, assignments, students, config.seatPriorityMap);
    const entry: SeatHistoryEntry = {
      date: new Date().toISOString(),
      assignments: [...assignments],
      layout: [...gridCells],
      thumbnailData: thumbnail,
      teachingWeek: getCurrentTeachingWeek(config.teachingWeeks),
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);
    saveHistoryToStorage(newHistory);

    // Set reference data (previous student placements)
    const refMap = new Map<string, string>();
    assignments.forEach(a => {
      const student = students.find(s => s.id === a.studentId);
      if (student) refMap.set(a.seatId, student.name);
    });
    setReferenceData(refMap);
    setShowReference(true);

    // Clear assignments
    setAssignments([]);
    setAssignPhase('idle');
    setCurrentAssignIndex(0);
  }, [gridCells, assignments, students, history]);

  // ===== Edit mode: toggle cell active =====
  const handleCellClick = useCallback((cell: GridCell) => {
    if (!editMode) return;

    if (cell.mergedWith === 'left') {
      // Clicking the absorbed half: unmerge
      setGridCells(prev => prev.map(c => {
        if (c.id === cell.id) return { ...c, active: true, mergedWith: undefined };
        // Find the right-merged neighbor in same row, col-1
        if (c.row === cell.row && c.col === cell.col - 1 && c.mergedWith === 'right') {
          return { ...c, mergedWith: undefined };
        }
        return c;
      }));
      return;
    }

    if (cell.mergedWith === 'right') {
      // Clicking merged cell: unmerge
      setGridCells(prev => prev.map(c => {
        if (c.id === cell.id) return { ...c, mergedWith: undefined };
        if (c.row === cell.row && c.col === cell.col + 1 && c.mergedWith === 'left') {
          return { ...c, active: true, mergedWith: undefined };
        }
        return c;
      }));
      return;
    }

    // Toggle active
    if (cell.active) {
      // Deactivating: first unmerge if merged, then remove assignments
      setGridCells(prev => prev.map(c => {
        if (c.id === cell.id) return { ...c, active: false, mergedWith: undefined };
        // Unmerge right neighbor
        if (c.row === cell.row && c.col === cell.col + 1 && c.mergedWith === 'left') {
          return { ...c, active: true, mergedWith: undefined };
        }
        return c;
      }));
      // Remove assignments for this seat
      setAssignments(prev => prev.filter(a => a.seatId !== cell.id));
    } else {
      // Activate
      setGridCells(prev => prev.map(c => {
        if (c.id === cell.id) return { ...c, active: true };
        return c;
      }));
    }
  }, [editMode]);

  // ===== Edit mode: merge via drag =====
  const handleMergeDragStart = useCallback((cellId: string) => {
    if (!editMode) return;
    setMergeDragSource(cellId);
  }, [editMode]);

  const handleMergeDragOver = useCallback((e: React.DragEvent, cell: GridCell) => {
    if (!editMode || !mergeDragSource) return;
    e.preventDefault();
    // Only allow drop on right adjacent active cell
    const sourceCell = gridCells.find(c => c.id === mergeDragSource);
    if (sourceCell && cell.active && !cell.mergedWith && cell.row === sourceCell.row && cell.col === sourceCell.col + 1) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, [editMode, mergeDragSource, gridCells]);

  const handleMergeDrop = useCallback((e: React.DragEvent, targetCell: GridCell) => {
    e.preventDefault();
    if (!editMode || !mergeDragSource) return;
    const sourceCell = gridCells.find(c => c.id === mergeDragSource);
    if (!sourceCell) return;

    if (targetCell.active && !targetCell.mergedWith && targetCell.row === sourceCell.row && targetCell.col === sourceCell.col + 1) {
      // Merge: source gets mergedWith='right', target gets mergedWith='left'
      setGridCells(prev => prev.map(c => {
        if (c.id === sourceCell.id) return { ...c, mergedWith: 'right' };
        if (c.id === targetCell.id) return { ...c, mergedWith: 'left' };
        return c;
      }));
      // Remove assignment from the absorbed cell
      setAssignments(prev => prev.filter(a => a.seatId !== targetCell.id));
    }
    setMergeDragSource(null);
  }, [editMode, mergeDragSource, gridCells]);

  const handleMergeDragEnd = useCallback(() => {
    setMergeDragSource(null);
  }, []);

  // ===== Drag-to-swap =====
  const handleSwapDragStart = useCallback((seatId: string) => {
    if (editMode) return;
    setSwapDragSource(seatId);
  }, [editMode]);

  const handleSwapDragOver = useCallback((e: React.DragEvent, seatId: string) => {
    if (editMode || !swapDragSource || swapDragSource === seatId) return;
    e.preventDefault();
    setSwapDragTarget(seatId);
  }, [editMode, swapDragSource]);

  const handleSwapDrop = useCallback((e: React.DragEvent, targetSeatId: string) => {
    e.preventDefault();
    if (!swapDragSource || swapDragSource === targetSeatId) return;
    const sourceAssignment = assignments.find(a => a.seatId === swapDragSource);
    if (!sourceAssignment) {
      setSwapDragSource(null);
      setSwapDragTarget(null);
      return;
    }
    const targetAssignment = assignments.find(a => a.seatId === targetSeatId);

    if (targetAssignment) {
      // Swap: both seats have students
      setAssignments(prev => prev.map(a => {
        if (a.seatId === swapDragSource) return { ...a, studentId: targetAssignment.studentId };
        if (a.seatId === targetSeatId) return { ...a, studentId: sourceAssignment.studentId };
        return a;
      }));
    } else {
      // Move: target is empty — remove from source, add to target
      setAssignments(prev => {
        const withoutSource = prev.filter(a => a.seatId !== swapDragSource);
        return [...withoutSource, { seatId: targetSeatId, studentId: sourceAssignment.studentId }];
      });
    }
    setSwapDragSource(null);
    setSwapDragTarget(null);
  }, [swapDragSource, assignments]);

  const handleSwapDragEnd = useCallback(() => {
    setSwapDragSource(null);
    setSwapDragTarget(null);
  }, []);

  // ===== Seat click handler (non-edit mode) =====
  const handleSeatSlotClick = useCallback((seatId: string) => {
    if (editMode) return;

    const existingAssignment = getAssignmentForSeat(seatId);

    if (assignPhase === 'assigning') {
      if (!existingAssignment) {
        assignCurrentToSeat(seatId);
      }
      return;
    }

    // Click occupied seat to remove
    if (existingAssignment) {
      setAssignments(prev => prev.filter(a => a.seatId !== seatId));
    }
  }, [editMode, assignPhase, getAssignmentForSeat, assignCurrentToSeat]);

  // ===== Grid cell component =====
  const renderCell = (cell: GridCell, rowOffset: number = 1, colOffset: number = 1) => {
    // Merged-left cells are hidden
    if (cell.mergedWith === 'left') {
      return (
        <div
          key={cell.id}
          style={{
            gridRow: cell.row + rowOffset,
            gridColumn: cell.col + colOffset,
            display: 'none',
          }}
        />
      );
    }

    // Inactive cells
    if (!cell.active) {
      if (editMode) {
        return (
          <div
            key={cell.id}
            onClick={() => handleCellClick(cell)}
            style={{
              gridRow: cell.row + rowOffset,
              gridColumn: cell.col + colOffset,
              minHeight: 56,
              border: `2px dashed ${INK.flameFaint.replace('0.12', '0.3')}`,
              borderRadius: D.radiusSm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(0,0,0,0.35)',
              fontSize: 10,
              color: INK.textMuted,
              transition: 'background 0.15s',
              position: 'relative',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            <X size={14} style={{ color: 'rgba(196,65,37,0.4)' }} />
            <span style={{ position: 'absolute', bottom: 2, fontSize: 8, color: INK.textMuted }}>{cell.id}</span>
          </div>
        );
      }
      // Normal mode: invisible but occupies space
      return (
        <div
          key={cell.id}
          style={{
            gridRow: cell.row + rowOffset,
            gridColumn: cell.col + colOffset,
            visibility: 'hidden',
          }}
        />
      );
    }

    // Active cell — render seat slot(s)
    const isMergeSource = mergeDragSource === cell.id;

    // Helper: render one seat slot within a cell
    const renderSeatSlot = (seatId: string, isLeft: boolean, isMerged: boolean) => {
      const assignment = assignmentMap.get(seatId);
      const student = assignment ? studentMap.get(assignment.studentId) ?? null : null;
      const priority = student ? getSeatPriority(student.cardSide, student.currentLevel, config.seatPriorityMap) : 0;
      const refName = showReference && referenceData ? referenceData.get(seatId) : undefined;
      const isSwapTarget = swapDragTarget === seatId;
      const isSwapSource = swapDragSource === seatId;
      const draggable = !editMode && !!student;

      return (
        <div
          key={seatId}
          onClick={() => editMode ? handleCellClick(cell) : handleSeatSlotClick(seatId)}
          draggable={editMode ? true : draggable}
          onDragStart={editMode ? (e: React.DragEvent) => {
            if (!cell.active) { e.preventDefault(); return; }
            handleMergeDragStart(cell.id);
          } : (e: React.DragEvent) => {
            if (!student) { e.preventDefault(); return; }
            handleSwapDragStart(seatId);
          }}
          onDragOver={editMode ? (e: React.DragEvent) => handleMergeDragOver(e, cell) : (e: React.DragEvent) => handleSwapDragOver(e, seatId)}
          onDrop={editMode ? (e: React.DragEvent) => handleMergeDrop(e, cell) : (e: React.DragEvent) => handleSwapDrop(e, seatId)}
          onDragEnd={editMode ? handleMergeDragEnd : handleSwapDragEnd}
          style={{
            flex: 1,
            minHeight: 52,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 4px',
            position: 'relative',
            cursor: editMode ? 'pointer' : (student || assignPhase === 'assigning') ? 'pointer' : 'default',
            borderRight: isMerged && isLeft ? `1px solid ${INK.border}` : undefined,
            opacity: isSwapSource ? 0.4 : 1,
            transition: 'opacity 0.2s',
            userSelect: 'none',
            ...(isSwapTarget ? {
              background: 'rgba(123, 139, 181, 0.12)',
              boxShadow: `inset 0 0 0 2px ${INK.starBlue}`,
              borderRadius: isMerged ? (isLeft ? '3px 0 0 3px' : '0 3px 3px 0') : 3,
            } : {}),
          }}
        >
          {/* Reference overlay name for empty slot */}
          {refName && !student && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: INK.textPrimary, opacity: 0.35, fontStyle: 'italic',
              pointerEvents: 'none', fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}>
              {refName}
            </div>
          )}

          {student ? (
            <>
              {showReference && refName && refName !== student.name && (
                <div style={{ fontSize: 10, color: INK.textSecondary, opacity: 0.35, fontStyle: 'italic', position: 'absolute', top: 1, lineHeight: 1 }}>
                  {refName}
                </div>
              )}
              <LevelIcon side={student.cardSide} level={student.currentLevel} size={isMerged ? 14 : 18} />
              <div style={{ fontSize: isMerged ? 11 : 12, fontWeight: 600, color: INK.textPrimary, textAlign: 'center', lineHeight: 1.2, marginTop: 1, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                {student.name}
              </div>
              <div style={{ fontSize: 8, color: priority <= 3 ? INK.starGold : priority <= 8 ? INK.starBlue : INK.flameCinnabar }}>
                #{priority}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 10, color: (showReference && refName) ? 'transparent' : (editMode ? '#8baa7a' : INK.textMuted), fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              {seatId}
            </div>
          )}
        </div>
      );
    };

    // For merged cells: render two seat slots side by side
    if (cell.mergedWith === 'right') {
      const rightSeatId = `${cell.row + 1}-${cell.col + 2}`;
      return (
        <div
          key={cell.id}
          style={{
            gridRow: cell.row + rowOffset,
            gridColumn: `${cell.col + colOffset} / span 2`,
            minHeight: 56,
            borderRadius: D.radiusSm,
            border: isMergeSource
              ? `2px dashed ${INK.starGoldMuted}`
              : editMode
              ? `1.5px dashed ${INK.borderHover}`
              : `1.5px solid ${INK.border}`,
            background: D.bgCard,
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {renderSeatSlot(cell.id, true, true)}
          {renderSeatSlot(rightSeatId, false, true)}
        </div>
      );
    }

    // For non-merged active cells: single seat slot
    return (
      <div
        key={cell.id}
        style={{
          gridRow: cell.row + rowOffset,
          gridColumn: cell.col + colOffset,
          minHeight: 56,
          borderRadius: D.radiusSm,
          border: isMergeSource
            ? `2px dashed ${INK.starGoldMuted}`
            : editMode
            ? `1.5px dashed ${INK.borderHover}`
            : `1.5px solid ${INK.border}`,
          background: D.bgCard,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {renderSeatSlot(cell.id, true, false)}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 64px)', overflow: 'hidden', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
      {/* Left panel: Student list */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: D.bgCard, borderRadius: D.radius,
        border: D.glassBorder, overflow: 'hidden',
        backdropFilter: D.glassBlur,
      }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: `1px solid ${INK.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK.textPrimary, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Star size={16} /> 学生列表
          </div>
          <div style={{ fontSize: 11, color: INK.textMuted }}>
            {assignPhase === 'assigning'
              ? '点击空座位分配当前学生'
              : editMode
              ? '编辑模式：点击/拖拽调整布局'
              : '拖拽交换/移动座位，点击移除'}
          </div>

          {/* Current assign banner */}
          {assignPhase === 'assigning' && (
            <CurrentAssignBanner
              currentStudent={currentAssignStudent}
              nextStudent={nextAssignStudent}
              seatPriorityMap={config.seatPriorityMap}
              frontLevels={config.frontLevels}
              backLevels={config.backLevels}
            />
          )}

          {/* Paused-skip notice */}
          {assignPhase === 'paused-skip' && (() => {
            const skippedWithoutSeat = [...skippedIds].filter(id => !assignedIds.has(id));
            return (
              <div style={{
                padding: '10px 14px', borderRadius: D.radiusSm, marginTop: 8,
                background: 'rgba(232,160,48,0.1)', border: '1px solid rgba(232,160,48,0.3)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ fontSize: 13, color: '#E8A030', fontWeight: 600, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  还有 {skippedWithoutSeat.length} 名同学未安排座位
                </div>
                <div style={{ fontSize: 12, color: D.textMid, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  请在下方"暂未安排"区域点击同学的"恢复"按钮，然后点击"开始排座"继续安排
                </div>
              </div>
            );
          })()}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {/* Self-choosing group */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: INK.starGold, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={10} /> 自主选座（优先级 1-8）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selfChoosing.map(s => (
                <StudentTag
                  key={s.id}
                  student={s}
                  isSelected={assignPhase === 'assigning' && currentAssignStudent?.id === s.id}
                  isAssigned={false}
                  isSkipped={skippedIds.has(s.id)}
                  onClick={() => {
                    if (assignPhase === 'assigning') jumpToStudent(s.id);
                  }}
                  onSkip={() => toggleSkip(s.id)}
                  seatPriorityMap={config.seatPriorityMap}
                  chooseThreshold={config.chooseThreshold}
                  frontLevels={config.frontLevels}
                  backLevels={config.backLevels}
                  rankInGroup={rankMap.get(s.id)}
                />
              ))}
              {selfChoosing.length === 0 && (
                <div style={{ fontSize: 12, color: INK.textMuted, padding: '8px 0' }}>全部已分配</div>
              )}
            </div>
          </div>

          {/* Teacher-assigned group */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: INK.flameCinnabar, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={10} /> 班主任指定（优先级 9-12）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {teacherAssigned.map(s => (
                <StudentTag
                  key={s.id}
                  student={s}
                  isSelected={assignPhase === 'assigning' && currentAssignStudent?.id === s.id}
                  isAssigned={false}
                  isSkipped={skippedIds.has(s.id)}
                  onClick={() => {
                    if (assignPhase === 'assigning') jumpToStudent(s.id);
                  }}
                  onSkip={() => toggleSkip(s.id)}
                  seatPriorityMap={config.seatPriorityMap}
                  chooseThreshold={config.chooseThreshold}
                  frontLevels={config.frontLevels}
                  backLevels={config.backLevels}
                  rankInGroup={rankMap.get(s.id)}
                />
              ))}
              {teacherAssigned.length === 0 && (
                <div style={{ fontSize: 12, color: INK.textMuted, padding: '8px 0' }}>全部已分配</div>
              )}
            </div>
          </div>

          {/* Assigned students list */}
          {assignments.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: INK.textSecondary, marginBottom: 6 }}>
                已分配（{assignments.length}）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {priorityOrder.filter(s => assignedIds.has(s.id)).map(s => (
                  <StudentTag
                    key={s.id}
                    student={s}
                    isSelected={false}
                    isAssigned={true}
                    assignedSeatLabel={getSeatLabelForStudent(s.id)}
                    onClick={() => {
                      if (assignPhase === 'assigning') jumpToStudent(s.id);
                    }}
                    seatPriorityMap={config.seatPriorityMap}
                    chooseThreshold={config.chooseThreshold}
                    frontLevels={config.frontLevels}
                    backLevels={config.backLevels}
                    rankInGroup={rankMap.get(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Skipped students */}
          {skippedStudents.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: INK.flameEmber, marginBottom: 6 }}>
                暂未安排（{skippedStudents.length}人）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {skippedStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => toggleSkip(s.id)}
                    style={{
                      padding: '4px 8px', borderRadius: D.radiusSm,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.12)',
                      cursor: 'pointer', fontSize: 12, color: D.textMid,
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)'; e.currentTarget.style.color = D.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = D.textMid; }}
                  >
                    <span style={{ fontSize: 10, color: D.textMid }}>{s.number}</span>
                    {s.name}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: INK.starGoldMuted }}>恢复</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Toolbar + Classroom grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Edit layout toggle */}
          <button
            onClick={() => { setEditMode(!editMode); setAssignPhase('idle'); }}
            style={{
              padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: editMode ? 'rgba(212,168,83,0.15)' : INK.starGoldFaint,
              border: `1px solid ${editMode ? 'rgba(212,168,83,0.3)' : INK.borderHover}`,
              color: editMode ? INK.starGold : INK.starGoldMuted,
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              boxShadow: editMode ? D.goldGlow : 'none',
            }}
          >
            <Pencil size={13} /> {editMode ? '编辑布局中' : '编辑布局'}
          </button>

          {/* Layout templates (edit mode only) */}
          {editMode && (
            <>
              <button
                onClick={() => {
                  if (window.confirm('应用默认布局将清除当前布局和座位分配，确定吗？')) {
                    setGridCells(createDefaultGridLayout());
                    setAssignments([]);
                  }
                }}
                style={{
                  padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                  background: INK.starGoldFaint, border: `1px solid ${INK.borderHover}`,
                  color: INK.starGoldMuted, display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                }}
              >
                <LayoutTemplate size={13} /> 默认布局
              </button>
              <button
                onClick={() => {
                  if (window.confirm('应用全单人座布局将清除当前布局和座位分配，确定吗？')) {
                    setGridCells(createAllSingleLayout());
                    setAssignments([]);
                  }
                }}
                style={{
                  padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
                  background: INK.starGoldFaint, border: `1px solid ${INK.borderHover}`,
                  color: INK.starGoldMuted, display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                }}
              >
                <LayoutTemplate size={13} /> 全单人座
              </button>
              {/* Add/Remove rows */}
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginLeft: 4 }}>
                <span style={{ fontSize: 11, color: INK.textMuted }}>行</span>
                <button onClick={addRow} style={{ padding: '4px 8px', borderRadius: D.radiusSm, fontSize: 11, cursor: 'pointer', background: 'rgba(139,170,122,0.1)', border: '1px solid rgba(139,170,122,0.25)', color: '#8baa7a', display: 'flex', alignItems: 'center' }}><Plus size={10} /></button>
                <button onClick={removeLastRow} style={{ padding: '4px 8px', borderRadius: D.radiusSm, fontSize: 11, cursor: 'pointer', background: INK.flameFaint, border: '1px solid rgba(196,65,37,0.25)', color: INK.flameCinnabar, display: 'flex', alignItems: 'center' }}><Minus size={10} /></button>
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: INK.textMuted }}>列</span>
                <button onClick={addCol} style={{ padding: '4px 8px', borderRadius: D.radiusSm, fontSize: 11, cursor: 'pointer', background: 'rgba(139,170,122,0.1)', border: '1px solid rgba(139,170,122,0.25)', color: '#8baa7a', display: 'flex', alignItems: 'center' }}><Plus size={10} /></button>
                <button onClick={removeLastCol} style={{ padding: '4px 8px', borderRadius: D.radiusSm, fontSize: 11, cursor: 'pointer', background: INK.flameFaint, border: '1px solid rgba(196,65,37,0.25)', color: INK.flameCinnabar, display: 'flex', alignItems: 'center' }}><Minus size={10} /></button>
              </div>
            </>
          )}

          {/* Start / Stop assigning */}
          {assignPhase === 'assigning' ? (
            <button
              onClick={stopAssigning}
              style={{
                padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: INK.flameFaint, border: '1px solid rgba(196,65,37,0.3)',
                color: INK.flameCinnabar, display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              }}
            >
              <Square size={13} /> 停止排座
            </button>
          ) : (
            <button
              onClick={startAssigning}
              disabled={editMode}
              style={{
                padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, fontWeight: 500, cursor: editMode ? 'not-allowed' : 'pointer',
                background: editMode ? INK.washWarm : 'rgba(139,170,122,0.12)',
                border: `1px solid ${editMode ? INK.border : 'rgba(139,170,122,0.25)'}`,
                color: editMode ? INK.textMuted : '#8baa7a',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: editMode ? 0.5 : 1,
                fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              }}
            >
              <Play size={13} /> 开始排座
            </button>
          )}

          {/* Manual save */}
          <button
            onClick={saveToHistory}
            style={{
              padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
              background: 'rgba(139,170,122,0.1)', border: '1px solid rgba(139,170,122,0.2)',
              color: '#8baa7a', display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            <Save size={13} /> 保存排座
          </button>

          {/* New week */}
          <button
            onClick={startNewWeek}
            style={{
              padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
              background: INK.flameFaint, border: '1px solid rgba(196,65,37,0.2)',
              color: INK.flameCinnabar, display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            <RotateCcw size={13} /> 新一周排座
          </button>

          {/* History */}
          <button
            onClick={() => setShowHistory(true)}
            style={{
              padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
              background: INK.starGoldFaint, border: `1px solid ${INK.borderHover}`,
              color: INK.starGoldMuted, display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            <History size={13} /> 历史
          </button>

          {/* Reference toggle */}
          <button
            onClick={() => setShowReference(!showReference)}
            style={{
              padding: '6px 12px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
              background: showReference ? 'rgba(212,168,83,0.12)' : INK.washWarm,
              border: `1px solid ${showReference ? 'rgba(212,168,83,0.25)' : INK.border}`,
              color: showReference ? INK.starGold : INK.textSecondary,
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            <Eye size={13} /> 参考布局
          </button>

          <div style={{ flex: 1 }} />

          {/* Counter */}
          <div style={{
            fontSize: 12, color: INK.textMuted,
            padding: '4px 10px', borderRadius: D.radiusSm,
            background: `${INK.bgDeep}66`, border: `1px solid ${INK.border}`,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}>
            已分配 {assignments.length} / {students.length}
          </div>
          <div style={{
            fontSize: 12, color: INK.starGold,
            padding: '4px 10px', borderRadius: D.radiusSm,
            background: INK.starGoldFaint, border: `1px solid ${INK.borderHover}`,
            fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          }}>
            第{getCurrentTeachingWeek(config.teachingWeeks)}周
          </div>
        </div>

        {/* Classroom area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 0 20px', position: 'relative' }}>
          <div style={{
            background: D.bgCard, borderRadius: D.radius,
            border: D.glassBorder, padding: 24,
            backdropFilter: D.glassBlur,
            maxWidth: 1200, margin: '0 auto',
            overflow: 'hidden',
          }}>
            {/* Podium */}
            <div style={{
              textAlign: 'center', marginBottom: 20, padding: '10px 0',
              background: INK.washWarm,
              border: `1px solid ${INK.border}`,
              borderRadius: D.radiusSm, color: INK.starGold, fontSize: 13, fontWeight: 500,
              letterSpacing: 2, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              boxShadow: D.goldGlow,
            }}>
              讲 台
            </div>

            {/* CSS Grid classroom — row/col headers embedded in edit mode */}
            {(() => {
              const colOffset = editMode ? 2 : 1;
              const rowOffset = editMode ? 2 : 1;
              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: editMode ? `28px repeat(${gridCols}, 1fr)` : `repeat(${gridCols}, 1fr)`,
                  gridTemplateRows: editMode ? `28px repeat(${gridRows}, auto)` : `repeat(${gridRows}, auto)`,
                  gap: 4,
                }}>
                  {/* Top-left corner spacer (edit mode) */}
                  {editMode && <div style={{ gridRow: 1, gridColumn: 1 }} />}
                  {/* Column headers (edit mode row 1) */}
                  {editMode && Array.from({ length: gridCols }, (_, c) => {
                    const colCells = gridCells.filter(cell => cell.col === c);
                    const allActive = colCells.length > 0 && colCells.every(cell => cell.active);
                    return (
                      <button key={`col-${c}`} onClick={() => toggleCol(c)} style={{ ...headerStyle(allActive), gridRow: 1, gridColumn: c + 2 }}>
                        <Columns3 size={8} />{c + 1}
                      </button>
                    );
                  })}
                  {/* Row headers (edit mode, each row column 1) */}
                  {editMode && Array.from({ length: gridRows }, (_, r) => {
                    const rowCells = gridCells.filter(cell => cell.row === r);
                    const allActive = rowCells.length > 0 && rowCells.every(cell => cell.active);
                    return (
                      <button key={`row-${r}`} onClick={() => toggleRow(r)} style={{ ...headerStyle(allActive), gridRow: r + 2, gridColumn: 1 }}>
                        <Rows3 size={8} />{r + 1}
                      </button>
                    );
                  })}
                  {/* Seat cells with offset for headers */}
                  {gridCells.map(cell => renderCell(cell, rowOffset, colOffset))}
                </div>
              );
            })()}
          </div>

          {/* Skipped students bar below grid */}
          {skippedStudents.length > 0 && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: D.radiusSm,
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}>
              <div style={{ fontSize: 10, color: INK.flameEmber, marginBottom: 6, fontWeight: 600 }}>
                暂未安排
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skippedStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => toggleSkip(s.id)}
                    style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 11,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      color: D.textMid, cursor: 'pointer', transition: 'all 0.2s',
                      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,83,0.3)'; e.currentTarget.style.color = D.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.textMid; }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save notification overlay */}
          <AnimatePresence>
            {showSaveNotice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: D.radiusSm,
                  background: 'rgba(212, 168, 83, 0.15)',
                  border: '1px solid rgba(212, 168, 83, 0.3)',
                  color: INK.starGold, fontSize: 14, fontWeight: 600,
                  backdropFilter: D.glassBlur,
                  zIndex: 9999,
                  boxShadow: '0 0 20px rgba(212, 168, 83, 0.15)',
                  fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                }}
              >
                <CheckCircle2 size={18} /> {saveNoticeText}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* History modal */}
      <AnimatePresence>
        {showHistory && (
          <HistoryModal history={history} students={students} onClose={() => setShowHistory(false)} onDelete={(idx) => {
            const newHistory = history.filter((_, i) => i !== idx);
            setHistory(newHistory);
            saveHistoryToStorage(newHistory);
          }} />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
