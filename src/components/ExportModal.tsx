import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, X, Search, Check, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Student, BehaviorRecord, Category } from '../types';
import { getLevelName } from '../lib/cardLogic';
import { useConfig } from '../contexts/ConfigContext';
import { D, INK, INK_OPTION } from '../data/theme';

const CATEGORIES: Category[] = ['纪律', '学习', '卫生', '品行'];

interface ExportModalProps {
  students: Student[];
  records: BehaviorRecord[];
  onClose: () => void;
}

export default function ExportModal({ students, records, onClose }: ExportModalProps) {
  const config = useConfig();
  const [searchText, setSearchText] = useState('');
  const [sideFilter, setSideFilter] = useState<'all' | 'front' | 'back'>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set(CATEGORIES));
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(students.map(s => s.id)));

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (sideFilter !== 'all' && s.cardSide !== sideFilter) return false;
      if (searchText && !s.name.includes(searchText)) return false;
      return true;
    });
  }, [students, sideFilter, searchText]);

  // Toggle student selection
  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
  const selectNone = () => setSelectedStudentIds(new Set());

  // Toggle category
  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Export to Excel
  const handleExport = () => {
    const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));
    const selectedRecords = records.filter(r =>
      selectedStudentIds.has(r.studentId) && selectedCategories.has(r.category as Category)
    );

    // Sheet 1: Student overview with behavior details
    const overviewData = selectedStudents.map(s => {
      const effects = s.cardSide === 'front'
        ? config.frontLevelEffects[s.currentLevel - 1]
        : config.backLevelEffects[s.currentLevel - 1];
      const studentRecords = selectedRecords.filter(r => r.studentId === s.id);
      const negRecords = studentRecords.filter(r => r.direction === 'negative');
      const posRecords = studentRecords.filter(r => r.direction === 'positive');

      // Aggregate behavior details: behaviorName × count
      const negDetail = negRecords.reduce((acc, r) => {
        acc[r.description] = (acc[r.description] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const negDetailStr = Object.entries(negDetail).map(([name, count]) => `${name}×${count}`).join(', ');

      const posDetail = posRecords.reduce((acc, r) => {
        acc[r.description] = (acc[r.description] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const posDetailStr = Object.entries(posDetail).map(([name, count]) => `${name}×${count}`).join(', ');

      return {
        '学号': s.number,
        '姓名': s.name,
        '卡片面': s.cardSide === 'front' ? '正面' : '背面',
        '等级': s.currentLevel,
        '等级名称': getLevelName(s.cardSide, s.currentLevel, config.frontLevels, config.backLevels),
        '类型': effects.type === 'privilege' ? '特权' : '限制',
        [config.blankMarkName]: s.blanksFilled,
        [config.checkMarkName]: s.cumulativeChecks,
        '星光护盾': s.starShields, '累积护盾': s.starShields + ((s as any).totalShieldsExchanged || 0), '可用护盾': s.starShields, '可用传承值': s.heritagePoints, '累积传承值': s.heritagePoints + s.totalHeritageDonated, '已捐赠': s.totalHeritageDonated,
        '心魔印记': s.heartDemonMarks,
        '连续无违纪天数': s.consecutiveNoViolationDays,
        '负面行为明细': negDetailStr || '无',
        '正面行为明细': posDetailStr || '无',
      };
    });

    // Sheet 2: Behavior records detail
    const recordsData = selectedRecords.map(r => {
      const student = students.find(s => s.id === r.studentId);
      return {
        '学号': student?.number ?? '',
        '姓名': student?.name ?? '',
        '方向': r.direction === 'negative' ? '负面' : '正面',
        '类别': r.category,
        '行为名称': r.description,
        '备注': r.remark ?? '',
        '权重': r.weight,
        '高敏感': r.isHighSensitivity ? '是' : '否',
        '记录人': r.recordedBy,
        '时间': new Date(r.createdAt).toLocaleString('zh-CN'),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(overviewData);
    const ws2 = XLSX.utils.json_to_sheet(recordsData);
    XLSX.utils.book_append_sheet(wb, ws1, '学生行为明细');
    XLSX.utils.book_append_sheet(wb, ws2, '行为记录流水');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `星火燎原_数据导出_${date}.xlsx`);
    onClose();
  };

  const selectedCount = filteredStudents.filter(s => selectedStudentIds.has(s.id)).length;

  const fontFamily = "'LXGW WenKai', 'Cinzel', serif";

  return (
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
          width: '90%', maxWidth: 600, maxHeight: '80vh',
          background: D.bgCard, borderRadius: D.radius, border: D.glassBorder, backdropFilter: D.glassBlur,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily,
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${INK.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: INK.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily }}>
              <Download size={18} /> 导出数据
            </h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: INK.textMuted }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {/* Search & side filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: INK.textMuted }} />
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="搜索学生姓名..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', borderRadius: D.radiusSm,
                  background: D.bgInput, border: `1px solid ${D.border}`,
                  color: INK.textPrimary, fontSize: 13, outline: 'none',
                  fontFamily,
                }}
              />
            </div>
            <select
              value={sideFilter}
              onChange={e => setSideFilter(e.target.value as 'all' | 'front' | 'back')}
              style={{
                padding: '8px 12px', borderRadius: D.radiusSm,
                background: D.bgInput, border: `1px solid ${D.border}`,
                color: INK.textPrimary, fontSize: 13,
                fontFamily,
              }}
            >
              <option value="all" style={INK_OPTION}>全部</option>
              <option value="front" style={INK_OPTION}>正面</option>
              <option value="back" style={INK_OPTION}>背面</option>
            </select>
          </div>

          {/* Category filter */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: INK.textMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={12} /> 导出行为类别
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    background: selectedCategories.has(cat) ? D.goldDim : D.bgCard,
                    border: `1px solid ${selectedCategories.has(cat) ? D.borderGlow : D.border}`,
                    color: selectedCategories.has(cat) ? D.gold : D.textDim,
                    fontFamily,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Student selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: INK.textMuted }}>
                已选 {selectedCount} / {filteredStudents.length} 人
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={selectAll} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: D.goldDim, border: `1px solid ${D.borderGlow}`, color: D.gold, fontFamily }}>全选</button>
                <button onClick={selectNone} style={{ padding: '2px 8px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer', background: D.bgCard, border: `1px solid ${D.border}`, color: D.textDim, fontFamily }}>清空</button>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredStudents.map(s => (
                <div
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  style={{
                    padding: '6px 10px', borderRadius: D.radiusSm, cursor: 'pointer',
                    background: selectedStudentIds.has(s.id) ? D.goldDim : 'transparent',
                    border: `1px solid ${selectedStudentIds.has(s.id) ? D.borderGlow : 'transparent'}`,
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: D.radiusXs, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: selectedStudentIds.has(s.id) ? D.gold : D.border,
                    border: `1px solid ${selectedStudentIds.has(s.id) ? D.gold : D.border}`,
                  }}>
                    {selectedStudentIds.has(s.id) && <Check size={10} style={{ color: INK.bgDeep }} />}
                  </div>
                  <span style={{ color: INK.textPrimary }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: s.cardSide === 'front' ? INK.starGold : INK.flameEmber, marginLeft: 'auto' }}>
                    {getLevelName(s.cardSide, s.currentLevel, config.frontLevels, config.backLevels)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${INK.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: D.radiusSm, fontSize: 14, cursor: 'pointer',
              background: D.bgCard, border: `1px solid ${D.border}`, color: D.textDim,
              fontFamily,
            }}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={selectedCount === 0}
            style={{
              padding: '8px 20px', borderRadius: D.radiusSm, fontSize: 14, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
              background: selectedCount === 0 ? D.bgCard : `linear-gradient(135deg, ${D.gold}, ${D.flameGold})`,
              border: 'none', color: selectedCount === 0 ? D.textDim : '#000000', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: selectedCount === 0 ? 'none' : D.goldGlowStrong,
              fontFamily,
            }}
          >
            <Download size={16} /> 导出 Excel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
