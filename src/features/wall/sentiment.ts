export type Sentiment = "positive" | "negative" | "neutral";

const POSITIVE_WORDS = [
  "点赞", "推广", "感谢", "不错", "很好", "挺好", "极好", "真棒", "靠谱",
  "满意", "舒服", "舒适", "幸福", "开心", "暖心", "贴心", "用心", "周到",
  "关怀", "人性化", "科学", "高效", "提效", "提速", "提升", "改善", "优化",
  "优秀", "卓越", "先进", "新颖", "创新", "惊喜", "爆款", "省心", "省时",
  "省力", "节约", "透明", "透明化", "清晰", "明确", "到位", "支持", "赞同",
  "喜欢", "好用", "有用", "实用", "便捷", "方便", "简化", "简单", "顺畅",
  "流畅", "给力", "加油", "积极", "主动", "可靠", "友好", "赞", "好评",
  "推荐", "值得", "棒", "爽", "香", "重视", "尊重", "理解", "平衡", "关照",
  "完善", "安心", "减负", "深度思考",
];

const NEGATIVE_WORDS = [
  "差", "糟", "糟糕", "烂", "差劲", "失望", "失败", "抱怨", "投诉", "反对",
  "质疑", "担忧", "担心", "焦虑", "疑虑", "意见", "问题", "故障", "漏洞",
  "卡顿", "慢", "拖沓", "拖延", "延误", "误工", "效率低", "低效", "无效",
  "浪费", "内耗", "内卷", "摆烂", "黑洞", "职场黑洞", "形式主义", "表演",
  "表演性", "加班", "过劳", "熬夜", "疲惫", "疲劳", "心累", "劳累", "累",
  "苦", "忙", "压榨", "压力", "压抑", "憋屈", "憋", "郁闷", "烦", "烦躁",
  "混乱", "一团糟", "糟心", "心寒", "寒心", "离谱", "过分", "不公", "不平",
  "不满", "不满意", "不合理", "不靠谱", "不方便", "不爽", "不舒服", "不友好",
  "不清晰", "不透明", "不到位", "不完善", "不科学", "缺乏", "不足", "欠缺",
  "难以", "困难", "难", "艰难", "恶心", "吵", "挤", "紧张", "稀缺", "过时",
  "陈旧", "落后", "倒挂", "偏见", "歧视", "边缘", "降低", "消耗", "犯困",
  "困", "积弊", "吐槽", "呼吁", "严重", "坑", "踩坑", "下行",
];

const POSITIVE_SORTED = [...POSITIVE_WORDS].sort((a, b) => b.length - a.length);
const NEGATIVE_SORTED = [...NEGATIVE_WORDS].sort((a, b) => b.length - a.length);

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
}

function countMatches(text: string, words: readonly string[]) {
  let remaining = text;
  let hits = 0;

  for (const word of words) {
    if (!word) {
      continue;
    }

    while (remaining.includes(word)) {
      remaining = remaining.replace(word, " ".repeat(word.length));
      hits += 1;
    }
  }

  return { hits, remaining };
}

export function analyzeSentiment(html: string): Sentiment {
  const text = stripHtml(html);

  if (!text.trim()) {
    return "neutral";
  }

  const negativePass = countMatches(text, NEGATIVE_SORTED);
  const positivePass = countMatches(negativePass.remaining, POSITIVE_SORTED);

  if (negativePass.hits > positivePass.hits) {
    return "negative";
  }

  if (positivePass.hits > negativePass.hits) {
    return "positive";
  }

  return "neutral";
}

export const SENTIMENT_STYLE: Record<
  Sentiment,
  { noteClassName: string; tapeClassName: string; label: string; barClassName: string; barTextClassName: string }
> = {
  positive: {
    noteClassName: "bg-[#d7fbdd]",
    tapeClassName: "bg-[#9ed0ff]",
    label: "正向",
    barClassName: "bg-[#32c95a]",
    barTextClassName: "text-white",
  },
  neutral: {
    noteClassName: "bg-[#eef0f2]",
    tapeClassName: "bg-[#d9dde2]",
    label: "中性",
    barClassName: "bg-[#b5bac2]",
    barTextClassName: "text-white",
  },
  negative: {
    noteClassName: "bg-[#ffdfe6]",
    tapeClassName: "bg-[#ffe387]",
    label: "负面",
    barClassName: "bg-[#ff4d7e]",
    barTextClassName: "text-white",
  },
};
