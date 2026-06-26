// 工程文件内容提取工具
// 使用 xlsx 库解析 Excel，pdf-parse 库解析 PDF

import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';

export interface ParsedContent {
  text: string;
  metadata: Record<string, unknown>;
  pages?: number;
}

/**
 * 解析 Excel 文件，提取所有单元格文本
 * 忽略元数据（作者、保存时间等）
 */
export async function parseExcel(file: File | ArrayBuffer): Promise<ParsedContent> {
  try {
    let buffer: ArrayBuffer;

    if (file instanceof File) {
      // 使用 xlsx 库读取文件
      buffer = await file.arrayBuffer();
    } else {
      buffer = file;
    }

    // 使用 xlsx 库解析 Excel 文件
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false,
    });

    const allText: string[] = [];

    // 遍历所有工作表
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // 使用 xlsx 库提取单元格文本
      const sheetData = XLSX.utils.sheet_to_csv(sheet, {
        blankRows: false,
        skipHidden: true,
      });

      if (sheetData) {
        allText.push(`[Sheet: ${sheetName}]`);
        allText.push(sheetData);
      }
    }

    return {
      text: allText.join('\n'),
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
      },
    };
  } catch (error) {
    console.error('Excel 解析失败:', error);
    throw new Error(`Excel 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析 PDF 文件，提取纯文本内容
 * 使用 pdf-parse 库实现
 */
export async function parsePDF(file: File | ArrayBuffer): Promise<ParsedContent> {
  try {
    let buffer: Buffer;

    if (file instanceof File) {
      // 使用 pdf-parse 库读取文件
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = Buffer.from(file);
    }

    // 使用 pdf-parse 库解析 PDF
    const data = await pdfParse(buffer, {
      // 自定义页面渲染
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        return text;
      },
    });

    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
      pages: data.numpages,
    };
  } catch (error) {
    console.error('PDF 解析失败:', error);
    throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析文本文件
 */
export async function parseTextFile(file: File): Promise<ParsedContent> {
  try {
    const text = await file.text();
    return {
      text,
      metadata: {
        encoding: 'utf-8',
        lines: text.split('\n').length,
      },
    };
  } catch (error) {
    console.error('文本文件解析失败:', error);
    throw new Error(`文本文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 根据文件扩展名选择合适的解析器
 */
export async function parseDocument(file: File): Promise<ParsedContent> {
  const extension = file.name.toLowerCase().split('.').pop();

  switch (extension) {
    case 'xlsx':
    case 'xls':
    case 'xlsm':
    case 'xlsb':
      return parseExcel(file);

    case 'pdf':
      return parsePDF(file);

    case 'txt':
    case 'csv':
    case 'tsv':
    case 'md':
    case 'json':
    case 'xml':
    case 'html':
    case 'htm':
      return parseTextFile(file);

    default:
      // 尝试作为文本文件解析
      try {
        return await parseTextFile(file);
      } catch {
        throw new Error(`不支持的文件类型: ${extension}`);
      }
  }
}

/**
 * 提取文本内容用于哈希计算
 * 忽略空白字符差异
 */
export async function extractTextForHash(file: File): Promise<string> {
  const content = await parseDocument(file);

  // 标准化文本：去除多余空白、统一换行符
  const normalizedText = content.text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  return normalizedText;
}

/**
 * 检查文件是否为可解析的文档类型
 */
export function isParsableDocument(filename: string): boolean {
  const parsableExtensions = [
    'xlsx', 'xls', 'xlsm', 'xlsb',
    'pdf',
    'txt', 'csv', 'tsv', 'md',
    'json', 'xml', 'html', 'htm',
  ];

  const extension = filename.toLowerCase().split('.').pop();
  return parsableExtensions.includes(extension || '');
}

/**
 * 批量解析文件
 * 支持并发控制
 */
export async function batchParseDocuments(
  files: File[],
  concurrency: number = 3,
  onProgress?: (fileIndex: number, status: 'parsing' | 'done' | 'error') => void
): Promise<Map<string, ParsedContent>> {
  const results = new Map<string, ParsedContent>();
  const totalFiles = files.length;

  // 分批处理
  for (let i = 0; i < totalFiles; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const promises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;
      onProgress?.(fileIndex, 'parsing');

      try {
        const content = await parseDocument(file);
        results.set(file.name, content);
        onProgress?.(fileIndex, 'done');
      } catch (error) {
        console.error(`解析文件 ${file.name} 失败:`, error);
        onProgress?.(fileIndex, 'error');
      }
    });

    await Promise.all(promises);
  }

  return results;
}
