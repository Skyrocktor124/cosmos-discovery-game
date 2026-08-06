# 提示词手册(交互电子小册子)

`index.html` 是一个**完整的单文件网页应用**:没有 CDN、没有框架、没有构建步骤、
不发任何网络请求。双击就能打开,发给粉丝就能用,断网也能用。

## 功能

- 实时搜索(标题 / 场景 / 标签 / 分类 / 提示词正文,空格分隔多关键词)
- 分类标签横滑筛选
- 卡片展开 / 收起
- 一键复制提示词(带 `file://` 与微信内置浏览器的降级方案)
- 一键导出离线 HTML(把整本手册存成一个文件)
- 深 / 浅色主题切换,选择记在本地
- 移动优先,375px 到大屏都不出现横向滚动

## 怎么换成你自己的提示词

打开 `index.html`,找到 `<script id="app-script">` 开头的**内容区**,只改这两个数组:

```js
var CATEGORIES = [
  { id: 'content', name: '内容创作', icon: 'pen' },   // icon 可选:
  ...                                                 // pen / trend / zap / bulb / code / layers
];

var PROMPTS = [
  {
    cat: 'content',              // 必须等于上面某个分类的 id
    title: '中文标题',
    en: 'English Title',
    desc: '一句话说清它能干什么',
    tags: ['标签1', '标签2'],
    tip: '用法提示(可留空)',
    prompt: `英文 system prompt 原文,一字不改`
  },
  ...
];
```

其余部分不用动:分类标签、数量统计、搜索索引都是从这两个数组自动生成的。
分类可以多于或少于 5 个,提示词也可以多于或少于 10 条。

注意:`prompt` 用反引号包裹,所以正文里不能出现反引号 `` ` `` 和 `${`。

## 部署

- **直接发文件**:把 `index.html` 改个名发给粉丝即可。
- **发链接**:已接入本仓库的构建,推到 `main` 后自动发布到
  `https://skyrocktor124.github.io/cosmos-discovery-game/booklet/`
- **其他静态托管**:上传这一个文件到任何地方都行(Netlify / Vercel / 对象存储)。

## 已知边界

- 导出的文件名固定为 ASCII(`prompt-booklet-v1.0.html`)——Chromium 会直接丢弃
  含中文的 `download` 属性,结果是一个没有扩展名、粉丝打不开的 `download` 文件。
- 微信 / 抖音内置浏览器通常不允许网页触发下载。在那里「导出离线版」可能无效,
  「复制提示词」则有 `execCommand` 降级方案,是可用的。
