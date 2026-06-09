// ===== 核心类型定义 =====

/** 卡片面 */
export type CardSide = 'front' | 'back';

/** 行为方向 */
export type Direction = 'negative' | 'positive';

/** 行为类别 */
export type Category = '纪律' | '学习' | '卫生' | '品行';

/** 用户角色 */
export type UserRole = 'teacher' | 'committee' | 'student' | 'parent';

/** 正面行为权重 */
export type NegativeWeight = 1 | 2 | 3; // 蒙尘/褪色/失格

/** 背面行为权重 */
export type PositiveWeight = 1 | 2 | 3; // 微芒/星光/闪耀

// ===== 护盾/传承值兑换 =====
export interface ExchangeItem {
  id: string;
  side: 'front' | 'back';
  cost: number;
  name: string;
  description?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

// ===== 限时活动 =====
export interface LimitedEvent {
  id: string;
  seriesId?: string;
  name: string;
  direction: Direction;
  weight: NegativeWeight | PositiveWeight;
  description: string;
  aliases?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ===== 行为时间段 =====
export type TimePeriodGroup = 'course' | 'other';

export interface TimePeriod {
  id: string;
  name: string;
  group: TimePeriodGroup;  // course=学科课程, other=其他时段
}

// ===== 版本更新日志 =====
export interface VersionLog {
  version: string;
  date: string;
  changes: { title: string; detail: string }[];
}

// ===== 正面等级配置 =====
export interface FrontLevel {
  level: number;
  name: string;
  imagery: string;
  blanks: number;
  description: string;
}

// ===== 背面等级配置 =====
export interface BackLevel {
  level: number;
  name: string;
  imagery: string;
  checksRequired: number;
  description: string;
}

// ===== 学生 =====
export interface LevelChange {
  direction: 'down' | 'up' | 'flip';
  fromLevel: number;
  toLevel: number;
  fromSide: CardSide;
  toSide: CardSide;
  timestamp: string;
  viewed?: boolean;
}

export interface Student {
  id: string;
  name: string;
  number: number;
  cardSide: CardSide;
  currentLevel: number;
  blanksFilled: number;
  cumulativeChecks: number;
  heartDemonMarks: number;
  starShields: number;
  heritagePoints: number;
  totalHeritageEarned: number;
  totalHeritageDonated: number;
  totalBlanksEverFilled: number;
  totalHeartDemonsEverGained: number;
  totalShieldsEverEarned: number;
  totalChecksEverEarned: number;
  totalShieldsExchanged: number;
  lastHeartDemonClearDate?: string;
  consecutiveNoViolationDays: number;
  riseTaskCompleted?: boolean;
  weeksAtLevelOne: number;
  idSuffix?: string;
  lastLevelChange?: LevelChange;
  createdAt: string;
  updatedAt: string;
}

export type PenaltyReason = 'weekly_recorder' | 'old_habit_recurrence';

// ===== 行为记录 =====
export interface BehaviorRecord {
  id: string;
  studentId: string;
  direction: Direction;
  weight: NegativeWeight | PositiveWeight;
  behaviorId?: string;
  behaviorSeriesId?: string;
  category: Category;
  description: string;
  remark?: string;
  recordedBy: string;
  verifiedBy?: string;
  verified: boolean;
  shieldsConsumed: number;
  extraWeight?: number;
  penaltyReasons?: PenaltyReason[];
  isHighSensitivity: boolean;
  affectsFlag?: boolean;
  studentCardSide?: CardSide;
  isAutoRule?: boolean;
  timePeriodId?: string;
  createdAt: string;
}

// ===== 星光护盾使用记录 =====
export interface ShieldUsage {
  id: string;
  studentId: string;
  behaviorRecordId: string;
  usedAt: string;
}

// ===== 卡片状态变更历史 =====
export interface CardStateHistory {
  id: string;
  studentId: string;
  oldSide: CardSide;
  newSide: CardSide;
  oldLevel: number;
  newLevel: number;
  reason: string;
  createdAt: string;
}

// ===== 空格/✓ 变更 =====
export type SlotChangeType = 'fill_blank' | 'add_check' | 'clear_heart_demon' | 'use_shield';

export interface SlotChange {
  id: string;
  studentId: string;
  changeType: SlotChangeType;
  amount: number;
  relatedRecordId: string;
  createdAt: string;
}

// ===== 行为定义 =====
export interface BehaviorDefinition {
  id: string;
  direction: Direction;
  category: Category;
  weight: NegativeWeight | PositiveWeight;
  name: string;
  description: string;
  isHighSensitivity: boolean;
  isComposite: boolean;
  isInverseSelectable: boolean;
  compositeThreshold?: number;
  compositePenalty?: number;
  affectsFlag?: boolean;
  maxDailyCount?: number;
  behaviorBlacklist?: string[];
  extraWeight?: number;
  requiresTimePeriod?: boolean;
  aliases?: string[];
  seriesId?: string;
}

// ===== 自动触发规则 =====
export type AutoRuleEffect = 'shieldAndEmber' | 'blankAndHeartDemon';

export type AutoRuleTriggerType = 'weekly_no_behavior' | 'weekly_behavior_count';

export interface AutoRuleTriggerCondition {
  type: AutoRuleTriggerType;
  behaviorId?: string;
  threshold?: number;
  period?: 'day' | 'week';
}

export interface AutoRule {
  id: string;
  name: string;
  triggerCondition: AutoRuleTriggerCondition;
  effectType: AutoRuleEffect;
  effectAmount: number;
  isActive: boolean;
}

// ===== 规则版本 =====
export interface RuleVersion {
  id: string;
  versionName: string;
  effectiveDate: string;
  configSnapshot: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

// ===== 称号 =====
export interface Title {
  id: string;
  studentId: string;
  titleName: string;
  description: string;
  awardedAt: string;
}

// ===== 等级配置（含回升任务） =====
export interface LevelConfig {
  side: CardSide;
  level: number;
  name: string;
  description: string;
  blanks?: number;
  checksRequired?: number;
  privileges?: string[];
  restrictions?: string[];
  riseDaysRequired?: number;
  riseTask?: string;
}

// ===== 等级特权与限制 =====
export interface LevelEffect {
  level: number;
  type: 'privilege' | 'restriction';
  items: string[];
}

// ===== 座位编排 =====
export interface GridCell {
  id: string;            // "M-N" 1-indexed (e.g. "3-5")
  row: number;           // 0-indexed
  col: number;           // 0-indexed
  active: boolean;       // whether this cell is a seat
  mergedWith?: 'right' | 'left';  // right=spans 2 cols, left=absorbed by left neighbor
}

export interface SeatAssignment {
  seatId: string;        // "M-N" format
  studentId: string;
}

export interface ThumbnailData {
  rows: number;
  cols: number;
  cells: Array<{
    row: number;
    col: number;
    active: boolean;
    merged: boolean;
    studentName?: string;
    priority?: number;
  }>;
}

export interface SeatHistoryEntry {
  date: string;
  assignments: SeatAssignment[];
  layout: GridCell[];
  thumbnailData: ThumbnailData;
  teachingWeek?: number;
}

// ===== 教学周 =====
export interface TeachingWeek {
  weekNumber: number;
  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD
  label?: string;        // 可选备注（如"期中考试周"）
}

// ===== 应用配置（可编辑） =====
export interface AppConfig {
  version: number;
  // 等级
  frontLevels: FrontLevel[];
  backLevels: BackLevel[];
  frontLevelEffects: LevelEffect[];
  backLevelEffects: LevelEffect[];
  // 行为
  negativeBehaviors: BehaviorDefinition[];
  positiveBehaviors: BehaviorDefinition[];
  negativeWeightNames: Record<number, string>;
  positiveWeightNames: Record<number, string>;
  // 标记名
  blankMarkName: string;
  checkMarkName: string;
  // 系统
  shieldOffsetRatio: number;
  autoRules: AutoRule[];
  riseTasks: LevelConfig[];
  levelOneTitles: Array<{ weeksRequired: number; name: string; description: string }>;
  immortalTitles: Array<{ heritageRequired: number; name: string; description: string }>;
  immortalDemotionThreshold: number;
  // 座位
  seatPriorityMap: Record<string, number>;
  chooseThreshold: number;
  // 日历
  semesterStartDate: string;
  teachingWeeks: TeachingWeek[];
  // 类别
  categories: string[];
  // 记录人
  committeeNames: string[];
  // 兑换商店
  exchangeItems: ExchangeItem[];
  // 限时活动
  limitedEvents: LimitedEvent[];
  // 行为时间段
  timePeriods: TimePeriod[];
  // 版本公告
  versionLogs: VersionLog[];
}
