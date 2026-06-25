import { useState, useCallback, useEffect } from 'react';
import type { Student, BehaviorRecord } from '../types';
import { isExchangeRecord, revertExchangeFromStudent } from './exchangeLogic';

function isHeartDemonClearRecord(record: Pick<BehaviorRecord, 'description' | 'remark'>): boolean {
  return String(record.description || '').includes('心魔消除') || String(record.remark || '').includes('heartDemonClear:');
}

function getHeartDemonClearCount(record: Pick<BehaviorRecord, 'description' | 'remark' | 'weight'>): number {
  const text = `${record.description || ''} ${record.remark || ''}`;
  const match = text.match(/count:(\d+)/) || text.match(/[（(]\s*-\s*(\d+)/);
  const parsed = match ? Number(match[1]) : Number(record.weight || 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

// ===== 本地状态管理 + localStorage 持久化 =====

const STORAGE_KEYS = {
  students: 'students',
  behaviorRecords: 'behavior-records',
} as const;

const INITIAL_STUDENTS: Student[] = [
  { id: '1', name: '曾馨', number: 1, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: '陈浩博', number: 2, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: '陈可美', number: 3, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', name: '邓渝凡', number: 4, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', name: '丁紫洪', number: 5, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '6', name: '董溢文', number: 6, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '7', name: '冯晨轩', number: 7, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '8', name: '龚雅琪', number: 8, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '9', name: '龚煜心', number: 9, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '10', name: '何泓霖', number: 10, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '11', name: '胡琴雅淇', number: 11, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '12', name: '胡荣耀', number: 12, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '13', name: '蒋佳骏', number: 13, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '14', name: '蒋芮西', number: 14, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '15', name: '阚雅涵', number: 15, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '16', name: '赖佳颖', number: 16, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '17', name: '赖俊豪', number: 17, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '18', name: '蓝义皓', number: 18, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '19', name: '黎梦琪', number: 19, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '20', name: '刘晨熙', number: 20, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '21', name: '刘入源', number: 21, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '22', name: '刘烨梓', number: 22, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '23', name: '刘梓谖', number: 23, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '24', name: '彭子媂', number: 24, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '25', name: '秦姝楟', number: 25, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '26', name: '冉家鳌', number: 26, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '27', name: '冉宇泽', number: 27, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '28', name: '宋荐昕', number: 28, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '29', name: '孙浩凯', number: 29, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '30', name: '王晨辰', number: 30, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '31', name: '王晨雨琳', number: 31, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '32', name: '王琮睿', number: 32, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '33', name: '王泽诚', number: 33, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '34', name: '王梓祺', number: 34, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '35', name: '吴佳芮', number: 35, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '36', name: '徐浚卜', number: 36, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '37', name: '徐小乔', number: 37, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '38', name: '徐于淇', number: 38, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '39', name: '易安心', number: 39, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '40', name: '喻叶函', number: 40, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '41', name: '袁昊', number: 41, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '42', name: '袁俪玮', number: 42, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '43', name: '邹梓航', number: 43, cardSide: 'front', currentLevel: 1, blanksFilled: 0, cumulativeChecks: 0, heartDemonMarks: 0, starShields: 0, consecutiveNoViolationDays: 0, heritagePoints: 0, totalHeritageEarned: 0, totalHeritageDonated: 0, totalBlanksEverFilled: 0, totalHeartDemonsEverGained: 0, totalShieldsEverEarned: 0, totalShieldsExchanged: 0, totalChecksEverEarned: 0, weeksAtLevelOne: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch { /* ignore parse errors */ }
  return fallback;
}

function saveToStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

let studentsState: Student[] = loadFromStorage(STORAGE_KEYS.students, INITIAL_STUDENTS);
let behaviorRecordsState: BehaviorRecord[] = loadFromStorage(STORAGE_KEYS.behaviorRecords, []);
// Ensure records are sorted newest-first
behaviorRecordsState.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || Number(b.id) - Number(a.id));

// Cleanup stale lastLevelChange on startup
studentsState = studentsState.map(s => {
  if (!s.lastLevelChange) return s;
  const lc = s.lastLevelChange;
  if (lc.viewed || Date.now() - new Date(lc.timestamp).getTime() > 24 * 60 * 60 * 1000) {
    const { lastLevelChange, ...rest } = s;
    return rest as Student;
  }
  return s;
});
// Backward compatibility: default new cumulative fields to current values
studentsState = studentsState.map(s => ({
  ...s,
  totalBlanksEverFilled: s.totalBlanksEverFilled ?? s.blanksFilled,
  totalHeartDemonsEverGained: s.totalHeartDemonsEverGained ?? s.heartDemonMarks,
  totalShieldsEverEarned: s.totalShieldsEverEarned ?? s.starShields,
  totalChecksEverEarned: s.totalChecksEverEarned ?? s.cumulativeChecks,
  totalShieldsExchanged: s.totalShieldsExchanged ?? 0,
  totalHeritageEarned: s.totalHeritageEarned ?? s.heritagePoints,
  totalHeritageDonated: s.totalHeritageDonated ?? 0,
  riseTaskCompleted: s.riseTaskCompleted ?? false,
}));
saveToStorage(STORAGE_KEYS.students, studentsState);

// Persist initial data on first load
if (!localStorage.getItem(STORAGE_KEYS.students)) {
  saveToStorage(STORAGE_KEYS.students, studentsState);
}
if (!localStorage.getItem(STORAGE_KEYS.behaviorRecords)) {
  saveToStorage(STORAGE_KEYS.behaviorRecords, behaviorRecordsState);
}

// Calculate nextRecordId from existing records
let nextRecordId = behaviorRecordsState.reduce((max, r) => {
  const id = Number(r.id);
  return Number.isFinite(id) ? Math.max(max, id + 1) : max;
}, 1);

type Listener = () => void;
const listeners: Listener[] = [];

function notify() {
  saveToStorage(STORAGE_KEYS.students, studentsState);
  saveToStorage(STORAGE_KEYS.behaviorRecords, behaviorRecordsState);
  // 云端保存由 main.tsx 的 localStorage.setItem 拦截器统一触发，无需在这里重复
  listeners.forEach(l => l());
}

export function getStudents(): Student[] { return studentsState; }
export function getBehaviorRecords(): BehaviorRecord[] { return behaviorRecordsState; }

export function updateStudent(id: string, updater: (s: Student) => Student) {
  studentsState = studentsState.map(s => s.id === id ? updater(s) : s);
  notify();
}

export function addStudent(name: string, number?: number): Student {
  const maxNumber = studentsState.reduce((max, s) => Math.max(max, s.number), 0);
  const now = new Date().toISOString();
  const student: Student = {
    id: String(Date.now()),
    name,
    number: number ?? maxNumber + 1,
    cardSide: 'front',
    currentLevel: 1,
    blanksFilled: 0,
    cumulativeChecks: 0,
    heartDemonMarks: 0,
    starShields: 0,
    consecutiveNoViolationDays: 0,
    riseTaskCompleted: false,
    heritagePoints: 0,
    totalHeritageEarned: 0,
    totalHeritageDonated: 0,
    totalBlanksEverFilled: 0,
    totalHeartDemonsEverGained: 0,
    totalShieldsEverEarned: 0, totalShieldsExchanged: 0,
    totalChecksEverEarned: 0,
    weeksAtLevelOne: 0,
    createdAt: now,
    updatedAt: now,
  };
  studentsState = [...studentsState, student];
  notify();
  return student;
}

function renumberStudents() {
  const sorted = [...studentsState].sort((a, b) => a.number - b.number);
  studentsState = sorted.map((s, i) => ({ ...s, number: i + 1, updatedAt: new Date().toISOString() }));
}

export function removeStudent(id: string): boolean {
  const exists = studentsState.some(s => s.id === id);
  if (!exists) return false;
  studentsState = studentsState.filter(s => s.id !== id);
  // Also remove associated behavior records
  behaviorRecordsState = behaviorRecordsState.filter(r => r.studentId !== id);
  renumberStudents();
  notify();
  return true;
}

export function updateStudentNumber(id: string, newNumber: number) {
  const student = studentsState.find(s => s.id === id);
  if (!student) return;
  student.number = newNumber;
  student.updatedAt = new Date().toISOString();
  renumberStudents();
  notify();
}

export function batchImportStudents(lines: string[]): { added: number; skipped: number } {
  let added = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  const existingNames = new Set(studentsState.map(s => s.name));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    const number = match ? Number(match[1]) : undefined;
    const name = match ? match[2].trim() : trimmed;

    if (existingNames.has(name)) {
      skipped++;
      continue;
    }

    const maxNumber = studentsState.reduce((max, s) => Math.max(max, s.number), 0);
    const student: Student = {
      id: String(Date.now()) + '-' + added,
      name,
      number: number ?? maxNumber + 1,
      cardSide: 'front',
      currentLevel: 1,
      blanksFilled: 0,
      cumulativeChecks: 0,
      heartDemonMarks: 0,
      starShields: 0,
      consecutiveNoViolationDays: 0,
      riseTaskCompleted: false,
      heritagePoints: 0,
      totalHeritageEarned: 0,
      totalHeritageDonated: 0,
      totalBlanksEverFilled: 0,
      totalHeartDemonsEverGained: 0,
      totalShieldsEverEarned: 0, totalShieldsExchanged: 0,
      totalChecksEverEarned: 0,
      weeksAtLevelOne: 0,
      createdAt: now,
      updatedAt: now,
    };
    studentsState = [...studentsState, student];
    existingNames.add(name);
    added++;
  }

  if (added > 0) notify();
  return { added, skipped };
}

export function addBehaviorRecord(record: Omit<BehaviorRecord, 'id' | 'createdAt'>): BehaviorRecord {
  const newRecord: BehaviorRecord = {
    ...record,
    id: String(nextRecordId++),
    createdAt: new Date().toISOString(),
  };
  behaviorRecordsState = [newRecord, ...behaviorRecordsState];
  notify();
  return newRecord;
}

export function updateBehaviorRecord(id: string, updater: (r: BehaviorRecord) => BehaviorRecord): boolean {
  const idx = behaviorRecordsState.findIndex(r => r.id === id);
  if (idx === -1) return false;
  behaviorRecordsState = behaviorRecordsState.map(r => r.id === id ? updater({ ...r }) : r);
  notify();
  return true;
}

export function batchApplyCorrections(
  studentCorrections: Map<string, Partial<Student>>,
  recordCorrections: Map<string, Partial<BehaviorRecord>>,
): { fixedStudents: number; fixedRecords: number } {
  const now = new Date().toISOString();
  let fixedStudents = 0;
  let fixedRecords = 0;

  if (studentCorrections.size > 0) {
    studentsState = studentsState.map(student => {
      const correction = studentCorrections.get(student.id);
      if (!correction) return student;
      fixedStudents++;
      return { ...student, ...correction, updatedAt: now };
    });
  }

  if (recordCorrections.size > 0) {
    behaviorRecordsState = behaviorRecordsState.map(record => {
      const correction = recordCorrections.get(record.id);
      if (!correction) return record;
      fixedRecords++;
      return { ...record, ...correction };
    });
  }

  if (fixedStudents > 0 || fixedRecords > 0) notify();
  return { fixedStudents, fixedRecords };
}

export function deleteBehaviorRecord(id: string): boolean {
  const record = behaviorRecordsState.find(r => r.id === id);
  if (!record) return false;

  const student = studentsState.find(s => s.id === record.studentId);
  if (!student) return false;

  // Reverse the effect of the record on the student
  const ew = (record.weight as number) + (record.extraWeight ?? 0);
  if (record.direction === 'negative') {
    if (student.cardSide === 'front') {
      if (record.shieldsConsumed > 0) {
        student.starShields += record.shieldsConsumed;
      }
      const actualFill = record.shieldsConsumed > 0
        ? ew - Math.floor(record.shieldsConsumed / 2)
        : ew;
      student.blanksFilled = Math.max(0, student.blanksFilled - actualFill);
      student.totalBlanksEverFilled = Math.max(0, student.totalBlanksEverFilled - actualFill);
    } else {
      const heartDemonAmount = 1 + (record.extraWeight ?? 0);
      student.heartDemonMarks = Math.max(0, student.heartDemonMarks - heartDemonAmount);
      student.totalHeartDemonsEverGained = Math.max(0, student.totalHeartDemonsEverGained - heartDemonAmount);
    }
  } else if (record.direction === 'positive') {
    if (isExchangeRecord(record)) {
      const reverted = revertExchangeFromStudent(student, record);
      Object.assign(student, reverted);
    } else if (student.cardSide === 'front') {
      student.starShields = Math.max(0, student.starShields - ew);
      student.totalShieldsEverEarned = Math.max(0, student.totalShieldsEverEarned - ew);
    } else if (isHeartDemonClearRecord(record)) {
      student.heartDemonMarks += getHeartDemonClearCount(record);
      student.lastHeartDemonClearDate = undefined;
    } else {
      student.cumulativeChecks = Math.max(0, student.cumulativeChecks - ew);
      student.totalChecksEverEarned = Math.max(0, student.totalChecksEverEarned - ew);
    }
  }

  student.updatedAt = new Date().toISOString();
  studentsState = studentsState.map(s => s.id === student.id ? student : s);
  behaviorRecordsState = behaviorRecordsState.filter(r => r.id !== id);
  notify();
  return true;
}

export function resetAllStudents() {
  studentsState = studentsState.map(s => ({
    ...s,
    cardSide: 'front' as const,
    currentLevel: 1,
    blanksFilled: 0,
    cumulativeChecks: 0,
    heartDemonMarks: 0,
    starShields: 0,
    consecutiveNoViolationDays: 0,
    heritagePoints: 0,
    totalHeritageEarned: 0,
    totalHeritageDonated: 0,
    totalBlanksEverFilled: 0,
    totalHeartDemonsEverGained: 0,
    totalShieldsEverEarned: 0, totalShieldsExchanged: 0,
    totalChecksEverEarned: 0,
    weeksAtLevelOne: 0,
    lastLevelChange: undefined,
    updatedAt: new Date().toISOString(),
  }));
  behaviorRecordsState = [];
  saveToStorage(STORAGE_KEYS.students, studentsState);
  saveToStorage(STORAGE_KEYS.behaviorRecords, behaviorRecordsState);
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => { const i = listeners.indexOf(listener); if (i > -1) listeners.splice(i, 1); };
}

// Re-read all data from localStorage (called after server data is loaded)
export function reinitializeFromStorage() {
  studentsState = loadFromStorage(STORAGE_KEYS.students, INITIAL_STUDENTS);
  behaviorRecordsState = loadFromStorage(STORAGE_KEYS.behaviorRecords, []);
  behaviorRecordsState.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || Number(b.id) - Number(a.id));
  studentsState = studentsState.map(s => {
    if (!s.lastLevelChange) return s;
    const lc = s.lastLevelChange;
    if (lc.viewed || Date.now() - new Date(lc.timestamp).getTime() > 24 * 60 * 60 * 1000) {
      const { lastLevelChange, ...rest } = s;
      return rest as Student;
    }
    return s;
  });
  studentsState = studentsState.map(s => ({
    ...s,
    totalBlanksEverFilled: s.totalBlanksEverFilled ?? s.blanksFilled,
    totalHeartDemonsEverGained: s.totalHeartDemonsEverGained ?? s.heartDemonMarks,
    totalShieldsEverEarned: s.totalShieldsEverEarned ?? s.starShields,
    totalChecksEverEarned: s.totalChecksEverEarned ?? s.cumulativeChecks,
    totalShieldsExchanged: s.totalShieldsExchanged ?? 0,
    totalHeritageEarned: s.totalHeritageEarned ?? s.heritagePoints,
    totalHeritageDonated: s.totalHeritageDonated ?? 0,
    riseTaskCompleted: s.riseTaskCompleted ?? false,
  }));
  nextRecordId = behaviorRecordsState.reduce((max, r) => {
    const id = Number(r.id);
    return Number.isFinite(id) ? Math.max(max, id + 1) : max;
  }, 1);
}

// React hook
export function useStudents() {
  const [students, setStudents] = useState<Student[]>(studentsState);
  const [records, setRecords] = useState<BehaviorRecord[]>(behaviorRecordsState);

  const refresh = useCallback(() => {
    setStudents([...studentsState]);
    setRecords([...behaviorRecordsState]);
  }, []);

  useEffect(() => {
    const unsub = subscribe(refresh);
    return unsub;
  }, [refresh]);

  return {
    students, records, updateStudent, addBehaviorRecord, updateBehaviorRecord, deleteBehaviorRecord, batchApplyCorrections, refresh,
    addStudent, removeStudent, batchImportStudents, resetAllStudents, updateStudentNumber,
  };
}
