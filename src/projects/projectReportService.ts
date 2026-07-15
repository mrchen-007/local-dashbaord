import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import * as XLSX from 'xlsx';
import { dbExecute, dbSelect, type ProjectRecord } from '../api/tauriApi';
import type { ProjectLedger, ProjectReviewSummary, ProjectRiskFinding } from './projectLedgerService';

export interface ReportExportRecord {
  id: number;
  report_type: string;
  output_name: string;
  source_version: string;
  rule_version: string;
  exported_at: string;
}

interface ProjectReportData {
  project: ProjectRecord;
  ledger: ProjectLedger | null;
  findings: ProjectRiskFinding[];
  review: ProjectReviewSummary;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function riskRuleVersion(findings: ProjectRiskFinding[]): string {
  return findings.map((finding) => finding.rule_version).filter((value, index, values) => values.indexOf(value) === index).join(', ') || 'not-calculated';
}

export function sourceVersion(ledger: ProjectLedger | null): string {
  return ledger?.source_version || 'not-built';
}

async function recordExport(projectId: number, reportType: string, outputName: string, ledger: ProjectLedger | null, findings: ProjectRiskFinding[]): Promise<void> {
  await dbExecute(
    `INSERT INTO report_exports (project_id, report_type, output_name, source_version, rule_version)
     VALUES ($1, $2, $3, $4, $5)`,
    [projectId, reportType, outputName, sourceVersion(ledger), riskRuleVersion(findings)]
  );
}

function download(blob: Blob, outputName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = outputName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function listProjectReportExports(projectId: number): Promise<ReportExportRecord[]> {
  return dbSelect<ReportExportRecord>(
    `SELECT id, report_type, output_name, source_version, rule_version, exported_at
     FROM report_exports WHERE project_id = $1 ORDER BY exported_at DESC, id DESC`,
    [projectId]
  );
}

export async function exportProjectWorkbook(data: ProjectReportData): Promise<string> {
  const outputName = `${data.project.name}_项目台账与风险清单_${dateStamp()}.xlsx`;
  const workbook = XLSX.utils.book_new();
  const metadata = [{
    项目名称: data.project.name,
    项目编号: data.project.code || '',
    资料目录: data.project.sourceRoot || '',
    数据版本: sourceVersion(data.ledger),
    规则版本: riskRuleVersion(data.findings),
    待确认字段数: data.review.unconfirmedCount,
    导出时间: new Date().toLocaleString('zh-CN'),
  }];
  const ledger = [{
    合同编号: data.ledger?.contract_no || '',
    合同金额: data.ledger?.contract_amount || 0,
    人工成本: data.ledger?.labor_cost || 0,
    材料成本: data.ledger?.material_cost || 0,
    设备成本: data.ledger?.equipment_cost || 0,
    分包金额: data.ledger?.subcontract_amount || 0,
    结算金额: data.ledger?.settlement_amount || 0,
    结算日期: data.ledger?.settlement_date || '',
    质保比例: data.ledger?.warranty_ratio || 0,
  }];
  const findings = data.findings.map((finding) => ({
    规则编号: finding.rule_code,
    规则版本: finding.rule_version,
    风险等级: finding.level,
    状态: finding.status,
    标题: finding.title,
    说明: finding.description,
    最后重算时间: finding.last_calculated_at,
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadata), '导出说明');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ledger), '正式台账');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(findings), '风险清单');
  XLSX.writeFile(workbook, outputName);
  await recordExport(data.project.id, 'project-workbook', outputName, data.ledger, data.findings);
  return outputName;
}

export async function exportProjectRiskReport(data: ProjectReportData): Promise<string> {
  const outputName = `${data.project.name}_风险稽查报告_${dateStamp()}.docx`;
  const rows = data.findings.length > 0 ? data.findings.map((finding) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(finding.rule_code)] }),
      new TableCell({ children: [new Paragraph(finding.level)] }),
      new TableCell({ children: [new Paragraph(finding.status)] }),
      new TableCell({ children: [new Paragraph(finding.title)] }),
      new TableCell({ children: [new Paragraph(finding.description)] }),
    ],
  })) : [new TableRow({ children: [new TableCell({ columnSpan: 5, children: [new Paragraph('尚无持久化风险发现。')] })] })];
  const document = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: '工程项目风险稽查报告', bold: true, size: 36 })] }),
        new Paragraph(`项目：${data.project.name}`),
        new Paragraph(`生成时间：${new Date().toLocaleString('zh-CN')}`),
        new Paragraph(`数据版本：${sourceVersion(data.ledger)}；规则版本：${riskRuleVersion(data.findings)}；待确认字段：${data.review.unconfirmedCount}`),
        new Paragraph({ children: [new TextRun({ text: '风险清单', bold: true, size: 28 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: ['规则', '等级', '状态', '标题', '说明'].map((title) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })] })) }), ...rows],
        }),
      ],
    }],
  });
  download(await Packer.toBlob(document), outputName);
  await recordExport(data.project.id, 'risk-audit-docx', outputName, data.ledger, data.findings);
  return outputName;
}
