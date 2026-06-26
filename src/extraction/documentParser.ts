// 文档解析工具
// 使用 xlsx 库解析 Excel 文件

import * as XLSX from 'xlsx';

// 可解析的文档扩展名
const PARSABLE_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

/**
 * 判断文件是否为可解析的文档类型
 */
export function isParsableDocument(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext) return false;
  return PARSABLE_EXTENSIONS.includes(`.${ext}`);
}

/**
 * 从 Excel 文件中提取文本内容用于哈希计算
 */
export async function extractTextForHash(filePath: string): Promise<string> {
  try {
    // 使用 xlsx 库读取文件
    const workbook = XLSX.readFile(filePath, { type: 'file' });
    const texts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        // 使用 xlsx 库解析为 CSV 格式的文本
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        texts.push(csv);
      }
    }

    return texts.join('\n---sheet-separator---\n');
  } catch (error) {
    console.warn(`提取文本用于哈希失败: ${filePath}`, error);
    return filePath;
  }
}

/**
 * 解析 Excel 文件为结构化数据
 */
export async function parseExcelToJson(filePath: string): Promise<Record<string, unknown>[]> {
  try {
    // 使用 xlsx 库读取文件
    const workbook = XLSX.readFile(filePath, { type: 'file' });
    const allData: Record<string, unknown>[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        // 使用 xlsx 库将工作表转为 JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        jsonData.forEach((row: any) => {
          row._sheet = sheetName;
          allData.push(row);
        });
      }
    }

    return allData;
  } catch (error) {
    console.error(`解析 Excel 失败: ${filePath}`, error);
    return [];
  }
}

/**
 * 获取 Excel 文件的工作表名称列表
 */
export async function getExcelSheetNames(filePath: string): Promise<string[]> {
  try {
    const workbook = XLSX.readFile(filePath, { type: 'file' });
    return workbook.SheetNames;
  } catch {
    return [];
  }
}
