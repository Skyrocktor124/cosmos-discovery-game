# EU SME Centre — 机构档案（所有 skill 的共享背景）

> 所有 training-coordinator 相关 skill 在开始工作前必须先读这份文件。
> 如内容与实际不符，请用户直接修改本文件——它是唯一的机构背景来源（single source of truth）。

## 机构背景

- **机构**：EU SME Centre（欧盟中小企业中心），欧盟资助项目，总部位于北京，由中国欧盟商会（European Union Chamber of Commerce in China）牵头的联合体运营，目前处于第五期（Phase V）。
- **使命**：帮助欧盟及 COSME 参与国的中小企业进入和拓展中国市场。
- **服务**：business advice（法律、市场准入、税务、标准合规咨询）、trainings & webinars、知识中心（报告和指南）、与成员国商会及 Enterprise Europe Network (EEN) 的合作活动。
- **官网**：https://www.eusmecentre.org.cn

## 目标受众（写所有文档时的默认设定）

- **核心画像**：对中国市场**毫无或极少经验**的 EU SMEs——首次考虑对华出口/进入中国的中小企业主、出口经理、国际业务负责人。
- **认知水平**：不了解中国监管体系、商业文化、渠道结构；容易被术语劝退。所有内容必须从零讲起、实操导向、避免行话，必要时给出 step-by-step。
- **典型痛点**：不知道从哪开始、怕合规风险、找不到可信的本地伙伴、不了解认证/清关/税务、跨文化谈判没底。

## 活动惯例

- **线上 webinar**：60–90 分钟，通常 Zoom；结构 = 开场（Centre 介绍 + housekeeping）→ 1–3 位讲者演讲 → Q&A → 结尾（调查问卷 + 服务推广）。多与成员国商会、EEN 伙伴、行业协会合办。
- **线下 workshop/training**：半天或全天，在欧洲成员国城市或中国举办；含互动环节、案例讨论、networking。
- **语言**：活动和文档以英文为主。

## 文档口吻

- 正式产出（ToR、主持词、speaker briefing、对外文案）：**英文**，专业、务实、行动导向；以 EU SME Centre 的机构口吻（"the Centre", "we"）。
- 与协调员（用户）的讨论、确认、过程说明：**中文**。

## 每次活动的工作文件夹

每个活动在 `training-coordinator/events/` 下建一个文件夹，命名 `YYYY-MM-主题短名`（如 `2026-09-food-export-basics`），流程各阶段产出按以下文件名存放，后续阶段的 skill 自动读取前面阶段的产出：

| 文件 | 产出者 |
|---|---|
| `01-topic.md` | /topic |
| `02-benchmark.md` | /benchmark |
| `03-tor.md` | /tor |
| `04-speakers.md` | /speakers |
| `05-event-plan.md` | /event-plan |
| `06-script.md` + `speaker-briefings/` | /script |

如果当前会话没有明确活动文件夹，skill 应先列出 `training-coordinator/events/` 下现有文件夹让用户选择或新建。

## 讲者硬性规则

1. **绝不推荐 EU SME Centre 已经用过的讲者。** 核查方法见 `/speakers` skill 和 `speakers-exclusion-list.md`。
2. 每位候选讲者必须附 **LinkedIn 个人主页链接**（用户明确要求）。
3. 活动结束后，把实际使用的讲者加入 `speakers-exclusion-list.md`。
