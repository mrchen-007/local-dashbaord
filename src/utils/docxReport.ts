// Word 报告生成器
// 使用 docx 库生成 .docx 格式的风险分析报告

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, Header,
  Footer, PageNumber, ShadingType, convertInchesToTwip,
} from 'docx';
import { Project, RiskResult, RiskLevel } from '../types';

// 风险等级标签映射
const RISK_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  high: 'FF0000',
  medium: 'FFA500',
  low: '00AA00',
};

// 格式化金额
function fmtMoney(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(2)}万`;
  return v.toFixed(2);
}

// 格式化百分比
function fmtPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/**
 * 生成风险分析报告
 * @param projects 项目列表
 * @param riskResults 风险计算结果
 * @returns Uint8Array 格式的 .docx 文件内容
 */
export async function generateRiskReport(
  projects: Project[],
  riskResults: RiskResult[]
): Promise<Uint8Array> {
  const highRiskCount = riskResults.filter(r => r.overallRisk === 'high').length;
  const mediumRiskCount = riskResults.filter(r => r.overallRisk === 'medium').length;
  const lowRiskCount = riskResults.filter(r => r.overallRisk === 'low').length;

  // ===== 封面 =====
  const coverSection = [
    new Paragraph({
      spacing: { before: 4000 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '工程项目风险分析报告',
          bold: true,
          size: 44,
          color: '0A0E17',
          font: 'Microsoft YaHei',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Engineering Project Risk Assessment Report',
          size: 24,
          color: '666666',
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `报告生成日期：${new Date().toLocaleDateString('zh-CN')}`,
          size: 22,
          color: '333333',
          font: 'Microsoft YaHei',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `监控项目数：${projects.length}个 | 高风险：${highRiskCount}个 | 中风险：${mediumRiskCount}个 | 低风险：${lowRiskCount}个`,
          size: 20,
          color: '555555',
          font: 'Microsoft YaHei',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `系统版本：工程项目数据稽查系统 V1.1`,
          size: 20,
          color: '555555',
          font: 'Microsoft YaHei',
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    // 分页
    new Paragraph({
      children: [new TextRun({ text: '', size: 11 })],
      pageBreakBefore: true,
    }),
  ];

  // ===== 风险总览 =====
  const overviewTitle = new Paragraph({
    children: [
      new TextRun({
        text: '一、风险总览',
        bold: true,
        size: 28,
        color: '0A0E17',
        font: 'Microsoft YaHei',
      }),
    ],
    spacing: { before: 400, after: 300 },
  });

  const overviewTable = new Table({
    rows: [
      new TableRow({
        children: ['风险等级', '项目数量', '占比', '说明'].map(text =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text, bold: true, size: 20, font: 'Microsoft YaHei', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { type: ShadingType.SOLID, color: '0A0E17' },
          })
        ),
      }),
      new TableRow({
        children: [
          { text: '高风险', color: RISK_COLORS.high, count: highRiskCount },
          { text: '中风险', color: RISK_COLORS.medium, count: mediumRiskCount },
          { text: '低风险', color: RISK_COLORS.low, count: lowRiskCount },
          { text: '合计', color: '000000', count: projects.length },
        ].map(({ text, color, count }) =>
          new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({ text: `${text}`, size: 20, font: 'Microsoft YaHei', color }),
                new TextRun({ text: `\n${count}`, bold: true, size: 22, font: 'Microsoft YaHei', color }),
                new TextRun({ text: `\n${((count / Math.max(projects.length, 1)) * 100).toFixed(1)}%`, size: 18, font: 'Microsoft YaHei', color: '666666' }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            })],
          })
        ),
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  const overviewSection = [overviewTitle, overviewTable, new Paragraph({ spacing: { after: 400 } })];

  // ===== 风险详情（按项目展开） =====
  const detailTitle = new Paragraph({
    children: [
      new TextRun({
        text: '二、风险详情',
        bold: true,
        size: 28,
        color: '0A0E17',
        font: 'Microsoft YaHei',
      }),
    ],
    spacing: { before: 400, after: 300 },
  });

  const detailSections: (Paragraph | Table)[] = [detailTitle];

  riskResults.forEach((result, idx) => {
    const project = projects.find(p => p.id === result.projectId);

    // 项目标题
    detailSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${idx + 1}. ${result.projectName}`,
            bold: true,
            size: 24,
            color: '0A0E17',
            font: 'Microsoft YaHei',
          }),
          new TextRun({
            text: `  [${RISK_LABELS[result.overallRisk]}]`,
            bold: true,
            size: 22,
            color: RISK_COLORS[result.overallRisk],
            font: 'Microsoft YaHei',
          }),
        ],
        spacing: { before: 300, after: 200 },
      })
    );

    // 项目基本信息表
    if (project) {
      const infoRows = [
        ['合同编号', project.contractNo, '合同金额', fmtMoney(project.contractAmount)],
        ['总成本', fmtMoney(project.totalCost), '结算金额', fmtMoney(project.settlementAmount)],
        ['人工成本', fmtMoney(project.laborCost), '材料成本', fmtMoney(project.materialCost)],
        ['设备成本', fmtMoney(project.equipmentCost), '分包金额', fmtMoney(project.subcontractAmount)],
        ['预估毛利率', fmtPercent(project.estimatedProfitRate), '实际毛利率', fmtPercent(project.actualProfitRate)],
      ];

      detailSections.push(
        new Table({
          rows: infoRows.map(row =>
            new TableRow({
              children: row.map(cell =>
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: cell, size: 18, font: 'Microsoft YaHei' })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { type: ShadingType.SOLID, color: 'F3F4F6' },
                })
              ),
            })
          ),
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    // 风险详情
    if (result.riskDetails.length > 0) {
      const riskHeaderRow = new TableRow({
        children: ['风险规则', '风险等级', '当前值', '阈值'].map(text =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text, bold: true, size: 18, font: 'Microsoft YaHei', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { type: ShadingType.SOLID, color: result.overallRisk === 'high' ? 'DC2626' : result.overallRisk === 'medium' ? 'D97706' : '059669' },
            width: { size: 25, type: WidthType.PERCENTAGE },
          })
        ),
      });

      const riskDetailRows = result.riskDetails.map(detail =>
        new TableRow({
          children: [
            detail.ruleName,
            RISK_LABELS[detail.level],
            detail.currentValue,
            detail.thresholdValue,
          ].map(text =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text, size: 18, font: 'Microsoft YaHei' })],
                alignment: AlignmentType.CENTER,
              })],
            })
          ),
        })
      );

      detailSections.push(
        new Paragraph({ spacing: { before: 100 } }),
        new Table({
          rows: [riskHeaderRow, ...riskDetailRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ spacing: { after: 200 } })
      );
    } else {
      detailSections.push(
        new Paragraph({
          children: [new TextRun({ text: '未触发任何风险规则，项目运行正常。', size: 20, color: '059669', font: 'Microsoft YaHei' })],
          spacing: { after: 200 },
        })
      );
    }
  });

  // ===== 构建文档 =====
  const doc = new Document({
    // 使用 docx 库创建文档
    title: '工程项目风险分析报告',
    description: '自动生成的风险分析报告',
    styles: {
      default: {
        document: {
          run: { font: 'Microsoft YaHei', size: 22 },
          paragraph: { spacing: { after: 100 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({ text: '工程项目风险分析报告', size: 16, color: '999999', font: 'Microsoft YaHei' })],
              alignment: AlignmentType.RIGHT,
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                new TextRun({ text: '第 ', size: 16, color: '999999' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '999999' }),
                new TextRun({ text: ' 页', size: 16, color: '999999' }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        children: [
          ...coverSection,
          ...overviewSection,
          ...detailSections,
        ],
      },
    ],
  });

  // 生成 .docx 文件
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer()) as unknown as Uint8Array;
}

/**
 * 下载风险报告
 */
export async function downloadRiskReport(projects: Project[], riskResults: RiskResult[]) {
  const uint8Array = await generateRiskReport(projects, riskResults);
  const blob = new Blob([new Uint8Array(uint8Array.buffer as ArrayBuffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `工程项目风险分析报告_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
