import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProject } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const universityLogo =
  "https://open.ieee.org/wp-content/uploads/Northeast-Electric-Power-University.png";

type GalleryItem = {
  image: string;
  label: string;
  title: string;
  text: string;
  alt: string;
};

const projectGalleries: Record<string, GalleryItem[]> = {
  "low-carbon-building": [
    {
      image: "/project-lowcarbon-overview.png",
      label: "系统首页概览",
      title: "关键运行状态，一屏掌握",
      text: "汇总能耗、碳排、能效评分、节能率、设备状态和告警信息，建立整体运行认知。",
      alt: "低碳楼宇数智管控云平台首页概览",
    },
    {
      image: "/project-lowcarbon-energy.png",
      label: "能源监控",
      title: "多指标运行监测",
      text: "对供能系统、电气负荷与室内环境进行分层呈现。",
      alt: "低碳楼宇能源监控界面",
    },
    {
      image: "/project-lowcarbon-ai.png",
      label: "优化与预测",
      title: "从趋势预测到策略建议",
      text: "呈现预测结果、置信度和节能收益，辅助运行决策。",
      alt: "低碳楼宇AI优化界面",
    },
    {
      image: "/project-lowcarbon-graph.png",
      label: "系统图谱",
      title: "连接设备、能量流与评价体系",
      text: "用知识图谱组织供能流程、设备关系与全生命周期评价入口。",
      alt: "低碳楼宇系统图谱",
    },
  ],
  "smart-heating": [
    {
      image: "/project-heating-overview.png",
      label: "供热流程总览",
      title: "设备、管网与运行状态一屏呈现",
      text: "以流程图连接供热设备与用户端，同时汇总一次网、二次网运行信息。",
      alt: "桦皮厂智慧供热系统首页",
    },
    {
      image: "/project-heating-control.png",
      label: "系统控制",
      title: "从状态查看到参数设定",
      text: "集中呈现管网运行指标，并提供远程参数与启停控制入口。",
      alt: "桦皮厂智慧供热系统控制面板",
    },
    {
      image: "/project-heating-data.png",
      label: "实时数据",
      title: "多层级运行数据统一管理",
      text: "按温度、压力、水箱、泵组和控制参数组织实时数据。",
      alt: "桦皮厂智慧供热系统实时数据页面",
    },
  ],
  "wind-maintenance": [
    {
      image: "/project-wind-overview.png",
      label: "功能总览",
      title: "诊断、检修、培训与数据管理协同",
      text: "以四类业务功能群组织智慧运维能力，形成清晰的一体化入口。",
      alt: "风电智慧检修子系统功能首页",
    },
    {
      image: "/project-wind-diagnosis.png",
      label: "故障诊断",
      title: "上传数据并呈现预警与定位结果",
      text: "为设备运行数据提供统一诊断入口，组织预警、溯源与定位信息。",
      alt: "风电设备智能故障诊断页面",
    },
    {
      image: "/project-wind-assistant.png",
      label: "智能问答",
      title: "面向风电运维知识的对话工作站",
      text: "以多轮会话承载风电专业知识问答，帮助检修学习和现场查询。",
      alt: "风电知识智能问答工作站",
    },
    {
      image: "/project-wind-training.png",
      label: "仿真培训",
      title: "按故障类型与难度生成检修指导",
      text: "通过虚拟故障工况、诊断步骤与操作指南，支持不同难度等级的检修训练。",
      alt: "风电虚拟故障工况检修指导页面",
    },
  ],
};

function text(payload: Record<string, unknown>, key: string, fallback = "") {
  return typeof payload[key] === "string" ? String(payload[key]) : fallback;
}

function list(payload: Record<string, unknown>, key: string) {
  return Array.isArray(payload[key])
    ? (payload[key] as unknown[]).filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}

export default async function GenericProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) notFound();

  const english = text(project.payload, "english", "MA LAB · PROJECT");
  const summary = text(project.payload, "summary");
  const detail = text(project.payload, "detail", summary);
  const status = text(project.payload, "status", "研究项目 · 持续推进");
  const heroImage = text(project.payload, "heroImage", "/og.png");
  const tags = list(project.payload, "tags");
  const gallery = projectGalleries[project.slug] ?? [];

  return (
    <main className="project-page generic-project-page">
      <header className="project-topbar">
        <Link className="brand" href="/">
          <span className="school-emblem">
            <img src={universityLogo} alt="东北电力大学校徽" />
          </span>
          <span>
            <strong>马乐课题组 · MA LAB</strong>
            <small>东北电力大学自动化工程学院</small>
          </span>
        </Link>
        <Link className="project-back" href="/#projects">
          返回项目列表 <span>↗</span>
        </Link>
      </header>

      <section className="project-hero">
        <img
          className="project-hero-image"
          src={heroImage}
          alt=""
          aria-hidden="true"
        />
        <div className="project-hero-shade" />
        <div className="project-hero-content">
          <p className="eyebrow">
            <span /> {english}
          </p>
          <div className="project-live-pill">
            <i /> {status}
          </div>
          <h1>{project.title}</h1>
          <p>{summary}</p>
          <div className="project-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="project-intro generic-project-intro">
        <div className="project-intro-label">
          <span>PROJECT ARCHIVE</span>
          <small>{english}</small>
        </div>
        <div className="project-intro-copy">
          <h2>项目介绍</h2>
          {detail
            .split(/\n+/)
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
        </div>
        <div className="project-scope">
          <span>关键词</span>
          {tags.map((tag) => (
            <b key={tag}>{tag}</b>
          ))}
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="project-gallery">
          <div className="project-section-heading">
            <div>
              <p>PROJECT SYSTEM INTERFACE</p>
              <h2>系统界面</h2>
            </div>
            <p>以下展示界面用于说明项目原型的主要功能与研究应用场景。</p>
          </div>
          <div className="gallery-grid">
            {gallery.map((item) => (
              <figure key={item.image}>
                <div className="browser-frame">
                  <div className="browser-bar">
                    <i />
                    <i />
                    <i />
                    <span>{item.label}</span>
                  </div>
                  <img src={item.image} alt={item.alt} />
                </div>
                <figcaption>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="project-footer-cta">
        <div>
          <p>MA LAB · NORTHEAST ELECTRIC POWER UNIVERSITY</p>
          <h2>查看课题组更多研究与成果</h2>
        </div>
        <Link className="button button-primary" href="/#projects">
          返回课题组主页 <span>↗</span>
        </Link>
      </section>
    </main>
  );
}
