---
name: script
description: 讲者内容预测 + 全流程主持词。预测各讲者演讲要点、检查内容重叠、生成 speaker briefing 和完整英文 moderator script。Use when the user asks for a moderator script, 主持词, speaker briefing, or content prediction for an EU SME Centre event.
---

# /script — 内容预测与主持词

先读 `training-coordinator/centre-profile.md` 和三个模板：`templates/index-of-issues-template.md`、`templates/moderator-script-template.md`、`templates/speaker-briefing-template.md`（均在 `training-coordinator/` 下）。动笔前再读 `training-coordinator/reference-examples/` 里对应形式的真实范例，模仿其语气和颗粒度。与用户讨论用中文，所有产出全英文。

## 流程

读当前活动文件夹的 `03-tor.md` 和 `04-speakers.md`（缺失就先问用户要活动信息和确认的讲者名单）。然后依次完成四步：

### Step 1 — 讲者内容预测（Index of Issues）

对每位确认讲者，用 WebSearch/WebFetch 调研其公开痕迹（过往演讲、文章、公司业务重点、LinkedIn 动态），结合 ToR 分配给 TA 的议题，按 `index-of-issues-template.md` 产出 **Index of Issues** 文档，写入活动文件夹 `index-of-issues.md`：
- 内容拆成 4–6 个编号模块，沿一条逻辑主线（时间线/认知→行动），末尾固定 Final observations + Q&A
- 要点具体到工具名/法条/平台/数据的程度，配 [Speaker Note:] 说明叙事逻辑和易混淆点
- Observations 提炼成可直接喂给主持词 recap 的行动建议
- 分讲者 Q&A 备题（4–7 题/人，具体场景 + 零经验痛点 + 可操作答案空间）

### Step 2 — 重叠与跑题检查

- 做一张 **overlap matrix**：行=讲者，列=ToR 内容模块，标出每人预计覆盖范围
- 指出：内容重叠风险点、无人覆盖的 ToR 承诺内容、跑题风险（尤其咨询公司讲者借台推销的风险）
- 每个风险给出处理建议（在 briefing 中划界、调整议程顺序、或主持词中补位）

### Step 3 — Speaker briefings

按 `speaker-briefing-template.md` 为每位讲者生成一份英文 briefing，写入活动文件夹 `speaker-briefings/<speaker-name>.md`。"What we'd like you to cover" 和 "Coordination with other speakers" 两节必须体现 Step 1/2 的结论，明确划清与其他讲者的边界。

### Step 4 — 全流程主持词

按 `moderator-script-template.md` 生成完整英文 moderator script，写入 `06-script.md`：
- 开场、活动介绍、Centre 五项服务固定话术、下期预告，全部按模板惯例（按 webinar/hybrid 选完整版或精简版 Centre 介绍）
- 每位讲者的 intro（从 04-speakers.md 的档案提炼 2–3 句资历 + "Today, X will share..." 三个具体内容点，交接用 "the floor is yours!"）
- **"After the speaker finishes" 小结和串场词基于 index of issues 的预测起草**，把讲者内容翻译成对 EU SMEs 的行动含义
- Prepared questions 直接取自 index of issues 的 Q&A 备题，外加固定收尾问题（"one key message for European SMEs"）
- Q&A 管理句式（宽泛/超时/跑题/最后几分钟）按模板保留
- 结尾：核心 takeaway、相关 Centre 报告推广、感谢与下期预告

产出后用中文提示用户：主持词里预测性内容在收到讲者真实 slides 后需要校对一遍（列出具体哪些段落依赖预测）。

## 注意

- 时间轴必须与 ToR 议程一致；如 ToR 已改版，以最新版为准并指出差异。
