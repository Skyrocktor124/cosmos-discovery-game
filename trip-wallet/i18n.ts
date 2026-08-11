// Two languages, one flat dictionary. The audience is people travelling in
// Europe with a phone set to their home language, so the default follows
// navigator.language and can be overridden in settings.

const en = {
  'app.name': 'Wanderpass',
  'app.tagline': 'Every ticket for the trip, in one place, offline.',

  'nav.upcoming': 'Upcoming',
  'nav.all': 'All',
  'nav.used': 'Used',
  'nav.settings': 'Settings',

  'empty.title': 'No tickets yet',
  'empty.body': 'Add the PDFs and screenshots you got by email. They stay on this phone — nothing is uploaded.',
  'empty.cta': 'Add your first ticket',
  'empty.sample': 'See how it looks with sample tickets',
  'empty.sampleNote': 'Sample ticket — delete it once your own are in.',
  'empty.filtered': 'Nothing here yet.',

  'add.title': 'Add a ticket',
  'add.file': 'Import PDF or image',
  'add.fileHint': 'The voucher from GetYourGuide, Tiqets, a museum, a rail operator…',
  'add.camera': 'Scan with camera',
  'add.cameraHint': 'A paper ticket, or a code on someone else’s screen',
  'add.manual': 'Enter by hand',
  'add.manualHint': 'A reservation with no barcode',

  'import.render': 'Opening the file…',
  'import.scan': 'Looking for the code…',
  'import.read': 'Reading the details…',
  'import.failed': 'Could not read that file. You can still add it by hand.',
  'import.noCode': 'No barcode found — the ticket page is saved as-is.',

  'review.title': 'Check the details',
  'review.guessed': 'guessed',
  'review.guessedNote': 'Fields marked “guessed” were read off the ticket automatically. Worth a glance.',

  'field.title': 'What',
  'field.kind': 'Type',
  'field.date': 'Date',
  'field.time': 'Time',
  'field.venue': 'Where',
  'field.city': 'City',
  'field.code': 'Booking reference',
  'field.party': 'Who',
  'field.notes': 'Notes',
  'field.titlePlaceholder': 'Uffizi Gallery — timed entry',

  'kind.museum': 'Museum',
  'kind.tour': 'Tour',
  'kind.transport': 'Transport',
  'kind.flight': 'Flight',
  'kind.stay': 'Stay',
  'kind.show': 'Show',
  'kind.other': 'Other',

  'day.today': 'Today',
  'day.tomorrow': 'Tomorrow',
  'day.yesterday': 'Yesterday',
  'day.undated': 'No date',

  'detail.showFull': 'Full ticket',
  'detail.showCode': 'Code',
  'detail.markUsed': 'Mark as used',
  'detail.markUnused': 'Mark as unused',
  'detail.brightness': 'Turn your screen brightness up before you reach the reader.',
  'detail.noCode': 'No barcode on this ticket.',
  'detail.copyCode': 'Copy reference',
  'detail.copied': 'Copied',
  'detail.usedOn': 'Used',
  'detail.openLink': 'Open link',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.storage': 'Stored on this device',
  'settings.export': 'Export backup',
  'settings.exportHint': 'One file with every ticket and image. Keep it somewhere safe.',
  'settings.import': 'Restore backup',
  'settings.clear': 'Delete everything',
  'settings.clearConfirm': 'Delete all tickets and images from this device?',
  'settings.persist': 'Protect from automatic cleanup',
  'settings.persisted': 'Protected',
  'settings.install': 'Add to home screen',
  'settings.installHint': 'Then it opens like an app and works with no signal.',
  'settings.privacyTitle': 'Where your tickets live',
  'settings.privacy': 'Everything is stored in this browser on this device. There is no account, no server and no analytics — the app makes no network requests at all after it loads.',
  'settings.offline': 'Ready offline',
  'settings.offlineNo': 'Caching for offline…',

  'scanner.title': 'Scan a code',
  'scanner.hint': 'Hold the code inside the frame.',
  'scanner.denied': 'Camera unavailable. Check the permission in your browser settings.',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.edit': 'Edit',
  'common.done': 'Done',
  'common.deleteConfirm': 'Delete this ticket?',
};

export type Key = keyof typeof en;

const zh: Record<Key, string> = {
  'app.name': 'Wanderpass 随行票夹',
  'app.tagline': '这趟旅行的所有门票,一处收齐,离线可用。',

  'nav.upcoming': '即将使用',
  'nav.all': '全部',
  'nav.used': '已使用',
  'nav.settings': '设置',

  'empty.title': '还没有票',
  'empty.body': '把邮件里收到的 PDF 和截图加进来。它们只存在这台手机上,不会上传到任何地方。',
  'empty.cta': '添加第一张票',
  'empty.sample': '先看看示例效果',
  'empty.sampleNote': '这是示例门票,加进自己的票之后可以删掉。',
  'empty.filtered': '这里还没有内容。',

  'add.title': '添加门票',
  'add.file': '导入 PDF 或图片',
  'add.fileHint': 'GetYourGuide、Tiqets、博物馆官网、铁路公司发来的凭证',
  'add.camera': '用相机扫码',
  'add.cameraHint': '纸质票,或者别人屏幕上的二维码',
  'add.manual': '手动填写',
  'add.manualHint': '没有条码的预订',

  'import.render': '正在打开文件…',
  'import.scan': '正在寻找条码…',
  'import.read': '正在读取信息…',
  'import.failed': '这个文件读不出来,可以改用手动填写。',
  'import.noCode': '没找到条码,已原样保存整页票面。',

  'review.title': '核对信息',
  'review.guessed': '自动识别',
  'review.guessedNote': '标着「自动识别」的字段是从票面上读出来的,建议扫一眼再保存。',

  'field.title': '项目',
  'field.kind': '类型',
  'field.date': '日期',
  'field.time': '时间',
  'field.venue': '地点',
  'field.city': '城市',
  'field.code': '预订编号',
  'field.party': '人数',
  'field.notes': '备注',
  'field.titlePlaceholder': '乌菲齐美术馆 — 预约入场',

  'kind.museum': '博物馆',
  'kind.tour': '导览',
  'kind.transport': '交通',
  'kind.flight': '航班',
  'kind.stay': '住宿',
  'kind.show': '演出',
  'kind.other': '其他',

  'day.today': '今天',
  'day.tomorrow': '明天',
  'day.yesterday': '昨天',
  'day.undated': '未填日期',

  'detail.showFull': '完整票面',
  'detail.showCode': '条码',
  'detail.markUsed': '标记为已使用',
  'detail.markUnused': '标记为未使用',
  'detail.brightness': '走到闸机前记得先把屏幕亮度调到最大。',
  'detail.noCode': '这张票没有条码。',
  'detail.copyCode': '复制编号',
  'detail.copied': '已复制',
  'detail.usedOn': '已使用',
  'detail.openLink': '打开链接',

  'settings.title': '设置',
  'settings.language': '语言',
  'settings.storage': '本机已占用',
  'settings.export': '导出备份',
  'settings.exportHint': '一个文件,包含全部门票和图片,存到安全的地方。',
  'settings.import': '恢复备份',
  'settings.clear': '清空全部数据',
  'settings.clearConfirm': '确定要删除本机上的所有门票和图片吗?',
  'settings.persist': '防止被系统自动清理',
  'settings.persisted': '已受保护',
  'settings.install': '添加到主屏幕',
  'settings.installHint': '之后就能像 App 一样打开,没有信号也能用。',
  'settings.privacyTitle': '你的票存在哪里',
  'settings.privacy': '所有内容都存在这台设备的浏览器里。没有账号、没有服务器、没有统计代码——页面加载完之后,这个应用不会发出任何网络请求。',
  'settings.offline': '离线可用',
  'settings.offlineNo': '正在缓存以便离线使用…',

  'scanner.title': '扫描条码',
  'scanner.hint': '把条码对准取景框。',
  'scanner.denied': '无法使用相机,请到浏览器设置里检查权限。',

  'common.save': '保存',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.close': '关闭',
  'common.back': '返回',
  'common.edit': '编辑',
  'common.done': '完成',
  'common.deleteConfirm': '确定删除这张票?',
};

export type Lang = 'en' | 'zh';

const DICTS: Record<Lang, Record<Key, string>> = { en, zh };

export const LOCALES: Record<Lang, string> = { en: 'en-GB', zh: 'zh-CN' };

const LANG_KEY = 'wanderpass-lang';

export const detectLang = (): Lang => {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    // Private mode with storage blocked — fall through to the browser locale.
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export const saveLang = (lang: Lang): void => {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Not fatal: the choice just will not survive a reload.
  }
};

export const translator = (lang: Lang) => (key: Key): string => DICTS[lang][key];
