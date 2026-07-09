# EU SME Centre — 机构档案（所有 skill 的共享背景）

> 所有 training-coordinator 相关 skill 在开始工作前必须先读这份文件。
> 如内容与实际不符，请用户直接修改本文件——它是唯一的机构背景来源（single source of truth）。

## 机构背景

- **机构**：EU SME Centre（欧盟中小企业中心），欧盟资助项目，2010 年成立，总部位于北京，已完成四期项目，现处于第五期（Phase V）。
- **联合体**：四个 consortium partners——European Union Chamber of Commerce in China (EUCCC)、China-Italian Chamber of Commerce (CICC)、Italy China Council Foundation、SPI；两个 associated partners——Trade Promotion Europe、EU-China Business Association。活动常与其中一家合办（ToR 中的 Implementing partner）。
- **使命**：帮助 EU Member States 及 Single Market Programme 参与国的中小企业进入和拓展中国市场（注意固定表述是 "SMEs from EU Member States and countries participating in the Single Market Programme"，不再用 COSME）。
- **五项免费服务**（主持词固定话术，全文见 moderator-script-template.md）：① self-diagnosis tool ② knowledge resources（报告、指南、案例）③ free expert advice（Ask-the-Expert）④ training programmes ⑤ advocacy work。
- **协调员（用户）**：Keyu，Training Coordinator，主持词自我介绍用 "I'm Keyu, Training Coordinator from the EU SME Centre."
- **官网**：https://www.eusmecentre.org.cn

## 目标受众（写所有文档时的默认设定）

- **核心画像**：对中国市场**毫无或极少经验**的 EU SMEs——首次考虑对华出口/进入中国的中小企业主、出口经理、国际业务负责人。
- **认知水平**：不了解中国监管体系、商业文化、渠道结构；容易被术语劝退。所有内容必须从零讲起、实操导向、避免行话，必要时给出 step-by-step。
- **典型痛点**：不知道从哪开始、怕合规风险、找不到可信的本地伙伴、不了解认证/清关/税务、跨文化谈判没底。

## 活动惯例

- **形式**：线上 webinar（约 90 分钟，单讲者居多）和 hybrid 活动（线上+北京线下，可含双讲者+panel discussion）。ToR 的 Activity Number 按格式区分（如 webinar A22203 / hybrid A23206，以最新编号体系为准）。
- **活动常成系列**：如 China Consumer series（按消费人群分场：active retirees、Gen Y、Gen Z…）、CBEC 跨境电商 series。选题时优先考虑能否归入或开启一个系列。
- **标准流程**（主持词固定骨架，详见 moderator-script-template.md）：Welcome → 活动介绍 → Centre 五项服务介绍 → 下期活动预告 → 讲者介绍与交接 → 演讲 →（panel）→ 反馈问卷 QR → Q&A（含备好的 prepared questions）→ 收尾（takeaway + 相关 Centre 报告推广）。
- **免费活动**，固定句式 "This free event will be held in English. It is open to all interested SMEs from EU Member States and countries participating in the Single Market Programme."
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
| `index-of-issues.md` + `speaker-briefings/` + `06-script.md` | /script |

如果当前会话没有明确活动文件夹，skill 应先列出 `training-coordinator/events/` 下现有文件夹让用户选择或新建。

## 讲者硬性规则

1. **绝不推荐 EU SME Centre 已经用过的讲者。** 核查方法见 `/speakers` skill 和 `speakers-exclusion-list.md`。
2. 每位候选讲者必须附 **LinkedIn 个人主页链接**（用户明确要求）。
3. 活动结束后，把实际使用的讲者加入 `speakers-exclusion-list.md`。
