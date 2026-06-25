import type { FrontLevel, BackLevel, BehaviorDefinition, LevelConfig, AutoRule, LevelEffect, GridCell, AppConfig, TeachingWeek, NegativeWeight, PositiveWeight } from '../types';
import { toLocalDateStr } from '../lib/utils';

// ===== 正面等级：星辰的六种光度 =====
export const FRONT_LEVELS: FrontLevel[] = [
  {
    level: 1,
    name: '星辉典范',
    imagery: '北极星：恒定、自身发光、指引他人',
    blanks: 3,
    description: '你像稳定发光的星辰，守时、自律、踏实，也能给身边同学带来正面的影响。请珍惜这份光亮，继续做最好的自己。',
  },
  {
    level: 2,
    name: '弦月之辉',
    imagery: '弦月：光芒减半，有缺憾，依赖反射',
    blanks: 4,
    description: '你的光还在，只是已经不像原来那样圆满。也许是一次松懈，也许是几次忽视提醒。别急着否定自己，及时调整，就能慢慢找回完整的光。',
  },
  {
    level: 3,
    name: '云翳遮星',
    imagery: '被薄云遮盖的星星：光芒被削弱，可见但模糊，稳定性受外界影响',
    blanks: 5,
    description: '你的状态开始被拖延、分心或懒散遮住了，原本清晰的光芒变得有些模糊。此刻最重要的，不是抱怨，而是主动把遮住自己的那层"云"拨开。',
  },
  {
    level: 4,
    name: '流星即逝',
    imagery: '流星：只有瞬间的闪耀，轨迹失控，无法持续',
    blanks: 6,
    description: '你也有闪光的时候，但这份闪光还不够稳定。时好时坏、忽明忽暗，会让你离真正的成长越来越远。请学会坚持，让努力不只是一时热情。',
  },
  {
    level: 5,
    name: '雾中孤星',
    imagery: '浓雾中的孤星：光芒几乎被吞没，孤立无援，定位模糊',
    blanks: 7,
    description: '你现在的状态已经比较低迷，好的习惯正在减弱，提醒也开始变得迟钝。可就算四周起雾，你也不是没有光。请咬牙坚持一下，别让自己彻底迷失方向。',
  },
  {
    level: 6,
    name: '深谷余烬',
    imagery: '深渊中的最后余火：光已不可见，仅存一丝温度与可能',
    blanks: 8,
    description: '你已经走到了需要认真停下来反思的时候。现在的你，也许很累，也许很乱，但请记住：只要心里还有一点不甘心，那一点余烬就能重新燃起来。翻面，不是结束，而是新的开始。',
  },
];

// ===== 背面等级：火焰的六重燃态 =====
export const BACK_LEVELS: BackLevel[] = [
  {
    level: 1,
    name: '冰封心火',
    imagery: '冰封的火种：火已熄灭，完全冷却，但火种仍在',
    checksRequired: 0,
    description: '来到这一面，并不代表你失败了，而代表你要重新出发。你的火种没有消失，它只是暂时被寒冷封住了。只要愿意改变，温度就会一点点回来。',
  },
  {
    level: 2,
    name: '火光初燃',
    imagery: '火绒上的第一粒火星：脆弱、闪烁、需要精心呵护',
    checksRequired: 10,
    description: '第一点改变已经出现了。也许只是一次守时、一次克制、一次认真完成任务，但这都值得被看见。别小看这一粒火星，很多真正的改变，都是从这里开始的。',
  },
  {
    level: 3,
    name: '烛火摇曳',
    imagery: '风中烛火：已形成火焰，能提供光热，但仍不稳定',
    checksRequired: 20,
    description: '你已经重新亮起来了。虽然这团火还不够稳，偶尔也会被风吹得摇晃，但只要不放弃，它就会越来越明。能坚持下来的人，已经在变强了。',
  },
  {
    level: 4,
    name: '篝火渐旺',
    imagery: '营地的篝火：稳定、温暖，可以聚集他人，抵御寒冷',
    checksRequired: 35,
    description: '你的改变，已经不只是自己知道，别人也能看见了。你开始更稳定，也开始把积极、认真和温暖带给周围的人。此时的你，已经不只是被照亮的人，也在慢慢照亮别人。',
  },
  {
    level: 5,
    name: '熔炉之心',
    imagery: '锻造的熔炉：高温、猛烈、足以重塑钢铁与自身',
    checksRequired: 55,
    description: '你正在经历真正的成长。这个过程也许不轻松，因为你要和过去的坏习惯较劲，要把散漫、冲动和逃避一点点炼掉。但正因为经历了锤炼，你才会变得更坚定、更有力量。',
  },
  {
    level: 6,
    name: '不朽晨辉',
    imagery: '破晓的太阳：永恒、宏大、普照万物，源自内部核聚变',
    checksRequired: 80,
    description: '你已经走过低谷，也完成了重建。现在的你，不只是回到了从前，而是比从前更懂自律、更懂坚持，也更懂珍惜。你的光，已经不只是天赋或状态，而是经历过考验之后，真正属于自己的力量。',
  },
];

// ===== 负面行为定义（获得×） =====
export const NEGATIVE_BEHAVIORS: BehaviorDefinition[] = [
  // ===== 蒙尘(1×) =====
  // 纪律
  { id: 'n-d-1', direction: 'negative', category: '纪律', weight: 1, name: '迟到', description: '迟到', isHighSensitivity: false, isComposite: true, isInverseSelectable: true, compositeThreshold: 3, compositePenalty: 1 },
  { id: 'n-d-2', direction: 'negative', category: '纪律', weight: 1, name: '预备铃后未就位', description: '预备铃后未按时就位', isHighSensitivity: false, isComposite: false, isInverseSelectable: false, requiresTimePeriod: true },
  // 学习
  { id: 'n-l-1', direction: 'negative', category: '学习', weight: 1, name: '作业未按时上交', description: '作业未按时上交或未按要求完成', isHighSensitivity: false, isComposite: true, isInverseSelectable: true, compositeThreshold: 3, compositePenalty: 1, requiresHomeworkDetail: true },
  { id: 'n-l-2', direction: 'negative', category: '学习', weight: 1, name: '课上做无关的事', description: '课上做与学习无关的事情', isHighSensitivity: false, isComposite: false, isInverseSelectable: false, requiresTimePeriod: true },
  // 卫生
  { id: 'n-h-1', direction: 'negative', category: '卫生', weight: 1, name: '个人区域脏乱', description: '个人区域脏乱，有明显垃圾', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 品行
  { id: 'n-p-1', direction: 'negative', category: '品行', weight: 1, name: '仪容仪表不合规范', description: '仪容仪表不合规范', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },

  // ===== 褪色(2×) =====
  // 纪律
  { id: 'n-d-3', direction: 'negative', category: '纪律', weight: 2, name: '课上随意讲话', description: '课上随意讲话', isHighSensitivity: false, isComposite: true, isInverseSelectable: false, compositeThreshold: 3, compositePenalty: 1, requiresTimePeriod: true },
  { id: 'n-d-4', direction: 'negative', category: '纪律', weight: 2, name: '课间追逐打闹', description: '课间追逐打闹', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 学习
  { id: 'n-l-3', direction: 'negative', category: '学习', weight: 2, name: '抄袭作业', description: '抄袭作业或提供作业给他人照抄', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 卫生
  { id: 'n-h-2', direction: 'negative', category: '卫生', weight: 2, name: '随地乱扔垃圾', description: '随地乱扔垃圾', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'n-h-3', direction: 'negative', category: '卫生', weight: 2, name: '零食饮料入教学区', description: '将零食饮料带入教学区', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 品行
  { id: 'n-p-2', direction: 'negative', category: '品行', weight: 2, name: '说脏话', description: '说脏话', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'n-p-3', direction: 'negative', category: '品行', weight: 2, name: '嘲笑讥讽同学', description: '嘲笑、讥讽同学', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'n-p-4', direction: 'negative', category: '品行', weight: 2, name: '拿用他人物品', description: '未经允许拿用他人物品', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },

  // ===== 失格(3×) =====
  // 纪律
  { id: 'n-d-5', direction: 'negative', category: '纪律', weight: 3, name: '集体活动擅自行动', description: '集体活动中擅自行动', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'n-d-6', direction: 'negative', category: '纪律', weight: 3, name: '违规使用电子设备', description: '违规使用电子设备', isHighSensitivity: true, isComposite: false, isInverseSelectable: false },
  // 学习
  { id: 'n-l-4', direction: 'negative', category: '学习', weight: 3, name: '考试作弊', description: '考试或常规练习中作弊、协助作弊', isHighSensitivity: true, isComposite: false, isInverseSelectable: false },
  // 卫生
  { id: 'n-h-4', direction: 'negative', category: '卫生', weight: 3, name: '值日迟到或缺席', description: '值日无故迟到或缺席', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'n-h-5', direction: 'negative', category: '卫生', weight: 3, name: '值日不达标', description: '值日不达标致班级扣分', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 品行
  { id: 'n-p-5', direction: 'negative', category: '品行', weight: 3, name: '顶撞师长', description: '顶撞师长', isHighSensitivity: true, isComposite: false, isInverseSelectable: false },
  { id: 'n-p-6', direction: 'negative', category: '品行', weight: 3, name: '辱骂/威胁/欺凌', description: '辱骂、威胁或欺凌同学', isHighSensitivity: true, isComposite: false, isInverseSelectable: false },
  { id: 'n-p-7', direction: 'negative', category: '品行', weight: 3, name: '破坏公物', description: '破坏公物', isHighSensitivity: true, isComposite: false, isInverseSelectable: false },
  { id: 'n-p-8', direction: 'negative', category: '品行', weight: 3, name: '上报不实行为', description: '以欺瞒方式虚报正面行为，查实后登记', isHighSensitivity: true, isComposite: false, isInverseSelectable: false },
];

// ===== 正面行为定义（正面→护盾，背面→✓） =====
export const POSITIVE_BEHAVIORS: BehaviorDefinition[] = [
  // ===== 微芒(1盾/1✓) =====
  // 纪律
  { id: 'p-d-1', direction: 'positive', category: '纪律', weight: 1, name: '主动报名集体活动', description: '主动报名参加各项集体活动', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 学习
  { id: 'p-l-1', direction: 'positive', category: '学习', weight: 1, name: '按时完成作业', description: '按时、按要求完成作业', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'p-l-2', direction: 'positive', category: '学习', weight: 1, name: '课堂主动发言', description: '课堂主动发言', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'p-l-3', direction: 'positive', category: '学习', weight: 1, name: '作业高质量受表扬', description: '作业高质量完成，受到老师表扬', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'p-l-4', direction: 'positive', category: '学习', weight: 1, name: '考试名次进步', description: '在年级考试中取得名次进步（总等级未变）', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 卫生
  { id: 'p-h-1', direction: 'positive', category: '卫生', weight: 1, name: '个人区域整洁受表扬', description: '个人区域整洁，受到老师表扬', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 品行
  { id: 'p-p-1', direction: 'positive', category: '品行', weight: 1, name: '主动承认错误', description: '接受批评教育时主动向老师承认错误', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'p-p-2', direction: 'positive', category: '品行', weight: 1, name: '主动道歉并改正', description: '在同学矛盾中主动道歉并改正', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'p-p-3', direction: 'positive', category: '品行', weight: 1, name: '仪容仪表规范受表扬', description: '仪容仪表规范，受到老师表扬', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },

  // ===== 星光(2盾/2✓) =====
  // 纪律
  { id: 'p-d-2', direction: 'positive', category: '纪律', weight: 2, name: '集体活动规范受表扬', description: '集体活动中表现规范，受到老师表扬', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 学习
  { id: 'p-l-5', direction: 'positive', category: '学习', weight: 2, name: '帮助同学解决学习问题', description: '帮助同学解决学习问题，并得到确认', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 卫生
  { id: 'p-h-2', direction: 'positive', category: '卫生', weight: 2, name: '主动帮助值日', description: '主动帮助值日小组完成卫生任务', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 品行
  { id: 'p-p-4', direction: 'positive', category: '品行', weight: 2, name: '归还拾到物品', description: '主动归还拾到物品或上交失物', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },

  // ===== 闪耀(3盾/3✓) =====
  // 纪律
  { id: 'p-d-3', direction: 'positive', category: '纪律', weight: 3, name: '集体活动策划组织受表扬', description: '集体活动中负责策划、组织等，受到老师表扬', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 学习
  { id: 'p-l-6', direction: 'positive', category: '学习', weight: 3, name: '考试总等级进步', description: '在年级考试中取得总等级进步', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 卫生
  { id: 'p-h-3', direction: 'positive', category: '卫生', weight: 3, name: '值日小组一周达标', description: '卫生任务完成认真，值日小组一周内值日任务完全达标', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  // 品行
  { id: 'p-p-5', direction: 'positive', category: '品行', weight: 3, name: '代表班级取得荣誉', description: '在集体活动中代表班级取得荣誉', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
];

// ===== 标记名称 =====
export const BLANK_MARK_NAME = '星蚀';  // 正面空格标记（原×）
export const CHECK_MARK_NAME = '火种';  // 背面累积标记（原✓）

// ===== 星光护盾抵消比例 =====
export const SHIELD_OFFSET_RATIO = 2; // 2个护盾抵消1个星蚀

// ===== 自动触发规则 =====
export const AUTO_RULES: AutoRule[] = [];

// ===== 等级1进阶称号 =====
export const LEVEL_ONE_TITLES = [
  { weeksRequired: 1, name: '初级星辉', description: '持续保持星辉典范1周' },
  { weeksRequired: 2, name: '稳固星辉', description: '持续保持星辉典范2周' },
  { weeksRequired: 4, name: '永恒星辉', description: '持续保持星辉典范1个月' },
  { weeksRequired: 9, name: '传奇星辉', description: '持续保持星辉典范半学期' },
];

export const IMMORTAL_TITLES = [
  { heritageRequired: 3, name: '晨辉初耀', description: '累计获得3传承值' },
  { heritageRequired: 8, name: '晨辉长明', description: '累计获得8传承值' },
  { heritageRequired: 15, name: '永恒晨辉', description: '累计获得15传承值' },
  { heritageRequired: 25, name: '传奇不灭', description: '累计获得25传承值' },
];

export const IMMORTAL_DEMOTION_THRESHOLD = 3;

export const HEART_DEMON_CLEAR_RULES = {
  zeroViolation: {
    weeksRequired: 2,
    clearCount: 1,
    isActive: true,
  },
  shiningBehavior: {
    minWeight: 3,
    clearCount: 1,
    isActive: true,
  },
};

// ===== 正面回升任务配置 =====
export const RISE_TASKS: LevelConfig[] = [
  { side: 'front', level: 6, name: '深谷余烬', description: '', riseDaysRequired: 5, riseTask: '写一篇反思并交由班主任审阅' },
  { side: 'front', level: 5, name: '雾中孤星', description: '', riseDaysRequired: 5, riseTask: '主动发言2次' },
  { side: 'front', level: 4, name: '流星即逝', description: '', riseDaysRequired: 5, riseTask: '帮助1名同学解决学习问题' },
  { side: 'front', level: 3, name: '云翳遮星', description: '', riseDaysRequired: 5, riseTask: '承担1次班级公共任务' },
  { side: 'front', level: 2, name: '弦月之辉', description: '', riseDaysRequired: 5, riseTask: '为班级争得荣誉' },
];

// ===== 权重名称映射 =====
export const NEGATIVE_WEIGHT_NAMES: Record<NegativeWeight, string> = {
  1: '蒙尘',
  2: '褪色',
  3: '失格',
};

export const POSITIVE_WEIGHT_NAMES: Record<PositiveWeight, string> = {
  1: '微芒',
  2: '星光',
  3: '闪耀',
};

// ===== 等级特权与限制 =====

export const FRONT_LEVEL_EFFECTS: LevelEffect[] = [
  { level: 1, type: 'privilege', items: ['优先评优评奖', '优先担任班委核心职务', '期末获得「星辉典范」定制徽章', '座位优先选择权', '班级荣誉墙展示位'] },
  { level: 2, type: 'privilege', items: ['评优评奖次优先', '可担任班委职务', '期末获得「弦月清辉」定制徽章'] },
  { level: 3, type: 'privilege', items: ['可参与评优推荐', '可担任小组长'] },
  { level: 4, type: 'restriction', items: ['须每周提交自我反思', '作业须家长每日签字'] },
  { level: 5, type: 'restriction', items: ['须每周提交自我反思', '作业须家长每日签字', '座位由班主任指定', '与班主任每周面谈1次'] },
  { level: 6, type: 'restriction', items: ['须每周提交自我反思', '作业须家长每日签字', '座位由班主任指定', '与班主任每周面谈1次', '请家长到校面谈'] },
];

export const BACK_LEVEL_EFFECTS: LevelEffect[] = [
  { level: 1, type: 'restriction', items: ['须每周提交自我反思，并在翻面仪式上发表宣言', '作业须家长每日签字', '座位由班主任指定', '大课间须在教室自习', '参加课外活动须班主任批准'] },
  { level: 2, type: 'restriction', items: ['须每周提交自我反思', '作业须家长每日签字', '座位由班主任指定', '大课间须在教室自习'] },
  { level: 3, type: 'restriction', items: ['须每周提交自我反思', '作业须家长每日签字'] },
  { level: 4, type: 'privilege', items: ['获得「篝火渐旺」定制徽章', '可担任小组长'] },
  { level: 5, type: 'privilege', items: ['获得「熔炉之心」定制徽章', '可担任班委职务', '座位优先选择权', '班级荣誉墙展示位'] },
  { level: 6, type: 'privilege', items: ['获得「不朽晨辉」金色特别版徽章', '可担任班委核心职务', '评优评奖第一顺位', '座位选择第一优先级', '在班会课上进行主题分享', '班级荣誉墙特别展示'] },
];

// ===== 座位优先级排名 =====
// 排名1-8可自主选座，排名9-12由班主任指定

const SEAT_PRIORITY_MAP: Record<string, number> = {
  'back-6': 1,   // 不朽晨辉
  'front-1': 2,  // 星辉典范
  'back-5': 3,   // 熔炉之心
  'front-2': 4,  // 弦月之辉
  'back-4': 5,   // 篝火渐旺
  'front-3': 6,  // 云翳遮星
  'front-4': 7,  // 流星即逝
  'back-3': 8,   // 烛火摇曳
  'front-5': 9,  // 雾中孤星
  'back-2': 10,  // 火光初燃
  'front-6': 11, // 深谷余烬
  'back-1': 12,  // 冰封心火
};

export function getSeatPriority(cardSide: 'front' | 'back', level: number, priorityMap?: Record<string, number>): number {
  const map = priorityMap ?? SEAT_PRIORITY_MAP;
  return map[`${cardSide}-${level}`] ?? 12;
}

export function canChooseSeat(cardSide: 'front' | 'back', level: number, priorityMap?: Record<string, number>, threshold?: number): boolean {
  return getSeatPriority(cardSide, level, priorityMap) <= (threshold ?? 8);
}

// ===== 默认座位布局（13列网格：7列座位 + 6列过道） =====
// 用户确认的默认布局：3列三人桌 + 2列双人桌 + 2列单人桌
// 列分配: 1-2(双) 3(过道) 4-5(双) 6(过道) 7-8(双) 9(过道) 10-11(双) 12(过道) 13(单)

export function createDefaultGridLayout(): GridCell[] {
  const cells: GridCell[] = [];
  const ROWS = 7; // 6 regular rows + 1 extra for the lone seat
  const COLS = 13;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = `${r + 1}-${c + 1}`;
      let active = false;
      let mergedWith: 'right' | 'left' | undefined;

      if (r < 6) {
        // Rows 1-6: 4 pairs of double seats + 1 single
        // Cols 1-2: double (merged), Col 3: aisle
        // Cols 4-5: double (merged), Col 6: aisle
        // Cols 7-8: double (merged), Col 9: aisle
        // Cols 10-11: double (merged), Col 12: aisle
        // Col 13: single
        if (c === 0 || c === 3 || c === 6 || c === 9) {
          active = true;
          mergedWith = 'right';
        } else if (c === 1 || c === 4 || c === 7 || c === 10) {
          active = true;
          mergedWith = 'left';
        } else if (c === 12) {
          active = true;
        }
      } else if (r === 6) {
        // Row 7: one single seat at column 7
        if (c === 6) active = true;
      }

      cells.push({ id, row: r, col: c, active, mergedWith });
    }
  }
  return cells;
}

// ===== 生成默认教学周 =====
function generateDefaultTeachingWeeks(startDate: string): TeachingWeek[] {
  const weeks: TeachingWeek[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 20; i++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Monday to Friday
    weeks.push({
      weekNumber: i + 1,
      startDate: toLocalDateStr(weekStart),
      endDate: toLocalDateStr(weekEnd),
    });
  }
  return weeks;
}

// ===== 可编辑配置默认值 =====
// ===== 版本信息 =====
export const APP_VERSION = '1.3.0';

export const VERSION_LOGS: import('../types').VersionLog[] = [
  {
    version: '1.3.0',
    date: '2026-06-17',
    changes: [
      { title: '登记规则更完整：旧习复发与记录人惩罚加一', detail: '行为登记现在能更好地处理“旧习复发”等连续性问题；记录人相关惩罚也纳入规则链条，谁登记、怎么登记、后续如何追踪，都比之前更清楚。' },
      { title: '班委登录界面上线', detail: '班委入口从老师入口中拆分出来，登录身份更明确，日常登记更顺手，也减少了误进教师管理页面的可能。' },
      { title: '手机端全面适配与优化', detail: '全班总览、规则说明、行为录入、个人卡片等页面都重新照顾了手机宽度：按钮更适合触摸，卡片内容会自然换行，弹窗和列表不再像桌面网页硬缩小。' },
      { title: '数据同步链路加固', detail: '网页版读写数据改为通过 Vercel 接口与 GitHub 数据文件同步，减少不同浏览器、不同终端看到的数据不一致的问题。' },
      { title: '荣誉称号展示升级', detail: '星辉典范和不朽晨辉的进阶称号现在会在缩略图与个人卡片中以轻量徽章呈现；星辉典范周数按系统设置的教学日和教学周计算，不把未完成的本周提前算入。' },
      { title: '公告入口回归', detail: '右上角新增版本公告按钮。即使自动弹窗已经关闭，也可以随时手动打开，查看当前版本更新内容。' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-06-02',
    changes: [
      { title: '护盾体系重构：累积护盾 + 可用护盾', detail: '以前"历史护盾"统计的是从入学以来获得过的所有护盾，包含了已被违纪消耗掉的——看了白看。现在重新定义：累积护盾 = 可用护盾 + 已兑换护盾，即"如果没有兑换，现在该有多少盾"。兑换不降排名（累积不变），违纪照常扣减（可用和累积同时降）。传承值同理：累积传承值 = 可用传承值 + 已捐赠。星辉典范和不朽晨辉同学的个人卡片、逐个展示、缩略卡均已同步更新。' },
      { title: '兑换机制正式上线：攒盾不花的时代结束了', detail: '星辉典范同学可以用护盾兑换奖励，不朽晨辉同学可以用传承值兑换专属权益。兑换项按所需护盾/传承值由少到多自动排序。限时兑换项会标注醒目的"限时"标签。兑换后在个人卡片和全班历史中都会留下完整记录——谁换了什么，清清楚楚。' },
      { title: '回升优化：护盾保留，努力不被辜负', detail: '以前完成回升任务升级后，护盾会被清零——这不公平。现在回升后护盾保留、只清零星蚀。比如25护盾的同学从弦月之辉回升到星辉典范，25盾照常保留。同时，回升成功会自动生成行为记录，标注"弦月之辉 → 星辉典范"，在个人历史中永久留存。' },
      { title: '行为录入界面排序优化', detail: '学生名单现在按等级优先级排列：星辉典范排在最上面，其次微光初现、弦月之辉……直到暗影沉沦。同等级按学号排。再也不是乱七八糟的顺序了。' },
      { title: '兑换项管理优化', detail: '系统设置中的兑换项现在按所需护盾/传承值由少到多自动排序，方便一眼看出"最便宜"和"最贵"。' },
      { title: '界面细节打磨', detail: '逐个展示的统计格标签更简洁（累计/可用/心魔），文字不再被省略号截断；卡片宽度加宽，四格布局更加舒展；行为历史记录列表已修复排序问题，确保最新记录始终在最前面。' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-18',
    changes: [{ title: '星火燎原系统正式上线', detail: '班级管理卡片系统开启试运行，星辰与火焰双面卡片机制正式启用。' }],
  },
  {
    version: '1.1.0',
    date: '2026-05-21',
    changes: [
      { title: '护盾兑换/传承值兑换：攒着不花？那可亏了', detail: '一直不违纪，护盾越攒越多？恭喜你，现在星辉典范的同学们可以用护盾兑换奖励了！不朽晨辉的同学也别急，传承值同样可以兑换——而且正反面能换的东西还不一样哦。为什么只限这两个等级？因为其他等级的同学还在违纪呢，护盾和传承值对你们来说是保命用的，可不能拿来花！详情请看规则说明。' },
      { title: '诚实是最好的策略', detail: '新增「失格行为」——一旦查实虚报正面行为，该同学将被拉入该行为的黑名单，本学期内无法再登记该正面行为。三颗星蚀/心魔，外加封号，代价不小。' },
      { title: '限时活动上线', detail: '班主任可以随时发布限时活动——"课堂纪律突击周"也好，"艺术节报名加护盾/火种"也好，灵活配置，到期自动下线。限时活动会以醒目的金色标签出现在行为录入中，想看不到都难！' },
      { title: '正面行为也有排行榜了', detail: '违纪有Top6，正面行为现在也有Top6了！还能查看所有行为的详细频次——哪个正面行为最冷门？没人选？那就增加权重，看你们来不来！' },
      { title: '全班总览新增排序', detail: '按序号看腻了？现在可以按等级排序——谁在前谁在后，一目了然。同等级的同学按护盾减星蚀（正面）或火种减心魔（背面）排列，清清楚楚。' },
      { title: '逐个展示自动轮播', detail: '点一个看一个太累？新增自动播放功能，一键开始匀速滚动，再点暂停。展示更省力！' },
      { title: '修复与优化', detail: '修复折线图日期可能显示为前一天的问题；行为记录列表现在显示记录人；护盾消耗措辞统一为"消耗X护盾"；回升任务完成后护盾和星蚀数同时清零。' },
    ],
  },
  {
    version: '1.1.1',
    date: '2026-05-27',
    changes: [
      { title: '自动规则全面升级：自定义你的奖惩规则', detail: '自动规则设置全新改版！触发条件精简为两种——"一周内无某行为"和"一周内某行为达X次"，效果类型统一为"护盾/火种（按正反面）"和"星蚀/心魔（按正反面）"。现在你可以在系统设置中自由添加、编辑、启用或禁用任何自动规则，不再受限于内置配置。"一周作业全勤""一周零违纪""一周无迟到"等预设规则均可通过"一周内无某行为"自由组合实现。' },
      { title: '手动结算上周：测试规则更方便', detail: '新增"重新结算上周"按钮。设置完规则后，点击即可在下次进入仪表盘时自动结算上周的自动规则。已有结算记录不会重复添加，新增规则也会被正确结算。' },
      { title: '修复：多条自动规则叠加计算错误', detail: '重大修复！此前当多条自动规则对同一同学同时生效时（例如+2护盾+2护盾+4护盾），只有最后一条规则的效果会被保留。现在每条规则都会正确累加到同学的状态上。' },
      { title: '修复：自动规则行为记录权重显示错误', detail: '此前奖励规则的行为记录中权重始终显示为1，不论实际加了多少护盾/火种。现在已修正为正确数值。' },
      { title: '修复：行为记录中显示系统内部标记', detail: '自动规则产生的行为记录备注中，此前会显示"ruleId:ar-2"之类的内部去重标记，现已隐藏，只保留有意义的结算信息。' },
      { title: '修复：限时活动权重名称显示错误', detail: '添加或编辑限时活动时，负面行为的权重下拉菜单此前错误显示正面行为名称（微芒/星光/闪耀），现在正确显示蒙尘/褪色/失格。下拉框文字与箭头重叠的问题也已修复。' },
      { title: '优化：行为历史与界面显示', detail: '个人行为历史记录不再被单行截断，最多可显示两行；行为录入中同学名单超长时不再溢出显示框；星辉典范/不朽晨辉名单改为网格布局，更加整齐美观。' },
    ],
  },
];

// ===== 兑换商店默认项 =====
export const DEFAULT_EXCHANGE_ITEMS: import('../types').ExchangeItem[] = [
  // 正面（护盾兑换）—— 定价基准：中位护盾获取≈9盾/周
  // 日常小确幸（3-5盾，1-2天）
  { id: 'ex-f-1', side: 'front', cost: 3, name: '课间点歌一首', description: '电教管理员负责播放，班长审查歌曲，纪律部维持安静', isActive: true },
  { id: 'ex-f-2', side: 'front', cost: 4, name: '选一张图片做桌面壁纸一周', description: '自己选图，电教管理员帮忙换', isActive: true },
  { id: 'ex-f-3', side: 'front', cost: 4, name: '借阅班主任一本书籍一周', description: '爱护书籍，按时归还', isActive: true },
  { id: 'ex-f-4', side: 'front', cost: 5, name: '晚自习看课外书一节', description: '作业做完的前提下', isActive: true },
  // 一周惊喜（8-12盾，≈1周）
  { id: 'ex-f-5', side: 'front', cost: 8, name: '和任意同学换座位一天', description: '双方同意即可', isActive: true },
  { id: 'ex-f-6', side: 'front', cost: 8, name: '带桌游到学校一天', description: '仅限课间/午休玩', isActive: true },
  { id: 'ex-f-7', side: 'front', cost: 12, name: '班会课自选视频播放', description: '20分钟以内，需班长预审内容', isActive: true },
  // 重磅福利（18-25盾，≈2周）
  { id: 'ex-f-8', side: 'front', cost: 12, name: '一封表扬信', description: '班主任亲笔，可带给家长', isActive: true },
  { id: 'ex-f-9', side: 'front', cost: 18, name: '免值日一次', description: '提前一天告知劳动委员', isActive: true },
  { id: 'ex-f-10', side: 'front', cost: 20, name: '免受惩罚一次', description: '如罚值日、罚扣分；不含严重违纪', isActive: true },
  { id: 'ex-f-11', side: 'front', cost: 25, name: '和同学彻底调换座位', description: '被换同学获得6盾补偿', isActive: true },
  { id: 'ex-f-12', side: 'front', cost: 8, name: '小组免值日一次', description: '小组每人8盾，全组出齐即可', isActive: true },
  // 终极目标（30-40盾，≈3-4周）
  { id: 'ex-f-13', side: 'front', cost: 30, name: '作业减免券（1次）', description: '单科单次作业', isActive: true },
  { id: 'ex-f-14', side: 'front', cost: 40, name: '自选同桌权（1周）', description: '双方同意，被选同学获5盾', isActive: true },
  { id: 'ex-f-15', side: 'front', cost: 10, name: '与班主任共进午餐', description: '聊天、吐槽、提建议，管饭', isActive: true },
  // 背面（传承值兑换）—— 目前无背面同学，为未来设计
  { id: 'ex-b-1', side: 'back', cost: 2, name: '为班级选一首晨读诗', description: '下周晨读使用', isActive: true },
  { id: 'ex-b-2', side: 'back', cost: 3, name: '指定一位同学回答你的问题', description: '学习/生活问题均可', isActive: true },
  { id: 'ex-b-3', side: 'back', cost: 5, name: '在班会上分享一个故事', description: '5分钟以内', isActive: true },
  { id: 'ex-b-4', side: 'back', cost: 10, name: '获得"薪火使者"称号', description: '荣誉称号，有效期至学期末', isActive: true },
];

export const DEFAULT_TIME_PERIODS = [
  // 学科课程
  { id: 'tp-yuwen', name: '语文课', group: 'course' as const },
  { id: 'tp-shuxue', name: '数学课', group: 'course' as const },
  { id: 'tp-yingyu', name: '英语课', group: 'course' as const },
  { id: 'tp-zhengzhi', name: '政治课', group: 'course' as const },
  { id: 'tp-lishi', name: '历史课', group: 'course' as const },
  { id: 'tp-tiyu', name: '体育课', group: 'course' as const },
  { id: 'tp-dili', name: '地理课', group: 'course' as const },
  { id: 'tp-shengwu', name: '生物课', group: 'course' as const },
  { id: 'tp-meishu', name: '美术课', group: 'course' as const },
  { id: 'tp-yinyue', name: '音乐课', group: 'course' as const },
  { id: 'tp-xinxi', name: '信息课', group: 'course' as const },
  { id: 'tp-xinli', name: '心理课', group: 'course' as const },
  { id: 'tp-zixi', name: '自习课', group: 'course' as const },
  // 其他时段
  { id: 'tp-kejian', name: '课间', group: 'other' as const },
  { id: 'tp-jiti', name: '集体活动期间', group: 'other' as const },
];

export const DEFAULT_HOMEWORK_SUBJECTS = [
  { id: 'hw-yuwen', name: '语文' },
  { id: 'hw-shuxue', name: '数学' },
  { id: 'hw-yingyu', name: '英语' },
  { id: 'hw-zhengzhi', name: '政治' },
  { id: 'hw-lishi', name: '历史' },
  { id: 'hw-tiyu', name: '体育' },
  { id: 'hw-dili', name: '地理' },
  { id: 'hw-shengwu', name: '生物' },
  { id: 'hw-meishu', name: '美术' },
  { id: 'hw-yinyue', name: '音乐' },
  { id: 'hw-xinxi', name: '信息' },
  { id: 'hw-xinli', name: '心理' },
  { id: 'hw-zixi', name: '自习' },
  { id: 'hw-banhui', name: '班会' },
  { id: 'hw-kouyu', name: '英语口语' },
];

export const CURRENT_CONFIG_VERSION = 17;

export const DEFAULT_APP_CONFIG: AppConfig = {
  version: 17,
  frontLevels: FRONT_LEVELS,
  backLevels: BACK_LEVELS,
  frontLevelEffects: FRONT_LEVEL_EFFECTS,
  backLevelEffects: BACK_LEVEL_EFFECTS,
  negativeBehaviors: NEGATIVE_BEHAVIORS,
  positiveBehaviors: POSITIVE_BEHAVIORS,
  negativeWeightNames: { ...NEGATIVE_WEIGHT_NAMES },
  positiveWeightNames: { ...POSITIVE_WEIGHT_NAMES },
  blankMarkName: BLANK_MARK_NAME,
  checkMarkName: CHECK_MARK_NAME,
  shieldOffsetRatio: SHIELD_OFFSET_RATIO,
  autoRules: AUTO_RULES,
  heartDemonClearRules: HEART_DEMON_CLEAR_RULES,
  riseTasks: RISE_TASKS,
  levelOneTitles: LEVEL_ONE_TITLES,
  immortalTitles: IMMORTAL_TITLES,
  immortalDemotionThreshold: IMMORTAL_DEMOTION_THRESHOLD,
  seatPriorityMap: { ...SEAT_PRIORITY_MAP },
  chooseThreshold: 8,
  semesterStartDate: '2026-02-17',
  teachingWeeks: generateDefaultTeachingWeeks('2026-02-17'),
  categories: ['纪律', '学习', '卫生', '品行'],
  committeeNames: ['王老师'],
  exchangeItems: DEFAULT_EXCHANGE_ITEMS,
  limitedEvents: [],
  timePeriods: DEFAULT_TIME_PERIODS,
  homeworkSubjects: DEFAULT_HOMEWORK_SUBJECTS,
  versionLogs: VERSION_LOGS,
};
