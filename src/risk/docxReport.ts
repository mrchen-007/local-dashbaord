// Word 报告生成器
// 使用 docx 库生成 .docx 格式的风险分析报告

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, Header,
  Footer, PageNumber, ShadingType,
} from 'docx';
import { Project, RiskResult, RiskLevel } from '../shared/types';

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
 * 返回 Uint8Array 供下载
 */
export async function generateRiskReport(
  projects: Project[],
  riskResults: RiskResult[]
): Promise<Uint8Array> {
  // 风险统计
  const highCount = riskResults.filter(r => r.overallRisk === 'high').length;
  const mediumCount = riskResults.filter(r => r.overallRisk === 'medium').length;
  const lowCount = riskResults.filter(r => r.overallRisk === 'low').length;

  // 风险总览表
  const statsRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '总项目数', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(String(projects.length))] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '高风险项目', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(String(highCount))] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '中风险项目', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(String(mediumCount))] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '低风险项目', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(String(lowCount))] }),
      ],
    }),
  ];

  // 项目风险详情表
  const projectDetailRows = projects.map((project, _index) => {
    const risk = riskResults.find(r => r.projectId === project.id);
    const riskLevel = risk?.overallRisk || 'low';
    const riskLabel = RISK_LABELS[riskLevel];
    const riskColor = RISK_COLORS[riskLevel];

    return new TableRow({
      children: [
        new TableCell({ width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph(project.name)] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph(fmtMoney(project.contractAmount))] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph(fmtMoney(project.totalCost))] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph(fmtPercent(project.estimatedProfitRate))] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph(fmtPercent(project.actualProfitRate))] }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: riskLabel, color: riskColor, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    });
  });

  // 构建文档
  const doc = new Document({
    // 使用 docx 库创建节
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [new Paragraph({ children: [new TextRun({ text: '工程项目数据稽查系统 - 风险分析报告', size: 18 })] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '第 ', size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                  new TextRun({ text: ' 页', size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // 封面标题
          new Paragraph({
            children: [new TextRun({ text: '工程项目数据稽查系统', size: 48, bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '风险分析报告', size: 40, bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `生成时间: ${new Date().toLocaleString('zh-CN')}`, size: 22 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          // 1. 风险总览
          new Paragraph({
            children: [new TextRun({ text: '一、风险总览', size: 28, bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            rows: statsRows,
            width: { size: 9000, type: WidthType.DXA },
          }),

          // 2. 项目风险详情
          new Paragraph({
            children: [new TextRun({ text: '二、项目风险详情', size: 28, bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '2B579A' },
                    children: [new Paragraph({ children: [new TextRun({ text: '项目名称', color: 'FFFFFF', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '2B579A' },
                    children: [new Paragraph({ children: [new TextRun({ text: '合同金额', color: 'FFFFFF', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '2B579A' },
                    children: [new Paragraph({ children: [new TextRun({ text: '总成本', color: 'FFFFFF', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '2B579A' },
                    children: [new Paragraph({ children: [new TextRun({ text: '预估毛利率', color: 'FFFFFF', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '2B579A' },
                    children: [new Paragraph({ children: [new TextRun({ text: '实际毛利率', color: 'FFFFFF', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '2B579A' },
                    children: [new Paragraph({ children: [new TextRun({ text: '风险等级', color: 'FFFFFF', bold: true })] })],
                  }),
                ],
              }),
              ...projectDetailRows,
            ],
            width: { size: 14000, type: WidthType.DXA },
          }),

          // 3. 风险详情（按项目展开）
          ...riskResults.filter(r => r.overallRisk !== 'low').flatMap((risk, _index) => [
            new Paragraph({
              children: [new TextRun({ text: `三、${risk.projectName} - 风险详情`, size: 28, bold: true })],
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `总体风险等级: ${RISK_LABELS[risk.overallRisk]}`, bold: true })],
              spacing: { after: 100 },
            }),
            ...risk.riskDetails.map(detail =>
              new Paragraph({
                spacing: { before: 60 },
                children: [
                  new TextRun({ text: `[${detail.ruleCode}] ${detail.ruleName}: `, bold: true }),
                  new TextRun({ text: detail.description }),
                ],
              })
            ),
          ]),

          // 4. 数据附件
          new Paragraph({
            children: [new TextRun({ text: '四、数据附件说明', size: 28, bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '本报告包含以下数据：项目基本信息表、合同信息、成本构成、结算信息、付款记录。' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '详细数据可通过系统"数据看板"页面查看或导出 Excel 格式。' })],
          }),
        ],
      },
    ],
  });

  // 使用 docx 库生成二进制文件
  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 下载风险报告
 */
export async function downloadRiskReport(
  projects: Project[],
  riskResults: RiskResult[]
): Promise<void> {
  const uint8Array = await generateRiskReport(projects, riskResults);
  const blob = new Blob([uint8Array as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `风险分析报告_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
