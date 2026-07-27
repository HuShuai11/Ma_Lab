import { and, asc, eq, ne } from "drizzle-orm";
import { ensureDatabaseSchema, getDb } from "@/db";
import { contentItems } from "@/db/schema";

export const CONTENT_TYPES = [
  "settings",
  "research",
  "projects",
  "members",
  "publications",
  "activities",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentVisibility = "visible" | "hidden" | "deleted";

export type ContentRecord = {
  id: number;
  type: ContentType;
  slug: string;
  title: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  revision: number;
  visibility: ContentVisibility;
  createdAt: string;
  updatedAt: string;
};

export type SiteData = Record<ContentType, ContentRecord[]>;

type SeedItem = Omit<
  ContentRecord,
  "id" | "createdAt" | "updatedAt" | "visibility" | "revision"
>;

export const seedContent: SeedItem[] = [
  {
    type: "settings",
    slug: "home",
    title: "课题组首页设置",
    sortOrder: 0,
    payload: {
      heroTitle: "让机器人走进电力现场，",
      heroAccent: "让智能服务真实工程。",
      heroLead:
        "东北电力大学自动化工程学院马乐课题组，聚焦智能机器人、人工智能与控制、计算机视觉电力应用及智慧能源系统。",
      aboutTitle: "从真实电力场景出发，研究能落地的智能技术。",
      aboutLead:
        "面向国家能源转型与智能制造需求，连接机器人、人工智能与控制科学。",
      aboutText:
        "课题组依托东北电力大学自动化工程学院“电力设备智能检测与诊断技术研究所”，围绕复杂环境下的机器人自主作业、电力设备视觉检测、学习控制与智慧能源系统开展研究，重视基础理论、工程验证与成果转化之间的闭环。",
      contactText:
        "欢迎对智能机器人、人工智能与控制、计算机视觉及智慧能源感兴趣的同学联系课题组。",
      contactEmail: "male_robot_nedu@sina.com",
    },
  },
  {
    type: "research",
    slug: "intelligent-robotics",
    title: "智能机器人与系统",
    sortOrder: 1,
    payload: {
      english: "INTELLIGENT ROBOTICS",
      text: "围绕机器人感知、规划、学习与控制，研究能够在复杂环境中自主作业的智能机器人系统。",
      tags: ["机器人系统", "自主作业", "学习控制"],
    },
  },
  {
    type: "research",
    slug: "power-robotics",
    title: "电力机器人与智能控制",
    sortOrder: 2,
    payload: {
      english: "POWER ROBOTICS",
      text: "面向电力巡检、运维与作业场景，探索机器人平台、智能控制及安全作业关键技术。",
      tags: ["电力巡检", "智能控制", "作业机器人"],
    },
  },
  {
    type: "research",
    slug: "computer-vision",
    title: "计算机视觉电力应用",
    sortOrder: 3,
    payload: {
      english: "COMPUTER VISION",
      text: "利用视觉感知与机器学习方法解决电力设备检测、缺陷识别、定位跟踪等工程问题。",
      tags: ["机器视觉", "缺陷检测", "目标跟踪"],
    },
  },
  {
    type: "research",
    slug: "smart-energy",
    title: "智慧能源系统",
    sortOrder: 4,
    payload: {
      english: "SMART ENERGY",
      text: "研究新能源电力设备与智慧能源系统中的感知、诊断、优化及智能运行方法。",
      tags: ["智慧能源", "设备诊断", "优化运行"],
    },
  },
  {
    type: "projects",
    slug: "low-carbon-building",
    title: "低碳楼宇数智管控云平台",
    sortOrder: 1,
    payload: {
      english: "SMART BUILDING · AI OPTIMIZATION",
      summary:
        "面向楼宇能源系统，集成能耗与碳排监测、设备运行分析、AI 预测优化、知识图谱与数字孪生入口。",
      status: "系统原型 · 持续迭代",
      tags: ["能源监控", "碳排分析", "AI 预测", "数字孪生"],
      heroImage: "/project-lowcarbon-hero.png",
      href: "/projects/low-carbon-building",
      detail:
        "平台围绕楼宇能源运行场景，将分散的用能、供冷、环境与设备数据组织为统一看板，并通过预测分析和策略建议辅助节能运行与低碳管理。",
    },
  },
  {
    type: "projects",
    slug: "smart-heating",
    title: "桦皮厂智慧供热系统",
    sortOrder: 2,
    payload: {
      english: "SMART HEATING · REMOTE CONTROL",
      summary:
        "面向供热站运行场景，连接设备、管网、环境与用户侧数据，形成实时监测、远程控制与告警追溯平台。",
      status: "系统原型 · 持续迭代",
      tags: ["流程监控", "设备控制", "告警追溯"],
      heroImage: "/project-heating-hero.png",
      href: "/projects/smart-heating",
      detail:
        "系统围绕空气源热泵、电锅炉、循环泵、换热器和一次、二次管网构建统一监控界面。",
    },
  },
  {
    type: "projects",
    slug: "wind-maintenance",
    title: "智能故障诊断与智慧检修子系统",
    sortOrder: 3,
    payload: {
      english: "WIND POWER · SMART MAINTENANCE",
      summary:
        "面向风电设备运行与检修，连接数据诊断、故障仿真、知识问答、检修指导与人员培训。",
      status: "系统原型 · 持续迭代",
      tags: ["故障诊断", "智能问答", "仿真培训"],
      heroImage: "/project-wind-hero.png",
      href: "/projects/wind-maintenance",
      detail:
        "系统将故障预警、溯源定位、AI 问答、检修流程生成和培训测评组织为连续的智慧运维工作链路。",
    },
  },
  {
    type: "publications",
    slug: "complex-semgang-gesture-recognition-2024",
    title:
      "Complex Surface Electromyography Signal Gesture Recognition Based on Multipathway Featured Scale Convolutional Neural Network",
    sortOrder: 1,
    payload: {
      year: "2024",
      journal: "IEEE TIM",
      authors: "Tie Liu, Dianchun Bai, Le Ma, Qiang Du, Hiroshi Yokoi",
      link: "",
    },
  },
  {
    type: "publications",
    slug: "microwave-deicing-tracking-2024",
    title:
      "Study on Automatic Tracking System of Microwave Deicing Device for Railway Contact Wire",
    sortOrder: 2,
    payload: {
      year: "2024",
      journal: "IEEE TIM",
      authors: "Guanfeng Du, Hongzheng Zhang, Le Ma (Corresponding Author)",
      link: "",
    },
  },
  {
    type: "publications",
    slug: "mixture-basis-function-2023",
    title:
      "Mixture Basis Function Approximation and Neural Network Embedding Control for Nonlinear Uncertain Systems with Disturbances",
    sortOrder: 3,
    payload: {
      year: "2023",
      journal: "Mathematics",
      authors: "Le Ma, Qiaoyu Zhang, Tianmiao Wang, et al.",
      link: "",
    },
  },
  {
    type: "publications",
    slug: "medicine-bottle-vision-2021",
    title:
      "High Precision Medicine Bottles Vision Online Inspection System and Classification Based on Multi-Features and Ensemble Learning via Independence Test",
    sortOrder: 4,
    payload: {
      year: "2021",
      journal: "IEEE TIM",
      authors: "Le Ma, Xiaoyue Wu, Zhiwei Li",
      link: "",
    },
  },
  {
    type: "activities",
    slug: "science-award-2024",
    title: "中国仪器仪表学会科技进步二等奖",
    sortOrder: 1,
    payload: {
      year: "2024",
      category: "荣誉",
      text: "可燃危险气源红外光谱精确识别检测技术与应用。",
      image: "",
    },
  },
  {
    type: "activities",
    slug: "simulation-training-system-2024",
    title: "三维仿真实训管理系统",
    sortOrder: 2,
    payload: {
      year: "2024",
      category: "项目",
      text: "面向工程教育与实训场景开展系统研发与成果转化。",
      image: "",
    },
  },
  {
    type: "activities",
    slug: "aerial-robot-learning-control-2021",
    title: "空中作业机器人深度学习控制研究",
    sortOrder: 3,
    payload: {
      year: "2021",
      category: "科研",
      text: "获批吉林省教育厅科学技术重点项目并由课题组主持。",
      image: "",
    },
  },
];

function emptySiteData(): SiteData {
  return {
    settings: [],
    research: [],
    projects: [],
    members: [],
    publications: [],
    activities: [],
  };
}

function seedAsRecords(): SiteData {
  const data = emptySiteData();
  seedContent.forEach((item, index) => {
    data[item.type].push({
      ...item,
      id: -(index + 1),
      visibility: "visible",
      revision: 1,
      createdAt: "",
      updatedAt: "",
    });
  });
  return data;
}

export function parsePayload(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toRecord(row: typeof contentItems.$inferSelect): ContentRecord {
  return {
    id: row.id,
    type: row.type as ContentType,
    slug: row.slug,
    title: row.title,
    payload: parsePayload(row.payload),
    sortOrder: row.sortOrder,
    revision: row.revision,
    visibility: row.visibility as ContentVisibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function ensureSeedContent() {
  await ensureDatabaseSchema();
  const db = getDb();
  const existing = await db
    .select({ id: contentItems.id })
    .from(contentItems)
    .limit(seedContent.length);
  if (existing.length >= seedContent.length) return;

  // Cloudflare D1 caps the number of bound parameters in one statement. Each
  // seed record needs seven values, so seed in small idempotent batches.
  const batchSize = 8;
  for (let offset = 0; offset < seedContent.length; offset += batchSize) {
    await db
      .insert(contentItems)
      .values(
        seedContent.slice(offset, offset + batchSize).map((item) => ({
          type: item.type,
          slug: item.slug,
          title: item.title,
          payload: JSON.stringify(item.payload),
          sortOrder: item.sortOrder,
          visibility: "visible" as const,
        })),
      )
      .onConflictDoNothing();
  }
}

export async function loadPublicSiteData(): Promise<SiteData> {
  try {
    await ensureSeedContent();
    const db = getDb();
    const rows = await db
      .select()
      .from(contentItems)
      .where(
        and(
          eq(contentItems.visibility, "visible"),
          ne(contentItems.type, ""),
        ),
      )
      .orderBy(asc(contentItems.type), asc(contentItems.sortOrder), asc(contentItems.id));

    const data = emptySiteData();
    for (const row of rows) {
      if (CONTENT_TYPES.includes(row.type as ContentType)) {
        data[row.type as ContentType].push(toRecord(row));
      }
    }
    return data;
  } catch {
    return seedAsRecords();
  }
}

export async function loadAllContent(): Promise<ContentRecord[]> {
  await ensureSeedContent();
  const rows = await getDb()
    .select()
    .from(contentItems)
    .orderBy(asc(contentItems.type), asc(contentItems.sortOrder), asc(contentItems.id));
  return rows.map(toRecord);
}

export async function getPublicProject(slug: string) {
  const data = await loadPublicSiteData();
  return data.projects.find((item) => item.slug === slug) ?? null;
}
