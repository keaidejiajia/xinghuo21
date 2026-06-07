const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageBreak, PageNumber } = require('docx');

// ===== 读取数据 =====
const dataPath = path.join(process.env.HOME, 'Desktop', '星火燎原', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const config = data['app-config'];
const negBehaviors = config.negativeBehaviors;
const posBehaviors = config.positiveBehaviors;
const students = data.students;
const negWN = config.negativeWeightNames;  // {"1":"蒙尘","2":"褪色","3":"失格"}
const posWN = config.positiveWeightNames;  // {"1":"微芒","2":"星光","3":"闪耀"}
const categories = config.categories;      // ["纪律","学习","卫生","品行"]

const catColors = { '纪律': 'C0392B', '学习': '2980B9', '卫生': '27AE60', '品行': '8E44AD' };
const PAGE_W = 11906; // A4 width in DXA
const MARGIN = 850;   // ~15mm
const USABLE_W = PAGE_W - 2 * MARGIN; // 10206

// ===== 工具函数 =====
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: '666666' };
const headerCellBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function emptyCell(width) {
  return new TableCell({
    borders: cellBorders, width: { size: width, type: WidthType.DXA },
    children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [] })]
  });
}

function textCell(text, width, opts = {}) {
  const { bold, color, size, align, shading, borders: b } = opts;
  return new TableCell({
    borders: b || cellBorders, width: { size: width, type: WidthType.DXA },
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: String(text), bold: !!bold, color: color || '333333', size: size || 18, font: '微软雅黑' })]
    })]
  });
}

// ===== 封面页 =====
function createCover() {
  return [
    new Paragraph({ spacing: { before: 4000 }, alignment: AlignmentType.CENTER, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: '星火燎原', bold: true, size: 72, color: 'C0392B', font: '微软雅黑' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 600 },
      children: [new TextRun({ text: '行为记录册', bold: true, size: 52, color: '333333', font: '微软雅黑' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: '行为速查 · 分册记录 · 精准溯源', size: 24, color: '888888', font: '微软雅黑' })]
    }),
  ];
}

// ===== 行为速查表（一页 2×2 布局）=====
function createBehaviorRefTables() {
  const halfW = Math.floor(USABLE_W / 2); // ~5103 DXA per column
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const catBorder = { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' };
  const catBorders = { top: catBorder, bottom: catBorder, left: catBorder, right: catBorder };

  // Build content paragraphs for one category cell
  function catCellContent(cat) {
    const color = catColors[cat];
    const paras = [];
    // Category title
    paras.push(new Paragraph({
      spacing: { before: 60, after: 80 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `【${cat}类】`, bold: true, size: 22, color, font: '微软雅黑' })]
    }));

    const catNeg = negBehaviors.filter(b => b.category === cat).sort((a, b) => a.weight - b.weight);
    const catPos = posBehaviors.filter(b => b.category === cat).sort((a, b) => a.weight - b.weight);

    // Group by weight
    function addSection(label, behaviors, weightNames) {
      paras.push(new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [new TextRun({ text: label, bold: true, size: 16, color: '999999', font: '微软雅黑' })]
      }));
      const byWeight = {};
      for (const b of behaviors) {
        const w = b.weight;
        if (!byWeight[w]) byWeight[w] = [];
        byWeight[w].push(b.name);
      }
      for (const w of Object.keys(byWeight).sort((a, b) => a - b)) {
        const levelName = weightNames[w];
        const names = byWeight[w].join('、');
        paras.push(new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({ text: levelName + ' ', bold: true, size: 16, color, font: '微软雅黑' }),
            new TextRun({ text: names, size: 15, color: '333333', font: '微软雅黑' }),
          ]
        }));
      }
    }

    addSection('负面', catNeg, negWN);
    addSection('正面', catPos, posWN);
    return paras;
  }

  // 2x2 table
  const colW = [halfW, halfW];
  const catOrder = ['纪律', '学习', '卫生', '品行']; // Row1: 纪律+学习, Row2: 卫生+品行
  const tableRows = [
    new TableRow({
      children: [0, 1].map(ci => new TableCell({
        borders: catBorders, width: { size: colW[ci], type: WidthType.DXA },
        children: catCellContent(catOrder[ci])
      }))
    }),
    new TableRow({
      children: [0, 1].map(ci => new TableCell({
        borders: catBorders, width: { size: colW[ci], type: WidthType.DXA },
        children: catCellContent(catOrder[ci + 2])
      }))
    }),
  ];

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 100, after: 200 },
      children: [new TextRun({ text: '行为速查表', bold: true, size: 30, color: '333333', font: '微软雅黑' })]
    }),
    new Table({ columnWidths: colW, rows: tableRows }),
  ];
}

// ===== 班级花名册 =====
function createRoster() {
  const children = [];
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 200, after: 300 },
    children: [new TextRun({ text: '班级花名册', bold: true, size: 32, color: '333333', font: '微软雅黑' })]
  }));
  const colW = Array(7).fill(Math.floor(USABLE_W / 7));
  const perCol = Math.ceil(students.length / 7);
  const rows = [];
  // Header row
  rows.push(new TableRow({
    children: Array(7).fill(null).map((_, i) =>
      textCell('序号/姓名', colW[i], { bold: true, align: AlignmentType.CENTER, shading: 'E0E0E0', size: 16 })
    )
  }));
  // Data rows
  for (let r = 0; r < perCol; r++) {
    rows.push(new TableRow({
      children: Array(7).fill(null).map((_, col) => {
        const idx = col * perCol + r;
        if (idx >= students.length) return emptyCell(colW[col]);
        const s = students[idx];
        return textCell(`${s.number} ${s.name}`, colW[col], { align: AlignmentType.CENTER, size: 18 });
      })
    }));
  }
  children.push(new Table({ columnWidths: colW, rows }));
  return children;
}

// ===== 记录表页 =====
function createRecordingPage(committeeName, catName, catColor) {
  const children = [];
  // Page header
  children.push(new Paragraph({
    spacing: { before: 100, after: 50 },
    children: [
      new TextRun({ text: committeeName + '记录册', bold: true, size: 28, color: catColor, font: '微软雅黑' }),
      new TextRun({ text: `    【${catName}类】`, bold: true, size: 24, color: '666666', font: '微软雅黑' }),
    ]
  }));

  // Recording table
  const colW = [1100, 1000, 1700, 3250, 2006, 1150]; // 日期|记录人|时间/节次|行为|涉及同学|备注
  const headers = ['日期', '记录人', '时间/节次', '行为', '涉及同学', '备注'];
  const ROWS_PER_PAGE = 15;

  const rows = [
    new TableRow({
      tableHeader: true,
      children: headers.map((t, i) =>
        textCell(t, colW[i], {
          bold: true, color: 'FFFFFF', shading: catColor,
          align: AlignmentType.CENTER, borders: headerCellBorders, size: 18
        })
      )
    }),
    ...Array(ROWS_PER_PAGE).fill(null).map(() => new TableRow({
      children: colW.map((w, i) => {
        // Add placeholder text for date column
        if (i === 0) {
          return new TableCell({
            borders: cellBorders, width: { size: w, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: '  /   /  ', color: 'CCCCCC', size: 16, font: '微软雅黑' })]
            })]
          });
        }
        return emptyCell(w);
      })
    }))
  ];
  children.push(new Table({ columnWidths: colW, rows }));
  return children;
}

// ===== 分册标题页 =====
function createSectionTitle(committeeName, catList) {
  const children = [];
  children.push(new Paragraph({ spacing: { before: 3000 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 300 },
    children: [new TextRun({ text: committeeName + '记录册', bold: true, size: 52, color: '333333', font: '微软雅黑' })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: '记录类别：' + catList.join(' · '), size: 24, color: '888888', font: '微软雅黑' })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '（请逐行填写日期、记录人、具体时间/节次）', size: 20, color: 'AAAAAA', font: '微软雅黑', italics: true })]
  }));
  return children;
}

// ===== 组装文档 =====
const sections = [];

// Section 1: Cover + Reference + Roster
const refChildren = [
  ...createCover(),
  ...createBehaviorRefTables(),
  new Paragraph({ children: [new PageBreak()] }),
  ...createRoster(),
];
sections.push({
  properties: {
    page: { margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
  },
  headers: {
    default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: '星火燎原 · 行为记录册', size: 16, color: 'CCCCCC', font: '微软雅黑' })]
    })] })
  },
  children: refChildren,
});

// Section 2-5: 4 booklets
const booklets = [
  { name: '班长', cats: ['纪律', '学习', '卫生', '品行'], pagesPerCat: 5 },
  { name: '纪律委员', cats: ['纪律'], pagesPerCat: 10 },
  { name: '劳动委员', cats: ['卫生'], pagesPerCat: 10 },
  { name: '学习委员', cats: ['学习'], pagesPerCat: 10 },
];

for (const bk of booklets) {
  const children = [];
  // Title page
  children.push(...createSectionTitle(bk.name, bk.cats));
  // Recording pages for each category
  for (const cat of bk.cats) {
    for (let p = 0; p < bk.pagesPerCat; p++) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(...createRecordingPage(bk.name, cat, catColors[cat]));
    }
  }
  sections.push({
    properties: {
      page: { margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
    },
    children,
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: '微软雅黑', size: 20 } } }
  },
  sections,
});

// ===== 输出 =====
const outPath = path.join(process.env.HOME, 'Desktop', '星火燎原', '班委记录册.docx');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log('Done:', outPath);
});
