import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShieldCheck,
  Database,
  Cpu,
  GitBranch,
  Search,
  Code2,
  Terminal,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Copy,
  Check,
  Info,
  Sparkles,
  Lock,
  FileCode,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Server,
  Boxes,
  Workflow,
  Eye,
  MessageSquare,
  Sliders,
  Zap,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Maximize2
} from 'lucide-react';

// ==========================================
// 架构节点详细元数据定义 (支持点击检视)
// ==========================================
const ARCH_NODES = {
  // L1: 交互与意图网关层
  l1_multi_channel: {
    id: 'l1_multi_channel',
    name: '多端统一接入网关',
    enName: 'Multi-Channel Ingress',
    layer: 'L1: 交互与意图网关层',
    techStack: ['Web SDK', '飞书/企微/钉钉 Bot', 'REST / gRPC', 'SSE 流式网关'],
    desc: '承接来自独立对话工作台、BI 看板内嵌 Copilot、办公 IM 机器人及外部业务系统的自然语言问数请求，采用 Server-Sent Events (SSE) 实现思考过程与图表的流式增量渲染。',
    guardrails: [
      '请求级 Rate Limiting 与 Token 预算配额控制',
      '敏感词与 Prompt Injection（提示词注入）前置正则及轻量模型拦截',
      '长耗时查询异步化通知（支持转后台计算完成后推送到飞书卡片）'
    ],
    sampleTitle: '标准多模态问数请求头 (Ingress Payload)',
    sampleCode: `{
  "request_id": "req_992837410",
  "channel": "feishu_bot_card",
  "stream": true,
  "user_query": "对比一下上个月一车间和二车间的设备综合效率(OEE)，按周看趋势",
  "client_timestamp": "2026-10-28T09:15:00+08:00"
}`
  },
  l1_session_memory: {
    id: 'l1_session_memory',
    name: '会话状态与指代消解',
    enName: 'Session & Coreference',
    layer: 'L1: 交互与意图网关层',
    techStack: ['Redis Stack', '滑动窗口记忆', 'Query Rewriter LLM'],
    desc: '维护多轮对话的上下文槽位状态（已选指标、时间窗口、过滤维度），当用户追问“那华南区呢？”或“按产线拆开看”时，自动结合历史上下文重写为完整独立的标准问句。',
    guardrails: [
      '最多保留最近 5 轮有效分析实体槽位，防止长上下文污染当前意图',
      '话题突变检测（Topic Shift Detection）：当用户切换业务域时自动清空旧过滤槽位',
      '重写后的完整问句在前端显式回显，确保用户对系统理解的上下文有感知'
    ],
    sampleTitle: '多轮指代消解与槽位继承示例',
    sampleCode: `// 历史第 1 轮: "看下上个月一车间和二车间的OEE周趋势"
// 当前第 2 轮追问: "把三车间也加上，另外只看夜班的数据"

// 经过 Query Rewriter 重写后的独立标准问句:
{
  "rewritten_query": "对比上个月一车间、二车间和三车间在夜班班次下的设备综合效率(OEE)周趋势",
  "inherited_slots": {
    "metric": ["OEE"],
    "time_range": "LAST_MONTH",
    "granularity": "WEEK"
  },
  "delta_slots": {
    "add_filter": ["workshop IN ('一车间','二车间','三车间')", "shift = '夜班'"]
  }
}`
  },
  l1_clarification: {
    id: 'l1_clarification',
    name: '意图分流与模糊反问',
    enName: 'Intent Router & Clarification',
    layer: 'L1: 交互与意图网关层',
    techStack: ['Qwen2.5-7B-Instruct', 'Confidence Scoring', 'Interactive UI Card'],
    desc: '识别用户属于“确定性指标查询”、“自由明细探索”、“异动归因分析”还是“非业务闲聊”。当核心要素缺失（如未指定时间窗口）或存在同名同义指标歧义时，主动中止生成并下发澄清卡片。',
    guardrails: [
      '低置信度阈值拦截：当同名指标匹配得分差距 < 0.15 时，强制触发人工点选澄清',
      '默认时间补全策略：若用户未指明时间且指标支持默认窗口，自动按最近 30 天查询并高亮提示',
      '拒绝回答非结构化主观问题或超出数仓覆盖范围的预测请求'
    ],
    sampleTitle: '模糊意图反问交互协议 (Clarification Card)',
    sampleCode: `{
  "status": "NEED_CLARIFICATION",
  "clarification_type": "AMBIGUOUS_METRIC",
  "message": "检测到您询问的「毛利率」存在多个部门口径，请确认您关注的具体指标：",
  "options": [
    { "code": "fin_gross_margin", "label": "财务结转毛利率 (含制造费用分摊 - 财务部口径)" },
    { "code": "sales_std_margin", "label": "销售标准毛利率 (仅扣减BOM标准成本 - 销售部口径)" }
  ]
}`
  },
  l1_rls_auth: {
    id: 'l1_rls_auth',
    name: 'SSO 与行列级权限提取',
    enName: 'RLS / CLS Security Context',
    layer: 'L1: 交互与意图网关层',
    techStack: ['OAuth2 / OIDC', 'Apache Ranger', 'OPA (Open Policy Agent)'],
    desc: '解析当前登录用户的组织架构树与数据角色权限，生成不可篡改的权限上下文签名（Security Context）。该签名不进入 LLM 提示词，而是直接传递至底层 AST 编译器进行硬性语法树注入。',
    guardrails: [
      '零信任原则：严禁依赖 Prompt 让大模型自觉添加 WHERE 权限过滤条件',
      '行级权限（RLS）通过 AST 语法树强制在最内层子查询追加租户/工厂/部门过滤',
      '列级权限（CLS）对高敏字段（如高管薪资、供应商底价）直接在 Schema 召回阶段物理屏蔽'
    ],
    sampleTitle: '安全权限上下文令牌 (Security Context)',
    sampleCode: `{
  "user_id": "emp_zhangsan_082",
  "org_unit": "智能制造事业部_华东一厂",
  "rls_predicates": [
    { "domain": "mes_production", "sql_expr": "factory_id = 'F01'" },
    { "domain": "crm_sales", "sql_expr": "region_code IN ('EAST_CN')" }
  ],
  "cls_masked_columns": ["unit_cost_price", "supplier_rebate_rate"]
}`
  },

  // L2: 智能体推理与编排层
  l2_langgraph_router: {
    id: 'l2_langgraph_router',
    name: '智能体状态机编排中枢',
    enName: 'LangGraph Agentic Router',
    layer: 'L2: 智能体推理与编排层',
    techStack: ['LangGraph', 'DAG State Machine', 'DeepSeek-V3'],
    desc: '基于有向状态图管理整个问数生命周期，核心执行“双轨制路由”：优先匹配语义层已建模的标准化指标走 NL2DSL 确定性通道（覆盖 80% 生产查询）；若未命中语义模型，则降级至受控的动态 NL2SQL 探索通道（20% 长尾场景）。',
    guardrails: [
      '严格的状态图最大循环步数限制（Max Iterations <= 3），杜绝 Agent 死循环',
      '每个节点的输入输出强制经过 Pydantic Schema 强类型结构校验',
      '支持在任意节点挂起状态（Human-in-the-loop），等待用户确认口径后恢复执行'
    ],
    sampleTitle: 'LangGraph 路由决策输出',
    sampleCode: `{
  "routing_decision": "PATH_A_SEMANTIC_DSL",
  "confidence": 0.96,
  "matched_semantic_models": ["mdl_mes_equipment_oee"],
  "requires_python_sandbox": false,
  "reasoning": "用户询问的『设备综合效率(OEE)』与『车间/周趋势』完全命中语义层核心指标库 [metric_oee] 与公共维度，无需直接生成原生SQL。"
}`
  },
  l2_nl2dsl_agent: {
    id: 'l2_nl2dsl_agent',
    name: '语义槽位填充智能体 (主路径 80%)',
    enName: 'NL2DSL Slot-Filling Agent',
    layer: 'L2: 智能体推理与编排层',
    techStack: ['Structured Outputs', 'JSON Schema', 'DeepSeek-V3 / Qwen2.5-32B'],
    desc: '核心范式降维：大模型完全不需要感知底层物理表名、复杂的 JOIN 路径或复杂的聚合计算公式，只需像“做填空题”一样，将用户意图映射为标准化的语义查询协议（MQL / JSON DSL）。',
    guardrails: [
      '通过 Guided Decoding (Grammar 约束) 强制模型只能输出枚举列表内存在的 Metric 与 Dimension 编码',
      '消除 JOIN 幻觉与公式捏造：复杂同环比、加权平均全部交由下游语义层编译器确定性展开',
      '实体过滤值必须引用 Hybrid RAG 实体链接返回的真实数据库枚举值'
    ],
    sampleTitle: 'NL2DSL 结构化语义查询协议输出',
    sampleCode: `{
  "protocol_version": "v2.1",
  "metrics": ["metric_oee"],
  "dimensions": ["dim_date__week", "dim_workshop__name"],
  "filters": [
    {
      "member": "dim_workshop__code",
      "operator": "IN",
      "values": ["WS_01", "WS_02"]
    }
  ],
  "time_dimension": {
    "dimension": "dim_date__stat_date",
    "date_range": ["2026-09-01", "2026-09-30"],
    "granularity": "WEEK"
  },
  "order_by": [{ "field": "dim_date__week", "dir": "ASC" }]
}`
  },
  l2_nl2sql_agent: {
    id: 'l2_nl2sql_agent',
    name: '动态 Schema 裁剪与 NL2SQL (兜底 20%)',
    enName: 'GraphRAG Schema Linking & NL2SQL',
    layer: 'L2: 智能体推理与编排层',
    techStack: ['GraphRAG (Neo4j)', 'DeepSeek-R1 / Coder-32B', 'Few-Shot CoT'],
    desc: '针对尚未纳入语义层建模的临时长尾明细查询，先通过知识图谱（表-字段-主外键血缘图）动态裁剪出最小必要子图（5~8 张表），结合 Golden SQL 少样本示例生成原生 SQL。',
    guardrails: [
      'Schema 剪枝控制：单次注入 Prompt 的物理表严格限制在 8 张以内，无关宽表字段自动折叠',
      '禁止跨业务域野生 JOIN：只允许使用图谱中已登记的 Valid Join Path 关联条件',
      '必须携带 CoT（思维链）注释说明所选表与粒度逻辑，便于下游 AST 审计'
    ],
    sampleTitle: '动态裁剪后的 Schema 提示词与生成 SQL',
    sampleCode: `-- [兜底路径] 针对未建模长尾明细查询生成 StarRocks SQL
SELECT 
  DATE_TRUNC('week', t1.stat_date) AS week_start,
  t2.workshop_name,
  SUM(t1.qualified_qty) / NULLIF(SUM(t1.total_prod_qty), 0) * 
  (SUM(t1.actual_run_mins) / NULLIF(SUM(t1.planned_run_mins), 0)) AS calc_oee
FROM dwd_mes_equip_daily_df t1
INNER JOIN dim_mes_workshop_info t2 
  ON t1.workshop_code = t2.workshop_code
WHERE t1.stat_date >= '2026-09-01' 
  AND t1.stat_date <= '2026-09-30'
  AND t1.workshop_code IN ('WS_01', 'WS_02')
GROUP BY 1, 2
ORDER BY 1 ASC;`
  },
  l2_python_sandbox: {
    id: 'l2_python_sandbox',
    name: 'Python 归因沙箱与自适应图表',
    enName: 'E2B Sandbox & Auto-Viz Engine',
    layer: 'L2: 智能体推理与编排层',
    techStack: ['E2B Firecracker Sandbox', 'Pandas / SciPy', 'Apache ECharts / Vega-Lite'],
    desc: '当用户进一步追问“为什么二车间第三周 OEE 暴跌？”或需要做相关性回归、时序预测时，将 OLAP 聚合结果集載入隔离沙箱运行 Python 归因算法（如 Adtributor 维度下钻归因），并输出声明式图表配置。',
    guardrails: [
      'MicroVM 级硬件隔离沙箱，无外网访问权限，单次执行 CPU 限时 10 秒、内存限额 512MB',
      '严禁大模型直接用文本心算加减乘除与同环比，所有衍生统计数字必须由 Python 算子产出',
      '基于结果集的数据特征（时间序列+多分类）通过规则+轻量模型确定性映射 ECharts 模板'
    ],
    sampleTitle: '沙箱归因结论与 ECharts 声明式协议',
    sampleCode: `{
  "insight_summary": "一车间上月周均 OEE 稳定在 86.8%；二车间在第 3 周（09-15~09-21）出现显著异动下跌至 74.2%（环比 -8.9%），经维度下钻归因，82% 的降幅源于「贴片机_SMT04」突发换线停机。",
  "chart_recommendation": {
    "chart_type": "DUAL_LINE_TREND",
    "x_axis": "week_start",
    "series_group": "workshop_name",
    "y_axis": "metric_oee",
    "mark_point": { "coord": ["2026-W38", 0.742], "label": "异动跌落点 (-8.9%)" }
  }
}`
  },

  // L3: 语义与本体层 (架构核心底座)
  l3_four_tables: {
    id: 'l3_four_tables',
    name: '四表核心元数据模型 (指标底座)',
    enName: '4-Table Semantic Ontology Store',
    layer: 'L3: 语义与本体层 (核心底座)',
    techStack: ['PostgreSQL / MySQL', 'Cube.dev / MetricFlow', 'dbt Semantic Layer'],
    desc: '企业级问数消除口径幻觉的核心资产。通过「指标定义表」、「维度与层级表」、「业务黑话同义词表」、「口径版本与血缘表」四张核心元数据表，将物理表封装为标准业务本体。',
    guardrails: [
      '所有原子指标与派生指标的计算公式由数据治理团队统一审核发布，LLM 无权修改公式',
      '指标与可分析维度之间建立显式白名单绑定，防止出现“按商品颜色统计员工离职率”的荒谬关联',
      '支持多版本口径并存，历史数据自动按生效时间路由对应计算公式'
    ],
    sampleTitle: '四表核心元数据 DDL 与示例记录',
    sampleCode: `-- 1. 指标定义表 (DQ_METRIC)
INSERT INTO dq_metric (metric_code, metric_name, biz_domain, agg_formula, base_model, unit)
VALUES ('metric_oee', '设备综合效率(OEE)', '智能制造', 
        'SUM(availability_time * perf_rate * quality_rate) / NULLIF(SUM(planned_time), 0)', 
        'dws_mes_oee_dd', 'PERCENT');

-- 2. 维度与层级表 (DQ_DIM)
INSERT INTO dq_dim (dim_code, dim_name, col_expr, hierarchy_path, dict_sync_enabled)
VALUES ('dim_workshop', '生产车间', 'workshop_code', 'factory -> workshop -> line', true);

-- 3. 业务黑话与同义词表 (DQ_ALIAS)
INSERT INTO dq_alias (alias_term, target_type, target_code, filter_condition)
VALUES ('OEE', 'METRIC', 'metric_oee', NULL),
       ('大客户', 'FILTER', 'dim_customer_level', 'vip_tier IN (''S'', ''A'')');

-- 4. 口径版本与血缘表 (DQ_METRIC_VER)
INSERT INTO dq_metric_ver (metric_code, ver_no, dept_scope, effective_from, change_log)
VALUES ('metric_oee', 'v2.4', 'GLOBAL_MFG', '2026-01-01', '剔除计划性大修停机时长');`
  },
  l3_hybrid_rag: {
    id: 'l3_hybrid_rag',
    name: '混合检索引擎与实体链接',
    enName: 'Hybrid RAG & Entity Linking',
    layer: 'L3: 语义与本体层 (核心底座)',
    techStack: ['Milvus / Qdrant', 'Elasticsearch (BM25)', 'BGE-Reranker-v2-m3'],
    desc: '解决自然语言问数中最大的痛点之一——枚举值拼写不一致（例如用户说“一车间”，数据库里存的是 `WS_01` 或 `第一制造部`）。通过向量语义检索 + BM25 关键词检索 + Cross-Encoder 重排，实现毫秒级实体对齐。',
    guardrails: [
      '高基数维度值（如百万级 SKU 名称、客户名）定期增量同步至 Elasticsearch + 向量库',
      '召回 Top-K 后强制经过 Reranker 模型打分过滤，低于阈值 0.65 的候选集丢弃',
      'Golden SQL 样本库采用 Question 向量化检索，动态召回最相似的 3 个经过验证的问答对'
    ],
    sampleTitle: '三路并行混合检索召回结果 (RAG Context)',
    sampleCode: `{
  "recalled_metrics": [
    { "code": "metric_oee", "name": "设备综合效率(OEE)", "score": 0.98 }
  ],
  "linked_entities": [
    { "user_mention": "一车间", "dim_code": "dim_workshop__code", "db_value": "WS_01", "match_type": "EXACT_ALIAS" },
    { "user_mention": "二车间", "dim_code": "dim_workshop__code", "db_value": "WS_02", "match_type": "EXACT_ALIAS" }
  ],
  "golden_few_shots": [
    { "q": "看下上月各产线直通率周趋势", "dsl_template_id": "tpl_weekly_trend_compare" }
  ]
}`
  },
  l3_ast_compiler: {
    id: 'l3_ast_compiler',
    name: 'AST 确定性编译器与 SQLGlot 门禁',
    enName: 'AST Compiler & SQLGlot Gatekeeper',
    layer: 'L3: 语义与本体层 (核心底座)',
    techStack: ['SQLGlot AST', 'Cube.dev Compiler', 'Self-Healing Reflector'],
    desc: '架构安全的“防火墙”。一方面将 NL2DSL 的 JSON 协议 100% 确定性地编译为目标数据库方言 SQL；另一方面使用 SQLGlot 解析抽象语法树（AST），执行权限注入、分区裁剪校验与报错自愈重写。',
    guardrails: [
      'AST 强制注入：在语法树底层 Table 节点强制追加 `WHERE factory_id = \'F01\'`，无法被绕过',
      '全表扫描阻断：若 AST 检测到大表未包含分区键（如 `stat_date`）过滤，直接拒绝执行',
      '只读语法锁：仅放行 `SELECT` / `WITH` 语句，任何 DML/DDL 语句在 AST 解析层毫秒级熔断'
    ],
    sampleTitle: '经 AST 编译与 RLS 权限重写后的最终物理 SQL',
    sampleCode: `/* Generated by Semantic Compiler v2.4 | Trace: req_992837410 */
SELECT
  DATE_TRUNC('week', dws_mes_oee_dd.stat_date) AS dim_date__week,
  dim_workshop.workshop_name AS dim_workshop__name,
  ROUND(
    SUM(dws_mes_oee_dd.availability_time * dws_mes_oee_dd.perf_rate * dws_mes_oee_dd.quality_rate) 
    / NULLIF(SUM(dws_mes_oee_dd.planned_time), 0) * 100, 2
  ) AS metric_oee
FROM prod_dw.dws_mes_oee_dd AS dws_mes_oee_dd
LEFT JOIN prod_dw.dim_mes_workshop AS dim_workshop
  ON dws_mes_oee_dd.workshop_code = dim_workshop.workshop_code
WHERE
  dws_mes_oee_dd.stat_date >= '2026-09-01'
  AND dws_mes_oee_dd.stat_date <= '2026-09-30'
  AND dws_mes_oee_dd.workshop_code IN ('WS_01', 'WS_02')
  AND dws_mes_oee_dd.factory_id = 'F01' /* <-- [SQLGlot AST 强制注入行级权限] */
GROUP BY 1, 2
ORDER BY dim_date__week ASC
LIMIT 5000;`
  },

  // L4: 数据执行与联邦网关层
  l4_semantic_cache: {
    id: 'l4_semantic_cache',
    name: '多级语义缓存与熔断路由',
    enName: 'Semantic Cache & Circuit Breaker',
    layer: 'L4: 数据执行与联邦网关层',
    techStack: ['Redis', 'Cube Store', 'Resilience4j / Envoy'],
    desc: '不要每次提问都打穿底层数仓。基于规范化后的 JSON DSL 签名 + 用户权限标签构建多级缓存，相同口径与权限下的高频高管问数实现 < 50ms 极速秒回，并提供慢查询超时熔断保护。',
    guardrails: [
      '缓存 Key 必须包含 `rls_predicate_hash`，严防高权限用户的缓存结果泄露给低权限用户',
      '与数仓 ETL 调度联动：当底层 DWS 表完成每日批次更新后，自动触发相关指标缓存失效',
      '连接池隔离：Ad-hoc 探索类 SQL 与高管核心指标查询使用独立的 StarRocks Resource Group'
    ],
    sampleTitle: '语义缓存签名与资源组隔离配置',
    sampleCode: `{
  "cache_key": "sem_v2:metric_oee:w_WS01_WS02:202609:rls_F01",
  "ttl_seconds": 3600,
  "resource_group": "rg_chatbi_interactive",
  "query_timeout_ms": 15000,
  "max_scan_rows": 50000000
}`
  },
  l4_olap_engine: {
    id: 'l4_olap_engine',
    name: '物化视图加速与 MPP OLAP 引擎',
    enName: 'Materialized Views & MPP OLAP',
    layer: 'L4: 数据执行与联邦网关层',
    techStack: ['StarRocks / Apache Doris', 'ClickHouse', 'Async Materialized Views'],
    desc: '承接高并发多维分析查询的物理执行层。利用 StarRocks / Doris 的多表异步物化视图与查询透明改写能力（Transparent Rewrite），将原本需要扫描数亿行明细的 JOIN 查询自动路由至预聚合视图。',
    guardrails: [
      '开启 CBO 优化器透明改写，无需修改上层 SQL 即可自动命中最佳物化视图',
      '利用 StarRocks WorkLoad Group 限制单条智能问数查询最高占用 20% 集群内存',
      '当查询返回空集（0 rows）时，自动触发探针查询检查是否是时间分区尚未产出数据'
    ],
    sampleTitle: 'OLAP 执行统计与返回数据集预览',
    sampleCode: `{
  "execution_engine": "StarRocks-3.3.4",
  "hit_materialized_view": "mv_mes_oee_weekly_rollup",
  "execution_time_ms": 68,
  "rows_returned": 8,
  "dataset_preview": [
    { "dim_date__week": "2026-W36", "dim_workshop__name": "一车间", "metric_oee": 86.4 },
    { "dim_date__week": "2026-W36", "dim_workshop__name": "二车间", "metric_oee": 82.1 },
    { "dim_date__week": "2026-W37", "dim_workshop__name": "一车间", "metric_oee": 87.2 },
    { "dim_date__week": "2026-W37", "dim_workshop__name": "二车间", "metric_oee": 83.1 },
    { "dim_date__week": "2026-W38", "dim_workshop__name": "一车间", "metric_oee": 86.9 },
    { "dim_date__week": "2026-W38", "dim_workshop__name": "二车间", "metric_oee": 74.2 }
  ]
}`
  },

  // L5: 评估与持续飞轮层 (右侧纵贯)
  l5_flywheel: {
    id: 'l5_flywheel',
    name: '全链路观测与数据回流飞轮',
    enName: 'Langfuse Tracing & Data Flywheel',
    layer: 'L5: 评估与数据飞轮层',
    techStack: ['Langfuse / Arize Phoenix', 'Golden SQL 标注台', 'CI/CD 回归评测集'],
    desc: '智能问数系统“三分靠建设，七分靠运营”。完整记录每次提问的意图拆解、召回指标、生成 DSL/SQL 及耗时；当业务人员点击“点踩/口径纠错”时，自动进入数据工程师审核队列，一键沉淀为新的同义词或 Golden SQL。',
    guardrails: [
      '每次语义层或 Prompt 升级前，自动跑通 500+ 核心 Golden Benchmark 测试集，确保准确率不退化',
      '提供前端“透明白盒卡片”：向用户展示本次计算所用的指标公式、过滤条件与数据更新时间，建立业务信任',
      '自动聚类高频未命中语义层的 NL2SQL 查询，指导数仓团队将其提炼为标准指标'
    ],
    sampleTitle: '点踩回流与数据飞轮闭环记录',
    sampleCode: `{
  "trace_id": "req_992837410",
  "user_feedback": "THUMBS_UP",
  "verification_card_shown": true,
  "flywheel_action": "AUTO_ARCHIVE_HIGH_CONFIDENCE",
  "metrics": {
    "total_latency_ms": 1420,
    "llm_tokens_prompt": 840,
    "llm_tokens_completion": 145,
    "olap_latency_ms": 68
  }
}`
  }
};

// ==========================================
// 5 步请求流转仿真状态定义
// ==========================================
const SIMULATION_STEPS = [
  {
    step: 1,
    title: 'Step 1: 提问接入、指代消解与权限令牌提取',
    summary: '用户在飞书/Web 提问，网关完成上下文补全，并从 SSO 提取硬性行级权限标签（factory_id = F01）。',
    activeNodes: ['l1_multi_channel', 'l1_session_memory', 'l1_rls_auth'],
    activeEdges: ['e_l1_flow'],
    payloadTitle: '阶段 1 产出：标准化意图与安全权限上下文',
    payload: `{
  "query": "对比一下上个月一车间和二车间的设备综合效率(OEE)，按周看趋势",
  "intent_type": "METRIC_TREND_COMPARE",
  "security_context": {
    "user": "emp_zhangsan_082 (华东一厂生产主管)",
    "rls_ast_filter": "factory_id = 'F01'",
    "cls_deny_fields": ["unit_cost_price"]
  }
}`
  },
  {
    step: 2,
    title: 'Step 2: 语义层混合检索与实体枚举对齐 (Hybrid RAG)',
    summary: '并行检索「四表元数据模型」与向量/BM25 索引：将“OEE”映射至标准指标 metric_oee，将“一车间/二车间”精准链接为数据库枚举值 WS_01 / WS_02。',
    activeNodes: ['l2_langgraph_router', 'l3_four_tables', 'l3_hybrid_rag'],
    activeEdges: ['e_l1_to_l2', 'e_l2_to_rag'],
    payloadTitle: '阶段 2 产出：召回的指标元数据与实体链接映射',
    payload: `{
  "matched_metric": {
    "metric_code": "metric_oee",
    "metric_name": "设备综合效率(OEE)",
    "formula": "SUM(availability_time * perf_rate * quality_rate) / NULLIF(SUM(planned_time), 0)",
    "base_table": "prod_dw.dws_mes_oee_dd"
  },
  "entity_linking": [
    { "term": "一车间", "column": "workshop_code", "db_val": "WS_01", "score": 0.99 },
    { "term": "二车间", "column": "workshop_code", "db_val": "WS_02", "score": 0.99 }
  ]
}`
  },
  {
    step: 3,
    title: 'Step 3: 智能体双轨推理 (NL2DSL 槽位填充 vs NL2SQL)',
    summary: 'LangGraph 路由判定命中已建模指标，走 80% 主路径：LLM 仅需输出简洁的 JSON DSL 语义槽位，无需手写复杂 SQL（可点击上方切换按钮对比 20% 兜底路径）。',
    activeNodes: ['l2_langgraph_router', 'l2_nl2dsl_agent', 'l2_nl2sql_agent'],
    activeEdges: ['e_l2_branch_dsl', 'e_l2_branch_sql'],
    payloadTitle: '阶段 3 产出：结构化查询协议 (MQL / JSON DSL)',
    payloadDsl: `// [主路径 80%：NL2DSL 语义槽位填充协议 - 零幻觉]
{
  "metrics": ["metric_oee"],
  "dimensions": ["dim_date__week", "dim_workshop__name"],
  "filters": [
    { "field": "dim_workshop__code", "op": "IN", "val": ["WS_01", "WS_02"] }
  ],
  "time_range": { "field": "stat_date", "from": "2026-09-01", "to": "2026-09-30", "grain": "WEEK" }
}`,
    payloadSql: `// [兜底路径 20%：GraphRAG 裁剪 Schema 后生成的原生 SQL]
SELECT 
  DATE_TRUNC('week', t1.stat_date) AS dim_date__week,
  t2.workshop_name AS dim_workshop__name,
  ROUND(SUM(t1.qualified_qty)/NULLIF(SUM(t1.total_qty),0)*100, 2) AS metric_oee
FROM dwd_mes_equip_daily_df t1
JOIN dim_mes_workshop t2 ON t1.workshop_code = t2.workshop_code
WHERE t1.stat_date BETWEEN '2026-09-01' AND '2026-09-30'
  AND t1.workshop_code IN ('WS_01', 'WS_02')
GROUP BY 1, 2;`
  },
  {
    step: 4,
    title: 'Step 4: AST 确定性编译与 SQLGlot 安全门禁注入',
    summary: '语义编译器将 JSON 协议展开为 StarRocks 标准 SQL，并通过 SQLGlot 语法树校验：阻断全表扫描、强制在底层表注入 AND factory_id = \'F01\' 行级权限。',
    activeNodes: ['l3_ast_compiler', 'l4_semantic_cache'],
    activeEdges: ['e_dsl_to_ast', 'e_ast_to_l4'],
    payloadTitle: '阶段 4 产出：通过 AST 安全门禁与权限注入的物理 SQL',
    payload: `SELECT
  DATE_TRUNC('week', dws_mes_oee_dd.stat_date) AS dim_date__week,
  dim_workshop.workshop_name AS dim_workshop__name,
  ROUND(SUM(availability_time * perf_rate * quality_rate) / NULLIF(SUM(planned_time), 0) * 100, 2) AS metric_oee
FROM prod_dw.dws_mes_oee_dd
LEFT JOIN prod_dw.dim_mes_workshop dim_workshop USING (workshop_code)
WHERE dws_mes_oee_dd.stat_date BETWEEN '2026-09-01' AND '2026-09-30'
  AND dws_mes_oee_dd.workshop_code IN ('WS_01', 'WS_02')
  AND dws_mes_oee_dd.factory_id = 'F01' -- [AST 硬件级强制注入 RLS 权限]
GROUP BY 1, 2 ORDER BY 1 ASC LIMIT 5000;`
  },
  {
    step: 5,
    title: 'Step 5: OLAP 物化视图极速执行、图表渲染与飞轮回流',
    summary: 'StarRocks 自动命中周粒度物化视图（68ms 返回），Python 沙箱识别出第 3 周二车间异动下跌 -8.9%，渲染双折线趋势图并记录 Trace 至数据飞轮。',
    activeNodes: ['l4_olap_engine', 'l2_python_sandbox', 'l5_flywheel'],
    activeEdges: ['e_l4_exec', 'e_l4_to_viz', 'e_to_flywheel'],
    payloadTitle: '阶段 5 产出：OLAP 响应数据、异动归因结论与图表配置',
    payload: `{
  "olap_latency_ms": 68,
  "hit_mv": "mv_mes_oee_weekly_rollup",
  "auto_insight": "一车间上月周均 OEE 稳定在 86.8%；二车间在 W38 周出现异动跌落至 74.2%（环比 -8.9%），主要由贴片机换线停机导致。",
  "transparency_card": {
    "metric_definition": "OEE = 时间开动率 × 性能开动率 × 合格品率 (v2.4 制造中心标准口径)",
    "applied_filters": "工厂=华东一厂(F01) | 车间=一车间,二车间 | 时间=2026-09-01~09-30"
  }
}`
  }
];

// ==========================================
// 标准 Mermaid.js 架构源码定义 (支持一键复制导出)
// ==========================================
const MERMAID_SOURCE = `flowchart TB
    %% 样式定义
    classDef gateway fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
    classDef agent fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc
    classDef semantic fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#f8fafc
    classDef data fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#f8fafc
    classDef flywheel fill:#0f172a,stroke:#ec4899,stroke-width:2px,color:#f8fafc

    subgraph L1["第一层：交互与意图网关层 (Interaction & Intent Gateway)"]
        direction LR
        C1["多端统一接入<br/>(Web / 飞书 / 企微 / API)"]:::gateway
        C2["会话状态管理<br/>(多轮槽位继承与指代消解)"]:::gateway
        C3["意图分流与模糊反问<br/>(同名指标澄清卡片)"]:::gateway
        C4["SSO 与权限上下文提取<br/>(RLS 行级 / CLS 列级令牌)"]:::gateway
        C1 --> C2 --> C3 --> C4
    end

    subgraph L2["第二层：智能体推理与编排层 (Agentic Orchestration - LangGraph)"]
        direction TB
        Router{"智能体双轨路由器<br/>(LangGraph State Machine)"}:::agent
        DSL["主路径 (80% 常规问数)<br/>语义槽位填充智能体 (NL2DSL)<br/>输出 JSON 查询协议"]:::agent
        SQL["兜底路径 (20% 自由探索)<br/>GraphRAG 动态表裁剪 + NL2SQL<br/>(限制 5~8 张最小表集)"]:::agent
        Sandbox["Python 深度分析沙箱 & 图表引擎<br/>(E2B 归因算法 / ECharts 声明式渲染)"]:::agent
        Router -->|命中标准指标| DSL
        Router -->|长尾未建模明细| SQL
    end

    subgraph L3["第三层：语义与本体层 (Semantic & Ontology Layer - 核心底座)"]
        direction LR
        subgraph Meta["四表核心元数据模型"]
            M1[("1. 指标定义表<br/>DQ_METRIC")]:::semantic
            M2[("2. 维度与层级表<br/>DQ_DIM")]:::semantic
            M3[("3. 业务黑话同义词<br/>DQ_ALIAS")]:::semantic
            M4[("4. 口径版本血缘表<br/>DQ_METRIC_VER")]:::semantic
        end
        RAG["混合检索引擎 (Hybrid RAG)<br/>向量 + BM25 枚举实体链接<br/>+ Golden SQL 样本召回"]:::semantic
        AST["AST 确定性编译器 & SQLGlot 门禁<br/>(JSON转SQL / 强制注入RLS权限 / 阻断全表扫描 / 报错自愈)"]:::semantic
    end

    subgraph L4["第四层：数据执行与联邦网关层 (Data & Execution Gateway)"]
        direction LR
        Cache["多级语义缓存<br/>(Redis + 权限签名隔离)"]:::data
        Guard["查询路由与超时熔断器<br/>(Workload Group 资源隔离)"]:::data
        MV["异步物化视图透明改写<br/>(Materialized Views)"]:::data
        OLAP[("高性能 MPP OLAP 引擎<br/>(StarRocks / Apache Doris / ClickHouse)")]:::data
        Cache --> Guard --> MV --> OLAP
    end

    subgraph L5["第五层：评估与数据飞轮层 (Evaluation & Data Flywheel)"]
        direction TB
        F1["全链路可观测追踪<br/>(Langfuse / Arize Phoenix)"]:::flywheel
        F2["白盒口径卡片 & 点赞点踩反馈"]:::flywheel
        F3["Bad Case 标注与工程师纠错队列"]:::flywheel
        F4["Golden SQL 与同义词词典自动回流"]:::flywheel
        F1 --> F2 --> F3 --> F4
    end

    %% 跨层核心数据流转
    C4 --> Router
    Router <-->|召回指标与实体枚举| RAG
    Meta --> RAG
    DSL --> AST
    SQL --> AST
    C4 -.->|硬件级 AST 权限注入| AST
    AST --> Cache
    OLAP -->|返回结构化结果集| Sandbox
    Sandbox -->|流式图表与归因总结| C1
    Sandbox -.->|上报 Trace| F1
    F4 -.->|持续增強少样本与词典| RAG`;

export default function ChatBIArchitectureBlueprint() {
  // 视图模式：'blueprint' (全景架构与流转视图) | 'schema' (四表元数据与协议模型) | 'mermaid' (导出 Mermaid 源码)
  const [activeTab, setActiveTab] = useState('blueprint');
  // 当前选中查看详情的架构节点 ID
  const [selectedNodeId, setSelectedNodeId] = useState('l3_four_tables');
  // 仿真模式开关与当前步数 (0 表示未开启单步聚焦，1~5 表示对应步骤)
  const [simStep, setSimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // 双轨路径演示切换：'dsl' (80% 语义层 NL2DSL 主路径) | 'sql' (20% 动态 NL2SQL 兜底路径)
  const [routeMode, setRouteMode] = useState('dsl');
  // 复制成功状态
  const [copied, setCopied] = useState(false);

  // 自动播放定时器
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSimStep((prev) => {
        if (prev >= 5) {
          setIsPlaying(false);
          return 5;
        }
        return prev + 1;
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // 当仿真步数变化时，自动联动右侧详情面板聚焦到当前步骤的代表性节点
  useEffect(() => {
    if (simStep === 1) setSelectedNodeId('l1_rls_auth');
    if (simStep === 2) setSelectedNodeId('l3_hybrid_rag');
    if (simStep === 3) setSelectedNodeId(routeMode === 'dsl' ? 'l2_nl2dsl_agent' : 'l2_nl2sql_agent');
    if (simStep === 4) setSelectedNodeId('l3_ast_compiler');
    if (simStep === 5) setSelectedNodeId('l4_olap_engine');
  }, [simStep, routeMode]);

  const currentNode = ARCH_NODES[selectedNodeId] || ARCH_NODES.l3_four_tables;
  const currentSimObj = simStep > 0 ? SIMULATION_STEPS[simStep - 1] : null;

  // 判断某个节点在当前仿真步骤中是否高亮
  const isNodeActive = (nodeId) => {
    if (simStep === 0) return true; // 全景模式下全部正常展示
    if (!currentSimObj) return true;
    // 特殊处理第3步的双轨分支开关
    if (simStep === 3) {
      if (nodeId === 'l2_langgraph_router') return true;
      if (routeMode === 'dsl' && nodeId === 'l2_nl2dsl_agent') return true;
      if (routeMode === 'sql' && nodeId === 'l2_nl2sql_agent') return true;
      return false;
    }
    return currentSimObj.activeNodes.includes(nodeId);
  };

  // 复制代码工具函数
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 渲染单个架构模块卡片
  const renderNodeCard = (nodeId, badgeText, badgeColor = 'sky', iconComponent) => {
    const node = ARCH_NODES[nodeId];
    if (!node) return null;
    const isSelected = selectedNodeId === nodeId;
    const activeInSim = isNodeActive(nodeId);

    const colorMap = {
      sky: {
        border: isSelected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-slate-700/80 hover:border-sky-500/60',
        badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        glow: 'shadow-[0_0_25px_-5px_rgba(56,189,248,0.25)]'
      },
      indigo: {
        border: isSelected ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-slate-700/80 hover:border-indigo-500/60',
        badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        glow: 'shadow-[0_0_25px_-5px_rgba(129,140,248,0.25)]'
      },
      emerald: {
        border: isSelected ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-slate-700/80 hover:border-emerald-500/60',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        glow: 'shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]'
      },
      amber: {
        border: isSelected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700/80 hover:border-amber-500/60',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        glow: 'shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]'
      },
      pink: {
        border: isSelected ? 'border-pink-400 ring-2 ring-pink-400/30' : 'border-slate-700/80 hover:border-pink-500/60',
        badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
        glow: 'shadow-[0_0_25px_-5px_rgba(236,72,153,0.25)]'
      }
    };

    const theme = colorMap[badgeColor] || colorMap.sky;

    return (
      <div
        onClick={() => setSelectedNodeId(nodeId)}
        className={`group relative cursor-pointer rounded-xl bg-slate-900/90 backdrop-blur-md p-3.5 border transition-all duration-300 select-none ${
          theme.border
        } ${isSelected ? theme.glow : ''} ${
          simStep > 0 && !activeInSim
            ? 'opacity-30 scale-[0.98] grayscale-[40%]'
            : 'opacity-100 scale-100'
        } ${simStep > 0 && activeInSim ? 'ring-2 ring-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : ''}`}
      >
        {/* 仿真激活指示呼吸灯 */}
        {simStep > 0 && activeInSim && (
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border border-slate-950"></span>
          </span>
        )}

        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${theme.badge}`}>
              {iconComponent}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white leading-tight">
                {node.name}
              </h4>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                {node.enName}
              </p>
            </div>
          </div>
          {badgeText && (
            <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${theme.badge}`}>
              {badgeText}
            </span>
          )}
        </div>

        {/* 技术栈微型胶囊 */}
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800/80">
          {node.techStack.slice(0, 3).map((tech, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 背景工程网格纹理 */}
      <div
        className="fixed inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px), linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)`,
          backgroundSize: '24px 24px, 96px 96px, 96px 96px'
        }}
      />

      {/* 顶部架构师控制台 Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl px-4 lg:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* 左侧标题与架构范式标签 */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  企业级智能问数系统 (ChatBI / NL2Q) 全景技术架构蓝图
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" /> 语义层驱动 + Agentic 编排 v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                五层解耦架构 · 80% 语义层 NL2DSL 确定性编译 + 20% 受控 NL2SQL · AST 硬件级行级权限注入
              </p>
            </div>
          </div>

          {/* 右侧视图切换器 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button
                onClick={() => setActiveTab('blueprint')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'blueprint'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                五层架构蓝图 & 流转仿真
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'schema'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                四表元数据模型详解
              </button>
              <button
                onClick={() => setActiveTab('mermaid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'mermaid'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                导出 Mermaid 源码
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主体内容区 */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-4 lg:px-6 py-5">
        {activeTab === 'blueprint' && (
          <div className="space-y-4">
            {/* 仿真控制条 (Step-by-Step Simulator Bar) */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-3.5 shadow-xl backdrop-blur-md">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* 左侧：示例问句与仿真按钮 */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-400">仿真实例提问:</span>
                    <span className="text-xs font-medium text-cyan-200">
                      “对比一下上个月一车间和二车间的设备综合效率(OEE)，按周看趋势”
                    </span>
                  </div>

                  {/* 播放控制组 */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setSimStep(0);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                        simStep === 0
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      全景常亮
                    </button>
                    <div className="h-4 w-[1px] bg-slate-800 mx-1" />
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setSimStep((s) => (s <= 1 ? 5 : s - 1));
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      title="上一步"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (simStep === 0 || simStep >= 5) setSimStep(1);
                        setIsPlaying(!isPlaying);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition shadow-sm"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> 暂停仿真
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> {simStep > 0 ? '继续播放' : '单步流转仿真'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setSimStep((s) => (s >= 5 ? 1 : s + 1));
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      title="下一步"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 右侧：5 步进度胶囊 + 双轨路径切换 */}
                <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3">
                  {/* 5 步快速跳转 */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setIsPlaying(false);
                          setSimStep(st);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                          simStep === st
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        Step {st}
                      </button>
                    ))}
                  </div>

                  {/* 主路径 vs 兜底路径切换器 */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setRouteMode('dsl')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        routeMode === 'dsl'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      主路径: NL2DSL (80%)
                    </button>
                    <button
                      onClick={() => setRouteMode('sql')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        routeMode === 'sql'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      兜底: 动态 NL2SQL (20%)
                    </button>
                  </div>
                </div>
              </div>

              {/* 如果处于单步仿真模式，显示当前步骤横幅解说 */}
              {currentSimObj && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-cyan-950/20 -mx-3.5 -mb-3.5 px-4 py-2.5 rounded-b-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-xs">
                      {currentSimObj.title}
                    </span>
                    <span className="text-xs text-slate-200">
                      {currentSimObj.summary}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 shrink-0">
                    点击画布任意模块可查看底层防呆设计与代码协议 →
                  </span>
                </div>
              )}
            </div>

            {/* 核心主体：左侧五层全景架构图 (8列) + 右侧节点检视与实时 Payload 抽屉 (4列) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* 左侧：五层技术架构全景画布 (占 8 列) */}
              <div className="lg:col-span-8 rounded-2xl bg-slate-950/90 border border-slate-800/90 p-4 sm:p-5 shadow-2xl relative overflow-hidden">
                {/* 架构画布顶部图例栏 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      System Architecture Blueprint · 五层核心架構 + 侧翼飞轮
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> L1 接入网关
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> L2 智能体编排
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> L3 语义与本体底座
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> L4 OLAP联邦执行
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400"></span> L5 数据飞轮
                    </span>
                  </div>
                </div>

                {/* 架构主体网格：左侧主干四层 (占 9 列) + 右侧纵向贯穿第 5 层数据飞轮 (占 3 列) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 relative">
                  {/* 左侧主干四层 (L1 ~ L4) */}
                  <div className="xl:col-span-9 space-y-3.5">
                    {/* ==================== 第一层：交互与意图网关层 ==================== */}
                    <div className="rounded-xl bg-slate-900/50 border border-sky-500/30 p-3.5 relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            LAYER 01
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-sky-200">
                            交互与意图网关层 (Interaction & Intent Gateway)
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                          多端接入 · 指代消解 · 歧义拦截 · 权限令牌提取
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {renderNodeCard(
                          'l1_multi_channel',
                          'Ingress',
                          'sky',
                          <MessageSquare className="w-4 h-4" />
                        )}
                        {renderNodeCard(
                          'l1_session_memory',
                          'Context',
                          'sky',
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {renderNodeCard(
                          'l1_clarification',
                          'Guardrail',
                          'sky',
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {renderNodeCard(
                          'l1_rls_auth',
                          'RLS/CLS',
                          'sky',
                          <Lock className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* 层间动态流向指示器 (L1 -> L2) */}
                    <div className="flex items-center justify-around px-8 -my-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400/90">
                        <span className="h-4 w-[2px] bg-gradient-to-b from-sky-400 to-indigo-400 animate-pulse" />
                        <span>重写后标准问句 + 意图槽位</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90">
                        <span className="h-4 w-[2px] bg-gradient-to-b from-sky-400 to-emerald-400 animate-pulse" />
                        <span>RLS/CLS 硬件级权限令牌直传 AST 门禁</span>
                      </div>
                    </div>

                    {/* ==================== 第二层：智能体推理与编排层 ==================== */}
                    <div className="rounded-xl bg-slate-900/50 border border-indigo-500/30 p-3.5 relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            LAYER 02
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-indigo-200">
                            智能体推理与编排层 (Agentic Orchestration Layer - LangGraph)
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono text-indigo-300/90 hidden sm:inline">
                          优先语义层 DSL (80%) · 兜底受控 NL2SQL (20%)
                        </span>
                      </div>

                      {/* 顶部路由中枢 + 下方双轨分支 + 右侧沙箱 */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
                        {/* 路由状态机 (3列) */}
                        <div className="lg:col-span-3 flex flex-col justify-center">
                          {renderNodeCard(
                            'l2_langgraph_router',
                            'DAG Router',
                            'indigo',
                            <GitBranch className="w-4 h-4" />
                          )}
                        </div>

                        {/* 双轨执行路径 (5列) */}
                        <div className="lg:col-span-5 flex flex-col gap-2 justify-center relative">
                          {/* 主路径卡片 */}
                          <div
                            className={`rounded-xl p-0.5 transition-all ${
                              routeMode === 'dsl'
                                ? 'bg-gradient-to-r from-emerald-500/40 via-cyan-500/40 to-indigo-500/40'
                                : 'opacity-60'
                            }`}
                          >
                            {renderNodeCard(
                              'l2_nl2dsl_agent',
                              '80% 主路径 (零幻觉)',
                              'emerald',
                              <Code2 className="w-4 h-4" />
                            )}
                          </div>

                          {/* 兜底路径卡片 */}
                          <div
                            className={`rounded-xl p-0.5 transition-all ${
                              routeMode === 'sql'
                                ? 'bg-gradient-to-r from-amber-500/40 to-indigo-500/40'
                                : 'opacity-65'
                            }`}
                          >
                            {renderNodeCard(
                              'l2_nl2sql_agent',
                              '20% 兜底探索',
                              'amber',
                              <Terminal className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {/* 深度分析沙箱与图表渲染 (4列) */}
                        <div className="lg:col-span-4 flex flex-col justify-center">
                          {renderNodeCard(
                            'l2_python_sandbox',
                            '归因 & 图表',
                            'indigo',
                            <BarChart3 className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 层间动态流向指示器 (L2 <-> L3) */}
                    <div className="flex items-center justify-around px-6 -my-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                        <span className="h-4 w-[2px] bg-emerald-400 animate-pulse" />
                        <span>双向召回：指标公式 / 枚举值对齐 / Golden SQL</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
                        <span className="h-4 w-[2px] bg-cyan-400 animate-pulse" />
                        <span>输出 JSON DSL / SQL 进入 AST 安全编译门禁</span>
                      </div>
                    </div>

                    {/* ==================== 第三层：语义与本体层 (架构核心底座) ==================== */}
                    <div className="rounded-xl bg-gradient-to-b from-emerald-950/30 to-slate-900/80 border-2 border-emerald-500/40 p-3.5 relative shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500 text-slate-950">
                            LAYER 03 · CORE
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-emerald-300">
                            语义与本体层 (Semantic & Ontology Layer —— 消除口径幻觉的核心底座)
                          </h3>
                        </div>
                        <button
                          onClick={() => setActiveTab('schema')}
                          className="text-[11px] font-mono text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1"
                        >
                          查看四表物理结构 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                        {/* 四表核心元数据模型 (5列) */}
                        <div className="lg:col-span-5 flex flex-col justify-between">
                          {renderNodeCard(
                            'l3_four_tables',
                            '核心四表模型',
                            'emerald',
                            <Database className="w-4 h-4" />
                          )}
                          {/* 四表微型结构预览条 */}
                          <div
                            onClick={() => setSelectedNodeId('l3_four_tables')}
                            className="mt-2 grid grid-cols-2 gap-1.5 cursor-pointer"
                          >
                            {[
                              { code: '1. DQ_METRIC', label: '指标定义与公式表' },
                              { code: '2. DQ_DIM', label: '公共维度与层级表' },
                              { code: '3. DQ_ALIAS', label: '业务黑话同义词表' },
                              { code: '4. DQ_METRIC_VER', label: '口径版本与血缘表' }
                            ].map((tb, i) => (
                              <div
                                key={i}
                                className="px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[10px]"
                              >
                                <span className="font-mono font-semibold text-emerald-300">
                                  {tb.code}
                                </span>
                                <span className="text-slate-300 truncate ml-1">
                                  {tb.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 混合检索 Hybrid RAG (3.5列) */}
                        <div className="lg:col-span-3 flex flex-col justify-center">
                          {renderNodeCard(
                            'l3_hybrid_rag',
                            'Vector + BM25',
                            'emerald',
                            <Search className="w-4 h-4" />
                          )}
                        </div>

                        {/* AST 编译器与 SQLGlot 语法门禁 (3.5列) */}
                        <div className="lg:col-span-4 flex flex-col justify-center">
                          {renderNodeCard(
                            'l3_ast_compiler',
                            'AST 门禁 & 自愈',
                            'emerald',
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 层间动态流向指示器 (L3 -> L4) */}
                    <div className="flex items-center justify-center -my-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
                        <span className="h-4 w-[2px] bg-gradient-to-b from-emerald-400 to-amber-400 animate-pulse" />
                        <span>100% 语法合规 + 已注入行级权限的确定性目标方言 SQL</span>
                      </div>
                    </div>

                    {/* ==================== 第四层：数据执行与联邦网关层 ==================== */}
                    <div className="rounded-xl bg-slate-900/50 border border-amber-500/30 p-3.5 relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            LAYER 04
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-amber-200">
                            数据执行与联邦网关层 (Data & Execution Gateway)
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                          语义缓存秒回 · 慢查询熔断 · 物化视图透明加速 · MPP OLAP
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {renderNodeCard(
                          'l4_semantic_cache',
                          'Cache & Breaker',
                          'amber',
                          <Zap className="w-4 h-4" />
                        )}
                        {renderNodeCard(
                          'l4_olap_engine',
                          'MPP OLAP Engine',
                          'amber',
                          <Server className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ==================== 第五层（右侧纵向贯穿飞轮列）：评估与数据飞轮层 ==================== */}
                  <div className="xl:col-span-3 rounded-xl bg-gradient-to-b from-pink-950/25 via-slate-900/80 to-slate-900/90 border border-pink-500/30 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                          LAYER 05 · FLYWHEEL
                        </span>
                        <Activity className="w-4 h-4 text-pink-400" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-pink-200 mb-1">
                        评估与持续飞轮层
                      </h3>
                      <p className="text-[11px] text-slate-400 mb-3">
                        全链路 Tracing 与 Bad Case 闭环回流，实现“越用越准”的数据飞轮。
                      </p>

                      {renderNodeCard(
                        'l5_flywheel',
                        'Closed-Loop',
                        'pink',
                        <RefreshCw className="w-4 h-4" />
                      )}

                      {/* 飞轮四步演进列表 */}
                      <div className="mt-3 space-y-2">
                        {[
                          {
                            step: '01',
                            title: '全链路 Tracing (Langfuse)',
                            desc: '记录意图、召回指标、DSL/SQL、耗时与 Token'
                          },
                          {
                            step: '02',
                            title: '白盒口径卡片 & 点踩纠错',
                            desc: '向用户透明展示计算公式，收集点踩与口径反馈'
                          },
                          {
                            step: '03',
                            title: '数据工程师标注审核队列',
                            desc: '低置信度与报错 SQL 自动进入人工校准工作台'
                          },
                          {
                            step: '04',
                            title: 'Golden SQL 与同义词回流',
                            desc: '一键入库至 L3 混合检索库与 DQ_ALIAS 词典'
                          }
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedNodeId('l5_flywheel')}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/90 hover:border-pink-500/40 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-300">
                                {item.step}
                              </span>
                              <span className="text-xs font-medium text-slate-200">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 pl-7">
                              {item.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 底部回流指向提示 */}
                    <div className="mt-3 pt-2.5 border-t border-pink-500/20 flex items-center justify-between text-[11px] font-mono text-pink-300">
                      <span>← 自动反哺 L3 语义层知识库</span>
                      <span className="px-1.5 py-0.5 rounded bg-pink-500/20">
                        Acc &gt; 95%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：架构节点深度检视面板 + 实时流转 Payload 预览器 (占 4 列) */}
              <div className="lg:col-span-4 space-y-4 sticky top-20">
                {/* 面板 1：当前选中架构节点深度解析 */}
                <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 shadow-2xl">
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {currentNode.layer}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5">
                        {currentNode.name}
                      </h2>
                      <p className="text-xs font-mono text-slate-400">
                        {currentNode.enName}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                      组件详情
                    </span>
                  </div>

                  {/* 核心职责说明 */}
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                      <Info className="w-3.5 h-3.5 text-cyan-400" /> 核心架构职责
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                      {currentNode.desc}
                    </p>
                  </div>

                  {/* 推荐技术栈 */}
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Boxes className="w-3.5 h-3.5 text-indigo-400" /> 生产级选型推荐
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentNode.techStack.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-200 border border-indigo-500/30"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 工程防呆与安全护栏 (Guardrails) */}
                  <div className="mt-3.5">
                    <h4 className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 关键工程防呆设计 (Guardrails)
                    </h4>
                    <ul className="space-y-1.5">
                      {currentNode.guardrails.map((g, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/70"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 代码/协议数据结构示例 */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-amber-400" />{' '}
                        {currentSimObj
                          ? currentSimObj.payloadTitle
                          : currentNode.sampleTitle}
                      </h4>
                      <button
                        onClick={() =>
                          handleCopy(
                            currentSimObj
                              ? simStep === 3
                                ? routeMode === 'dsl'
                                  ? currentSimObj.payloadDsl
                                  : currentSimObj.payloadSql
                                : currentSimObj.payload
                              : currentNode.sampleCode
                          )
                        }
                        className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> 已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> 复制协议
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono leading-relaxed bg-[#050811] text-cyan-200 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-60">
                      <code>
                        {currentSimObj
                          ? simStep === 3
                            ? routeMode === 'dsl'
                              ? currentSimObj.payloadDsl
                              : currentSimObj.payloadSql
                            : currentSimObj.payload
                          : currentNode.sampleCode}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* 面板 2：最终前端输出可视化卡片预览（当处于第 5 步或选中沙箱/OLAP 时高亮展示） */}
                <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-cyan-400" /> 终端问数结果卡片预览 (OEE 周趋势对比)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      StarRocks 耗时 68ms
                    </span>
                  </div>

                  {/* 模拟双折线趋势柱状/折线混合可视化 */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/90">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>指标: 设备综合效率 (metric_oee)</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-cyan-300">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span> 一车间 (WS_01)
                        </span>
                        <span className="flex items-center gap-1 text-amber-300">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span> 二车间 (WS_02)
                        </span>
                      </div>
                    </div>

                    {/* 4 周对比条形趋势图 */}
                    <div className="grid grid-cols-4 gap-2 pt-2 pb-1 items-end h-28 border-b border-slate-800">
                      {[
                        { w: '2026-W36', v1: 86.4, v2: 82.1, alert: false },
                        { w: '2026-W37', v1: 87.2, v2: 83.1, alert: false },
                        { w: '2026-W38', v1: 86.9, v2: 74.2, alert: true },
                        { w: '2026-W39', v1: 87.5, v2: 81.8, alert: false }
                      ].map((row, idx) => (
                        <div key={idx} className="flex flex-col items-center h-full justify-end">
                          <div className="flex items-end gap-1.5 w-full justify-center h-20">
                            <div
                              style={{ height: `${row.v1}%` }}
                              className="w-3.5 rounded-t bg-cyan-500/80 hover:bg-cyan-400 transition relative group"
                            >
                              <span className="text-[9px] font-mono text-cyan-200 absolute -top-4 left-1/2 -translate-x-1/2">
                                {row.v1}%
                              </span>
                            </div>
                            <div
                              style={{ height: `${row.v2}%` }}
                              className={`w-3.5 rounded-t transition relative ${
                                row.alert
                                  ? 'bg-rose-500 ring-2 ring-rose-400/50'
                                  : 'bg-amber-500/80 hover:bg-amber-400'
                              }`}
                            >
                              <span
                                className={`text-[9px] font-mono absolute -top-4 left-1/2 -translate-x-1/2 ${
                                  row.alert ? 'text-rose-300 font-bold' : 'text-amber-200'
                                }`}
                              >
                                {row.v2}%
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 mt-1.5">
                            {row.w}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 自动归因洞察与白盒口径说明 */}
                    <div className="mt-2.5 space-y-1.5 text-[11px]">
                      <p className="text-slate-200 bg-rose-950/30 border border-rose-500/30 rounded-lg px-2.5 py-1.5">
                        <strong className="text-rose-300">Python 沙箱异动归因：</strong>
                        二车间在 <span className="font-mono">2026-W38</span> OEE 跌落至{' '}
                        <span className="font-mono font-bold text-rose-300">74.2%</span>（环比 -8.9%），下钻定位 82% 降幅来自「贴片机_SMT04」突发换线停机。
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                        <span>白盒口径: OEE v2.4 标准公式 | RLS: factory_id=F01</span>
                        <span className="text-emerald-400">✓ 已通过 AST 校验</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 标签页 2：四表核心元数据模型详解 ==================== */}
        {activeTab === 'schema' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Semantic Layer Ontology Schema
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1.5">
                    第三层核心底座：四表元数据模型物理设计 (4-Table Metadata Schema)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    为什么不能直接让大模型看物理宽表写 SQL？因为物理表缺乏“业务口径公式”、“维度层级绑定”与“口语黑话映射”。以下四张核心元数据表构成了企业级问数的语义底座：
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('blueprint')}
                  className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
                >
                  ← 返回全景架构图
                </button>
              </div>

              {/* 四张核心元数据表卡片矩阵 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {[
                  {
                    table: '1. 指标定义主表 (DQ_METRIC)',
                    role: '统一收口企业所有原子指标、派生指标与复合指标的标准计算公式，杜绝大模型自己捏造加减乘除。',
                    fields: [
                      { name: 'metric_code', type: 'VARCHAR(64) PK', desc: '指标唯一编码，如 metric_oee' },
                      { name: 'metric_name', type: 'VARCHAR(128)', desc: '标准业务名称，如 设备综合效率(OEE)' },
                      { name: 'metric_type', type: 'ENUM', desc: 'ATOMIC(原子) / DERIVED(派生) / COMPOSITE(复合)' },
                      { name: 'agg_formula', type: 'TEXT', desc: '标准 SQL 聚合表达式模板（由 AST 编译器渲染）' },
                      { name: 'base_model_table', type: 'VARCHAR(128)', desc: '绑定的底层 DWS/DWD 物理模型表或物化视图' },
                      { name: 'allowed_dim_codes', type: 'JSONB', desc: '允许组合切片分析的公共维度白名单列表' },
                      { name: 'default_time_grain', type: 'VARCHAR(32)', desc: '默认时间聚合粒度 (DAY / WEEK / MONTH)' }
                    ]
                  },
                  {
                    table: '2. 维度与层级字典表 (DQ_DIM)',
                    role: '定义可下钻的公共维度（时间、组织、产线、地区）及高基数枚举值向量同步策略，支撑实体链接。',
                    fields: [
                      { name: 'dim_code', type: 'VARCHAR(64) PK', desc: '维度唯一编码，如 dim_workshop' },
                      { name: 'dim_name', type: 'VARCHAR(128)', desc: '维度中文名称，如 生产车间' },
                      { name: 'physical_col_expr', type: 'VARCHAR(256)', desc: '映射的物理表字段名及 JOIN 关联键路径' },
                      { name: 'hierarchy_path', type: 'VARCHAR(256)', desc: '下钻层级链，如 factory -> workshop -> line -> machine' },
                      { name: 'enum_sync_mode', type: 'ENUM', desc: '枚举值同步至 ES/Milvus 策略 (REALTIME / DAILY)' },
                      { name: 'rls_security_tag', type: 'VARCHAR(64)', desc: '关联的行级权限控制域标签' }
                    ]
                  },
                  {
                    table: '3. 业务黑话与同义词表 (DQ_ALIAS)',
                    role: '将口语化提问（如“大客户”、“直通率”、“华东一厂”）确定性映射为标准指标编码或过滤谓词表达式。',
                    fields: [
                      { name: 'alias_id', type: 'BIGINT PK', desc: '同义词自增主键' },
                      { name: 'alias_term', type: 'VARCHAR(128)', desc: '业务口语或黑话词条，如 "头部KA客户"、"良率"' },
                      { name: 'target_type', type: 'ENUM', desc: '映射目标类型: METRIC / DIMENSION / FILTER_PREDICATE' },
                      { name: 'target_code', type: 'VARCHAR(64)', desc: '指向的标准指标或维度编码' },
                      { name: 'bound_sql_filter', type: 'TEXT', desc: '当类型为 FILTER 时附带的固定过滤条件 (如 vip_level = \'S\')' },
                      { name: 'source_flywheel_id', type: 'VARCHAR(64)', desc: '来自数据飞轮用户点踩纠错回流的 Trace ID' }
                    ]
                  },
                  {
                    table: '4. 口径版本与血缘表 (DQ_METRIC_VER)',
                    role: '管理同一指标在不同部门（财务 vs 销售）或不同历史时期的口径差异，并在白盒卡片中向用户透出。',
                    fields: [
                      { name: 'version_id', type: 'VARCHAR(64) PK', desc: '口径版本号，如 metric_oee_v2.4' },
                      { name: 'metric_code', type: 'VARCHAR(64) FK', desc: '关联的指标编码' },
                      { name: 'dept_scope', type: 'VARCHAR(64)', desc: '适用部门域 (如 FINANCE_DEPT / MFG_CENTER)' },
                      { name: 'effective_date_range', type: 'DATERANGE', desc: '口径生效起止时间窗口' },
                      { name: 'business_explanation', type: 'TEXT', desc: '面向业务人员的白盒自然语言口径解释说明' },
                      { name: 'upstream_lineage', type: 'JSONB', desc: '上游依赖的物理表、ETL 任务及责任人信息' }
                    ]
                  }
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-emerald-300 font-mono">
                          {card.table}
                        </h3>
                        <Database className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                        {card.role}
                      </p>
                      <div className="border-t border-slate-800/90 pt-2.5 space-y-1.5">
                        {card.fields.map((f, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-12 gap-2 text-[11px] py-1 px-2 rounded bg-slate-900/70"
                          >
                            <span className="col-span-4 font-mono font-semibold text-cyan-300 truncate">
                              {f.name}
                            </span>
                            <span className="col-span-3 font-mono text-amber-300/90 truncate">
                              {f.type}
                            </span>
                            <span className="col-span-5 text-slate-300">
                              {f.desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 标签页 3：导出 Mermaid 架构图源码 ==================== */}
        {activeTab === 'mermaid' && (
          <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/30 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Architecture-as-Code (Mermaid.js)
                </span>
                <h2 className="text-lg font-bold text-white mt-1.5">
                  智能问数系统五层技术架构 Mermaid.js 标准源码
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  一键复制下方代码，可直接粘贴至 Notion、语雀、飞书文档、Confluence、GitHub Markdown 或 Draw.io 中渲染矢量架构图。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(MERMAID_SOURCE)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> 已复制到剪贴板
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> 一键复制 Mermaid 源码
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="mt-4 text-xs font-mono leading-relaxed bg-[#050811] text-indigo-200 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <code>{MERMAID_SOURCE}</code>
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}