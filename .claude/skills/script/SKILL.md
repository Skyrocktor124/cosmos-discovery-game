---
name: script
description: 讲者内容预测 + 全流程主持词。预测各讲者演讲要点、检查内容重叠、生成 speaker briefing 和完整英文 moderator script。Use when the user asks for a moderator script, 主持词, speaker briefing, or content prediction for an EU SME Centre event.
---

# /script — 内容预测与主持词

先读 `training-coordinator/centre-profile.md`、模板 `training-coordinator/templates/moderator-script-template.md` 和 `training-coordinator/templates/speaker-briefing-template.md`。与用户讨论用中文，所有产出全英文。

## 流程

读当前活动文件夹的 `03-tor.md` 和 `04-speakers.md`（缺失就先问用户要活动信息和确认的讲者名单）。然后依次完成四步：

### Step 1 — 讲者内容预测

对每位确认讲者，用 WebSearch/WebFetch 调研其公开痕迹（过往演讲、文章、公司业务重点、LinkedIn 动态），结合 ToR 分配给 TA 的议题，预测：
- 4–6 个最可能讲的要点（predicted key points）
- 可能使用的案例/数据类型
- 风格预判（偏理论/偏实操、语速、是否可能超时——有据可查才写）

### Step 2 — 重叠与跑题检查

- 做一张 **overlap matrix**：行=讲者，列=ToR 内容模块，标出每人预计覆盖范围
- 指出：内容重叠风险点、无人覆盖的 ToR 承诺内容、跑题风险（尤其咨询公司讲者借台推销的风险）
- 每个风险给出处理建议（在 briefing 中划界、调整议程顺序、或主持词中补位）

### Step 3 — Speaker briefings

按 `speaker-briefing-template.md` 为每位讲者生成一份英文 briefing，写入活动文件夹 `speaker-briefings/<speaker-name>.md`。"What we'd like you to cover" 和 "Coordination with other speakers" 两节必须体现 Step 1/2 的结论，明确划清与其他讲者的边界。

### Step 4 — 全流程主持词

按 `moderator-script-template.md` 生成完整英文 moderator script，写入 `06-script.md`：
- 开场、housekeeping、Centre 介绍按模板惯例
- 每位讲者的 intro（从 04-speakers.md 的档案提炼 2–3 句，突出对华资历）
- **串场词引用 Step 1 预测的要点**（"Thank you X for walking us through..."），让衔接听起来自然
- 每位讲者准备 2–3 个 seed questions（站在零经验 SME 的视角提问），加一个面向全体的收尾问题
- 结尾：recap 要点、问卷、Centre 服务推广、下期预告位
- Contingency notes 按模板保留

产出后用中文提示用户：主持词里预测性内容在收到讲者真实 slides 后需要校对一遍（列出具体哪些段落依赖预测）。

## 注意

- 模板当前是占位版；如占位警告还在，提醒用户提供过往真实主持词范例来替换（提醒一次即可，不阻塞产出）。
- 时间轴必须与 ToR 议程一致；如 ToR 已改版，以最新版为准并指出差异。
