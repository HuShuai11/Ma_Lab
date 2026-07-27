import { loadPublicSiteData } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const universityLogo =
  "https://open.ieee.org/wp-content/uploads/Northeast-Electric-Power-University.png";

const maLePortrait =
  "https://auto.neepu.edu.cn/__local/5/E0/ED/96F89154AB0A698A0198FE2BDC9_0C3DF5CE_2AD0F.png";

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className={`brand ${footer ? "footer-brand" : ""}`} href="#top">
      <span className="school-emblem">
        <img src={universityLogo} alt="东北电力大学校徽" />
      </span>
      <span>
        <strong>马乐课题组 · MA LAB</strong>
        <small>东北电力大学自动化工程学院</small>
      </span>
    </a>
  );
}

function textValue(
  payload: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = payload[key];
  return typeof value === "string" ? value : fallback;
}

function listValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function Home() {
  const siteData = await loadPublicSiteData();
  const homeSettings = siteData.settings[0]?.payload ?? {};
  const research = siteData.research.map((item, index) => ({
    number: String(index + 1).padStart(2, "0"),
    title: item.title,
    english: textValue(item.payload, "english"),
    text: textValue(item.payload, "text"),
    tags: listValue(item.payload, "tags"),
  }));
  const projects = siteData.projects.map((item, index) => ({
    number: String(index + 1).padStart(2, "0"),
    slug: item.slug,
    title: item.title,
    english: textValue(item.payload, "english"),
    summary: textValue(item.payload, "summary"),
    status: textValue(item.payload, "status", "研究项目 · 持续推进"),
    tags: listValue(item.payload, "tags"),
    heroImage: textValue(item.payload, "heroImage", "/og.png"),
    href:
      textValue(item.payload, "href") ||
      `/projects/${encodeURIComponent(item.slug)}`,
  }));
  const publications = siteData.publications.map((item) => ({
    title: item.title,
    year: textValue(item.payload, "year"),
    journal: textValue(item.payload, "journal"),
    authors: textValue(item.payload, "authors"),
    link: textValue(item.payload, "link"),
  }));
  const timeline = siteData.activities.map((item) => ({
    title: item.title,
    year: textValue(item.payload, "year"),
    type: textValue(item.payload, "category"),
    text: textValue(item.payload, "text"),
  }));
  const members = siteData.members.map((item) => ({
    name: item.title,
    role: textValue(item.payload, "role"),
    research: textValue(item.payload, "research"),
    bio: textValue(item.payload, "bio"),
    image: textValue(item.payload, "image"),
    link: textValue(item.payload, "link"),
  }));

  return (
    <main>
      <header className="topbar">
        <Brand />
        <nav aria-label="主导航">
          <a href="#about">关于我们</a>
          <a href="#research">研究方向</a>
          <a href="#projects">项目展示</a>
          <a href="#people">导师介绍</a>
          <a href="#publications">论文成果</a>
          <a href="#news">科研动态</a>
        </nav>
        <a className="nav-cta" href="#contact">
          加入我们 <span>↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-content">
          <p className="eyebrow">
            <span /> INTELLIGENT ROBOTICS · AI &amp; CONTROL
          </p>
          <h1>
            {textValue(
              homeSettings,
              "heroTitle",
              "让机器人走进电力现场，",
            )}
            <br />
            <em>
              {textValue(
                homeSettings,
                "heroAccent",
                "让智能服务真实工程。",
              )}
            </em>
          </h1>
          <p className="hero-lead">
            {textValue(
              homeSettings,
              "heroLead",
              "东北电力大学自动化工程学院马乐课题组，聚焦智能机器人、人工智能与控制、计算机视觉电力应用及智慧能源系统。",
            )}
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#research">
              探索研究方向 <span>→</span>
            </a>
            <a
              className="text-link"
              href="https://auto.neepu.edu.cn/info/1532/15345.htm"
              target="_blank"
              rel="noreferrer"
            >
              查看导师主页 <span>↗</span>
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-grid" />
          <div className="system-ring ring-a">
            <i />
          </div>
          <div className="system-ring ring-b">
            <i />
          </div>
          <div className="system-core">
            <span>MA</span>
            <small>LAB</small>
          </div>
          <div className="node node-a">VISION</div>
          <div className="node node-b">ROBOT</div>
          <div className="node node-c">ENERGY</div>
        </div>

        <div className="hero-stats" aria-label="课题组科研数据概览">
          <div>
            <strong>12<sup>+</sup></strong>
            <span>SCI / EI 论文</span>
          </div>
          <div>
            <strong>06</strong>
            <span>发明专利申请</span>
          </div>
          <div>
            <strong>09</strong>
            <span>主持科研项目</span>
          </div>
          <div>
            <strong>01</strong>
            <span>科技进步奖</span>
          </div>
        </div>
        <p className="demo-note">NORTHEAST ELECTRIC POWER UNIVERSITY · JILIN, CHINA</p>
      </section>

      <section className="section intro" id="about">
        <div className="section-kicker">
          <span>01</span> ABOUT MA LAB
        </div>
        <div className="intro-grid">
          <h2>
            {textValue(
              homeSettings,
              "aboutTitle",
              "从真实电力场景出发，研究能落地的智能技术。",
            )}
          </h2>
          <div>
            <p className="large-copy">
              {textValue(
                homeSettings,
                "aboutLead",
                "面向国家能源转型与智能制造需求，连接机器人、人工智能与控制科学。",
              )}
            </p>
            <p>
              {textValue(
                homeSettings,
                "aboutText",
                "课题组依托东北电力大学自动化工程学院“电力设备智能检测与诊断技术研究所”，围绕复杂环境下的机器人自主作业、电力设备视觉检测、学习控制与智慧能源系统开展研究，重视基础理论、工程验证与成果转化之间的闭环。",
              )}
            </p>
            <a
              className="underlined-link"
              href="https://auto.neepu.edu.cn/"
              target="_blank"
              rel="noreferrer"
            >
              访问自动化工程学院 <span>↗</span>
            </a>
          </div>
        </div>
        <div className="principles">
          <div>
            <b>Problem-led</b>
            <span>问题牵引</span>
            <p>从电力与工业现场发现值得长期研究的真实问题。</p>
          </div>
          <div>
            <b>Interdisciplinary</b>
            <span>交叉融合</span>
            <p>连接控制、视觉、学习算法与机器人系统。</p>
          </div>
          <div>
            <b>Engineering</b>
            <span>工程验证</span>
            <p>让方法经得起系统实现与实际应用的检验。</p>
          </div>
        </div>
      </section>

      <section className="section research-section" id="research">
        <div className="section-heading">
          <div>
            <div className="section-kicker light">
              <span>02</span> RESEARCH
            </div>
            <h2>研究方向</h2>
          </div>
          <p>
            以智能机器人为系统载体，
            <br />
            以电力与能源场景为应用牵引。
          </p>
        </div>
        <div className="research-list">
          {research.map((item) => (
            <article key={item.number}>
              <span className="research-number">{item.number}</span>
              <div className="research-copy">
                <div>
                  <h3>{item.title}</h3>
                  <small>{item.english}</small>
                </div>
                <p>{item.text}</p>
                <div className="tags">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <span className="research-arrow">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section projects-section" id="projects">
        <div className="section-heading dark">
          <div>
            <div className="section-kicker">
              <span>03</span> FEATURED PROJECTS
            </div>
            <h2>代表项目</h2>
          </div>
          <p>
            让研究成果被看见，
            <br />
            也让系统能力可以被理解。
          </p>
        </div>

        <div className="project-portfolio">
          {projects[0] && (
            <a className="featured-project" href={projects[0].href}>
              <div className="featured-project-media">
                <img
                  src={projects[0].heroImage}
                  alt={`${projects[0].title}项目封面`}
                />
                <span className="project-index">PROJECT {projects[0].number}</span>
              </div>
              <div className="featured-project-copy">
                <div>
                  <span className="project-status">
                    <i /> {projects[0].status}
                  </span>
                  <p className="project-eyebrow">{projects[0].english}</p>
                  <h3>{projects[0].title}</h3>
                  <p>{projects[0].summary}</p>
                </div>
                <div className="project-tags">
                  {projects[0].tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="project-enter">
                  查看项目详情 <span>↗</span>
                </div>
              </div>
            </a>
          )}

          <div className="project-card-grid">
            {projects.slice(1).map((project) => (
              <a
                className={`project-card ${
                  project.slug.includes("heating")
                    ? "project-card-heating"
                    : "project-card-wind"
                }`}
                href={project.href}
                key={project.slug}
              >
                <div className="project-card-media">
                  <img
                    src={project.heroImage}
                    alt={`${project.title}项目封面`}
                  />
                  <span>PROJECT {project.number}</span>
                </div>
                <div className="project-card-copy">
                  <p>{project.english}</p>
                  <h3>{project.title}</h3>
                  <p className="project-card-summary">{project.summary}</p>
                  <div>
                    {project.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <b>查看项目详情 ↗</b>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section faculty-section" id="people">
        <div className="section-heading dark">
          <div>
            <div className="section-kicker">
              <span>04</span> PRINCIPAL INVESTIGATOR
            </div>
            <h2>导师介绍</h2>
          </div>
          <p>
            以长期问题为坐标，
            <br />
            与学生一起把研究做深、做实。
          </p>
        </div>

        <div className="faculty-grid">
          <div className="faculty-photo">
            <img src={maLePortrait} alt="东北电力大学自动化工程学院马乐老师" />
            <span>MA LE · PRINCIPAL INVESTIGATOR</span>
          </div>
          <div className="faculty-profile">
            <div className="role-pill">课题组负责人</div>
            <h3>马 乐</h3>
            <p className="faculty-title">
              博士 · 副教授 · 硕士生导师
              <br />
              电力设备智能检测与诊断技术研究所所长
            </p>
            <p>
              IEEE、CCF 会员，吉林人工智能产业研究院委员，清华大学 AI
              研究院合作导师，沈阳工业大学博士生导师。长期从事智能机器人、
              人工智能与控制、计算机视觉工业应用及智能新能源电力设备研究。
            </p>
            <div className="faculty-facts">
              <div>
                <strong>2014—今</strong>
                <span>东北电力大学任教</span>
              </div>
              <div>
                <strong>2024</strong>
                <span>科技进步二等奖</span>
              </div>
              <div>
                <strong>IEEE · CCF</strong>
                <span>专业学会会员</span>
              </div>
            </div>
            <a
              className="underlined-link"
              href="https://auto.neepu.edu.cn/info/1532/15345.htm"
              target="_blank"
              rel="noreferrer"
            >
              查看完整履历与成果 <span>↗</span>
            </a>
          </div>
        </div>
        {members.length > 0 && (
          <div className="team-members-block">
            <div className="team-members-heading">
              <span>TEAM MEMBERS</span>
              <h3>团队成员</h3>
            </div>
            <div className="people-grid">
              {members.map((member) => (
                <article className="member-card" key={member.name}>
                  <div className="member-photo">
                    {member.image ? (
                      <img src={member.image} alt={member.name} />
                    ) : (
                      <span>{member.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <small>{member.role}</small>
                  <h4>{member.name}</h4>
                  <p>{member.research}</p>
                  {member.bio && <p className="member-bio">{member.bio}</p>}
                  {member.link && (
                    <a href={member.link} target="_blank" rel="noreferrer">
                      查看个人主页 ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="section publications" id="publications">
        <div className="section-heading dark">
          <div>
            <div className="section-kicker">
              <span>05</span> SELECTED PUBLICATIONS
            </div>
            <h2>代表性成果</h2>
          </div>
          <a
            className="underlined-link"
            href="https://auto.neepu.edu.cn/info/1532/15345.htm"
            target="_blank"
            rel="noreferrer"
          >
            查看完整论文列表 <span>↗</span>
          </a>
        </div>
        <div className="paper-list">
          {publications.map((paper) => (
            <article key={paper.title}>
              <div className="paper-meta">
                <strong>{paper.year}</strong>
                <span>{paper.journal}</span>
              </div>
              <div>
                <h3>{paper.title}</h3>
                <p>{paper.authors}</p>
              </div>
              <span className="paper-arrow">↗</span>
            </article>
          ))}
        </div>
        <p className="source-note">
          论文与科研数据依据东北电力大学自动化工程学院教师主页整理。
        </p>
      </section>

      <section className="section news-section" id="news">
        <div className="section-heading dark">
          <div>
            <div className="section-kicker">
              <span>06</span> RESEARCH HIGHLIGHTS
            </div>
            <h2>科研动态</h2>
          </div>
          <p>记录课题、成果与工程实践的持续进展。</p>
        </div>
        <div className="news-grid">
          <div className="news-feature">
            <div className="feature-pattern">
              <span>
                ROBOT
                <br />
                VISION
                <br />
                ENERGY
              </span>
            </div>
            <div>
              <span className="news-label">研究主线</span>
              <h3>智能机器人 × 电力能源场景</h3>
              <p>
                从实验室算法到现场系统，在感知、决策、控制和工程实现之间建立完整研究链路。
              </p>
            </div>
          </div>
          <div className="timeline">
            {timeline.map((item) => (
              <article key={`${item.year}-${item.title}`}>
                <div>
                  <strong>{item.year}</strong>
                  <span>{item.type}</span>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <span>→</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="contact" id="contact">
        <div>
          <div className="section-kicker light">
            <span>07</span> JOIN US
          </div>
          <h2>
            与我们一起，
            <br />
            让智能走进真实现场。
          </h2>
        </div>
        <div className="contact-copy">
          <p>
            {textValue(
              homeSettings,
              "contactText",
              "欢迎对智能机器人、人工智能与控制、计算机视觉及智慧能源感兴趣的同学联系课题组。",
            )}
          </p>
          <a
            className="button button-light"
            href={`mailto:${textValue(
              homeSettings,
              "contactEmail",
              "male_robot_nedu@sina.com",
            )}`}
          >
            联系马老师 <span>↗</span>
          </a>
          <small>
            {textValue(
              homeSettings,
              "contactEmail",
              "male_robot_nedu@sina.com",
            )}
            <br />
            吉林省吉林市长春路 169 号 · 东北电力大学自动化工程学院
          </small>
        </div>
      </section>

      <footer>
        <Brand footer />
        <p>© 2026 MA LAB · NORTHEAST ELECTRIC POWER UNIVERSITY</p>
        <div>
          <a href="#research">研究</a>
          <a href="#projects">项目</a>
          <a href="#people">导师</a>
          <a href="#publications">成果</a>
          <a href="/admin">管理</a>
        </div>
      </footer>
    </main>
  );
}
