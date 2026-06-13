// 信息抽取服务
// 调用 SiameseUIE 本地服务进行字段抽取

import { invoke } from '@tauri-apps/api/tauri';

export interface ExtractionResult {
  success: boolean;
  results?: Record<string, any>;
  error?: string;
  duration_ms?: number;
}

export interface ExtractionSchema {
  contract_no?: string;       // 合同编号
  contract_amount?: number;   // 合同总金额
  party_a?: string;           // 甲方
  party_b?: string;           // 乙方
  sign_date?: string;         // 签约日期
  labor_cost?: number;        // 人工成本_总价
  material_cost?: number;     // 材料成本_总价
  equipment_cost?: number;    // 设备成本_总价
  subcontract_amount?: number; // 分包金额
  settlement_amount?: number; // 结算金额
  settlement_date?: string;   // 结算日期
  warranty_ratio?: number;    // 质保金比例
}

export interface ServiceHealth {
  status: string;
  model_loaded: boolean;
  model_name: string;
}

// 默认抽取 schema
const DEFAULT_SCHEMA = [
  '合同编号',
  '合同总金额',
  '甲方',
  '乙方',
  '签约日期',
  '人工成本',
  '材料成本',
  '设备成本',
  '分包金额',
  '结算金额',
  '结算日期',
  '质保金比例',
];

/**
 * 信息抽取服务类
 * 封装 SiameseUIE 服务的调用
 */
export class EntityExtractorService {
  private serviceUrl: string;

  constructor(serviceUrl: string = 'http://127.0.0.1:8000') {
    this.serviceUrl = serviceUrl;
  }

  /**
   * 检查 UIE 服务状态
   */
  async checkServiceHealth(): Promise<ServiceHealth> {
    try {
      // 使用 Tauri 命令检查服务状态
      const health = await invoke<ServiceHealth>('check_uie_service');
      return health;
    } catch (error) {
      return {
        status: 'error',
        model_loaded: false,
        model_name: '',
      };
    }
  }

  /**
   * 从文本中抽取信息
   * 调用 SiameseUIE 服务进行字段抽取
   */
  async extractFields(
    text: string,
    schema?: string[]
  ): Promise<ExtractionResult> {
    try {
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: '输入文本为空',
        };
      }

      // 使用 Tauri 命令调用 UIE 服务
      const result = await invoke<ExtractionResult>('extract_fields', {
        text,
        schema: schema || DEFAULT_SCHEMA,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `抽取失败: ${error}`,
      };
    }
  }

  /**
   * 批量抽取信息
   * 按顺序抽取多个文本
   */
  async extractBatch(
    texts: Array<{ text: string; filePath: string }>,
    schema?: string[],
    onProgress?: (current: number, total: number, filePath: string) => void
  ): Promise<Map<string, ExtractionResult>> {
    const results = new Map<string, ExtractionResult>();
    const total = texts.length;

    for (let i = 0; i < total; i++) {
      const { text, filePath } = texts[i];
      onProgress?.(i + 1, total, filePath);

      const result = await this.extractFields(text, schema);
      results.set(filePath, result);
    }

    return results;
  }

  /**
   * 将抽取结果转换为结构化数据
   */
  mapToSchema(rawResults: Record<string, any>): ExtractionSchema {
    return {
      contract_no: rawResults['合同编号'] || undefined,
      contract_amount: this.parseNumber(rawResults['合同总金额']),
      party_a: rawResults['甲方'] || undefined,
      party_b: rawResults['乙方'] || undefined,
      sign_date: rawResults['签约日期'] || undefined,
      labor_cost: this.parseNumber(rawResults['人工成本']),
      material_cost: this.parseNumber(rawResults['材料成本']),
      equipment_cost: this.parseNumber(rawResults['设备成本']),
      subcontract_amount: this.parseNumber(rawResults['分包金额']),
      settlement_amount: this.parseNumber(rawResults['结算金额']),
      settlement_date: rawResults['结算日期'] || undefined,
      warranty_ratio: this.parseNumber(rawResults['质保金比例']),
    };
  }

  /**
   * 解析数字字符串
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  /**
   * 获取默认 schema
   */
  getDefaultSchema(): string[] {
    return [...DEFAULT_SCHEMA];
  }
}

// 创建单例实例
export const entityExtractorService = new EntityExtractorService();
