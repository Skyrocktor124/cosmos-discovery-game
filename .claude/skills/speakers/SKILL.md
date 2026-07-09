---
name: speakers
description: 找讲者。联网搜索候选讲者（附 LinkedIn），核查排除 EU SME Centre 用过的人。Use when the user asks to find/recommend speakers, 找讲者, speaker candidates for an EU SME Centre event.
---

# /speakers — 讲者搜寻与核查

先读 `training-coordinator/centre-profile.md` 和 `training-coordinator/speakers-exclusion-list.md`。与用户讨论用中文，讲者档案用英文。

## 硬性规则

1. **绝不推荐 EU SME Centre 用过的讲者。** 每个候选人都必须通过双重核查（见下），核查不通过或无法核实的要明确标注。
2. **每位候选人必须附 LinkedIn 个人主页链接**（用户明确要求）。搜 `site:linkedin.com/in <姓名> <机构>` 定位；确实找不到 LinkedIn 的候选人默认放弃，除非其他方面极其出色（此时明确标注 "LinkedIn not found" 并给官网个人页）。
3. Centre 现任员工不算外部讲者，不要推荐。

## 流程

1. **确定讲者画像**：读当前活动文件夹的 `03-tor.md`（尤其 Speaker Requirements 和 Scope）；没有 ToR 就问用户主题和期望的讲者类型。

2. **搜寻候选人**（WebSearch + WebFetch），来源方向：
   - `02-benchmark.md` 里记录的同行活动讲者
   - 商会/贸促机构的 China desk 负责人、律所/会计所/咨询公司的中国业务合伙人
   - 有对华出口实战经验的 SME 创始人/高管（practitioner 视角对零经验受众最有说服力）
   - 行业协会专家、有实务背景的学者
   - 在 LinkedIn、行业媒体上活跃发表中国市场内容的专业人士

3. **逐人双重核查**（每个候选人都要做，缺一不可）：
   - **本地名单**：对照 `speakers-exclusion-list.md`
   - **联网核查**：搜 `site:eusmecentre.org.cn "<姓名>"` 和 `"EU SME Centre" "<姓名>"`；在 Centre 活动/报告中出现过即排除
   - 核查中发现的"Centre 用过但名单里没有"的人，**立即按格式追加进 `speakers-exclusion-list.md`**

4. **产出 `04-speakers.md`** 写入当前活动文件夹，推荐 5–8 人按匹配度排序，每人一张英文档案卡：
   - Name, title, organisation, location
   - **LinkedIn URL**
   - Relevance：与本次主题的匹配点；对零经验受众的价值
   - Evidence：公开演讲/文章/项目经历（附链接）
   - Exclusion check：`PASSED (checked local list + web, YYYY-MM-DD)` 或具体问题
   - Language & availability notes、建议的邀请切入点
   - 如涉及付费嫌疑（咨询公司借台推销），标注风险

5. **用户确认最终人选后**：在 `04-speakers.md` 顶部记录确认结果，并提醒：活动结束后要把实际使用的讲者加入排除名单。

## 注意

- LinkedIn 页面经常无法直接抓取（登录墙），链接的真实性以搜索结果摘要为准，标注"未能打开验证"的情况。
- 宁缺毋滥：凑不够 5 人就如实说明，并建议放宽的方向让用户决定。
