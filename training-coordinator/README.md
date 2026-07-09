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

- `centre-profile.md` — 机构背景、受众定义、口吻规则。**所有 skill 的共享设定，信息有变直接改这个文件。**
- `speakers-exclusion-list.md` — 讲者排除名单，持续追加。
- `templates/` — ToR、主持词、speaker briefing 模板。
- `events/` — 每个活动一个文件夹（`YYYY-MM-主题短名/`），存放 `01-topic.md` 到 `06-script.md` 的各阶段产出，后续阶段自动读取前面的产出。

## ⚠️ 待办：替换占位模板

`templates/tor-template.md` 和 `templates/moderator-script-template.md` 目前是按行业惯例内置的**占位版**。请把你过往的真实 ToR 和主持词范例发给 Claude（对话中粘贴或上传均可），让它替换成你的实际格式和惯用句式，效果会好得多。替换后删除模板顶部的占位警告。
