# EU SME Centre Training Coordinator 工作系统

六个 skill 覆盖培训活动全流程，按顺序使用（也可单独跳入任一阶段）：

| 顺序 | 命令 | 干什么 |
|---|---|---|
| 1 | `/topic` | 选题：为零经验 EU SMEs 生成中国 business 培训选题 |
| 2 | `/benchmark` | 调研其他机构的相似活动，找可借鉴点和差异化 |
| 3 | `/tor` | 按模板写英文 Terms of Reference |
| 4 | `/speakers` | 联网找讲者（附 LinkedIn），自动排除 Centre 用过的人 |
| 5 | `/event-plan` | 线上/线下执行清单 + 当天 run sheet |
| 6 | `/script` | 讲者内容预测、重叠检查、speaker briefing、全流程英文主持词 |

## 目录说明

- `centre-profile.md` — 机构背景、受众定义、口吻规则、活动惯例。**所有 skill 的共享设定，信息有变直接改这个文件。**
- `speakers-exclusion-list.md` — 讲者排除名单，持续追加。
- `templates/` — 四个模板，均从协调员的真实文档提炼：ToR、主持词、index of issues（讲者内容预测）、speaker briefing。
- `reference-examples/` — 协调员提供的真实范例原文（Gen Y ToR 和主持词、Risk Mitigation hybrid 主持词、Debt Collection index of issues）。**写正式产出前先读对应范例，模仿其语气和颗粒度。**
- `events/` — 每个活动一个文件夹（`YYYY-MM-主题短名/`），存放 `01-topic.md` 到 `06-script.md` 的各阶段产出，后续阶段自动读取前面的产出。

## 维护提示

- 新的好范例（办完活动后的定稿主持词、ToR）随时补进 `reference-examples/`，模板与实际做法脱节时让 Claude 对照更新模板。
- 每次活动结束后：把实际讲者加进 `speakers-exclusion-list.md`。
