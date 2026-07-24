import type { Achievement, IeltsSection } from "../domain/types";

export type Language = "en" | "zh";

export interface I18nText {
  languageToggle: {
    label: string;
    zh: string;
    en: string;
  };
  sections: Record<IeltsSection, string>;
  summary: {
    dashboardTitle: string;
    localMode: string;
    todayCompletion: string;
    targetBand: string;
    streak: string;
    xp: string;
    levelLabel: string;
    levelValue(level: number): string;
    streakDays(days: number): string;
  };
  navigation: {
    regionLabel: string;
    consoleTitle: string;
    viewLabel(view: string): string;
    viewDescription(view: string): string;
    settings: string;
  };
  overview: {
    title: string;
    description: string;
    todayFocus: string;
    sectionBalance: string;
    recentProgress: string;
    rewardPreview: string;
    openView(viewLabel: string): string;
  };
  shell: {
    sidebarLabel: string;
  };
  checkIn: {
    regionLabel: string;
    title: string;
    allClear: string;
    target: string;
    off: string;
    complete: string;
    incomplete: string;
    actualLabel(label: string): string;
    statusLabel(label: string, state: "off" | "complete" | "incomplete"): string;
    studyTimePending: string;
    pendingStudyTimeProgress: string;
    taskLabels: {
      words: string;
      speakingTopics: string;
      listeningTests: string;
      corpusMinutes: string;
    };
  };
  targets: {
    regionLabel: string;
    title: string;
    description: string;
    localAutoSave: string;
    scoreTargets: string;
    dailyGoals: string;
    totalBand: string;
    sectionBand(section: string): string;
    sectionMinutes(section: string): string;
  };
  timer: {
    regionLabel: string;
    title: string;
    description: string;
    sectionGroupLabel: string;
    plannedMinutes(minutes: number): string;
    readyToRecord(minutes: number): string;
    overtime(minutes: number): string;
    status: {
      idle: string;
      running: string;
      paused: string;
      finished: string;
    };
    buttons: {
      start: string;
      pause: string;
      resume: string;
      endAndRecord: string;
      recordExternalTime: string;
    };
    manualEntry: string;
    manualExternalTime: string;
    manualSection: string;
    manualMinutes: string;
  };
  history: {
    title: string;
    description: string;
    active: string;
    average: string;
    best: string;
    allClearDays: string;
    heatmapLabel: string;
    complete: string;
    dayLabel(date: string, percent: string): string;
    dayDetail(date: string, percent: string): string;
    legendLabel: string;
  };
  rewards: {
    title: string;
    levelValue(level: number): string;
    xpProgressLabel: string;
    latestUnlock: string;
    noUnlocksYet: string;
    unlocked: string;
    locked: string;
    achievementName(id: Achievement["achievementId"], fallback: string): string;
    achievementDescription(id: Achievement["achievementId"], fallback: string): string;
  };
  settings: {
    title: string;
    description: string;
    languageTitle: string;
    languageDescription: string;
    targetsTitle: string;
    storageTitle: string;
    storageDescription: string;
    localStateKey: string;
    languageKey: string;
    cloudReady: string;
  };
  units: {
    band: string;
    words: string;
    topics: string;
    tests: string;
    xp: string;
    minutesShort: string;
  };
}

type AchievementDictionary = Record<string, readonly [string, string]>;

const achievementText: Record<Language, AchievementDictionary> = {
  en: {
    "first-check-in": ["First Check-in", "Record any daily study activity."],
    "all-clear": ["All Clear", "Complete every enabled daily target once."],
    "seven-day-streak": ["7-Day Streak", "Record study progress for seven consecutive days."],
    "fourteen-day-streak": ["14-Day Streak", "Record study progress for fourteen consecutive days."],
    "reading-discipline": ["Reading Discipline", "Record focused reading practice."],
    "listening-builder": ["Listening Builder", "Record listening practice or a listening test."],
    "speaking-starter": ["Speaking Starter", "Record speaking practice or a speaking topic."],
    "writing-keeper": ["Writing Keeper", "Record focused writing practice."],
    "balanced-day": ["Balanced Day", "Study all four IELTS sections in one day."],
    "sixty-day-witness": ["60-Day Witness", "Build a visible history across sixty study days."]
  },
  zh: {
    "first-check-in": ["首次打卡", "记录任意一项今日学习活动。"],
    "all-clear": ["全部完成", "完成当天所有已启用的学习目标。"],
    "seven-day-streak": ["7 天连续学习", "连续七天记录学习进度。"],
    "fourteen-day-streak": ["14 天连续学习", "连续十四天记录学习进度。"],
    "reading-discipline": ["阅读自律", "记录一次专注阅读练习。"],
    "listening-builder": ["听力积累", "记录听力练习或听力套题。"],
    "speaking-starter": ["口语启动", "记录口语练习或口语话题。"],
    "writing-keeper": ["写作坚持", "记录一次专注写作练习。"],
    "balanced-day": ["四科均衡", "当天学习雅思听、说、读、写四个部分。"],
    "sixty-day-witness": ["60 天见证", "建立可见的 60 天学习记录。"]
  }
};

const achievementName =
  (language: Language) => (id: Achievement["achievementId"], fallback: string) =>
    achievementText[language][id]?.[0] ?? fallback;

const achievementDescription =
  (language: Language) => (id: Achievement["achievementId"], fallback: string) =>
    achievementText[language][id]?.[1] ?? fallback;

const navigationText = {
  en: {
    overview: ["Overview", "Today goals, score targets, streak, and study pulse."],
    checkin: ["Check-in", "Record today's core IELTS practice tasks."],
    timer: ["Timer", "Track focused Listening, Speaking, Reading, and Writing time."],
    progress: ["Progress", "Review the latest 60 local study days."],
    rewards: ["Rewards", "Follow XP, levels, and achievement unlocks."],
    settings: ["Settings", "Adjust targets, language, and local data preferences."]
  },
  zh: {
    overview: ["总览", "查看今日目标、分数目标、连续学习和学习状态。"],
    checkin: ["打卡", "记录今天的雅思核心练习任务。"],
    timer: ["计时", "记录听、说、读、写四科专注学习时长。"],
    progress: ["进度", "查看最近 60 天本地学习记录。"],
    rewards: ["奖励", "查看经验值、等级和成就解锁。"],
    settings: ["设置", "调整目标、语言和本地数据偏好。"]
  }
} as const;

const navigationLabel =
  (language: Language) => (view: string) =>
    navigationText[language][view as keyof (typeof navigationText)["en"]]?.[0] ?? view;

const navigationDescription =
  (language: Language) => (view: string) =>
    navigationText[language][view as keyof (typeof navigationText)["en"]]?.[1] ?? "";

export const translations: Record<Language, I18nText> = {
  en: {
    languageToggle: {
      label: "Language",
      zh: "中",
      en: "Eng"
    },
    sections: {
      listening: "Listening",
      speaking: "Speaking",
      reading: "Reading",
      writing: "Writing"
    },
    summary: {
      dashboardTitle: "IELTS Prep Dashboard",
      localMode: "Local mode · cloud-ready schema",
      todayCompletion: "Today completion",
      targetBand: "Target band",
      streak: "Streak",
      xp: "XP",
      levelLabel: "Level",
      levelValue: (level) => `Level ${level}`,
      streakDays: (days) => `${days} ${days === 1 ? "day" : "days"}`
    },
    navigation: {
      regionLabel: "Dashboard sections",
      consoleTitle: "Prep Console",
      viewLabel: navigationLabel("en"),
      viewDescription: navigationDescription("en"),
      settings: "Settings"
    },
    overview: {
      title: "Overview",
      description: "A compact command center for today's IELTS preparation.",
      todayFocus: "Today focus",
      sectionBalance: "Section balance",
      recentProgress: "Recent progress",
      rewardPreview: "Reward preview",
      openView: (viewLabel) => `Open ${viewLabel}`
    },
    shell: {
      sidebarLabel: "Compact dashboard panels"
    },
    checkIn: {
      regionLabel: "Daily Check-In",
      title: "Daily Check-In",
      allClear: "All Clear",
      target: "Target",
      off: "Off",
      complete: "complete",
      incomplete: "incomplete",
      actualLabel: (label) => `${label} actual`,
      statusLabel: (label, state) => `${label} ${state === "off" ? "off" : state}`,
      studyTimePending: "Study time targets pending",
      pendingStudyTimeProgress: "Pending study time progress",
      taskLabels: {
        words: "Words",
        speakingTopics: "Speaking topics",
        listeningTests: "Listening tests",
        corpusMinutes: "Corpus minutes"
      }
    },
    targets: {
      regionLabel: "Target dashboard",
      title: "Target Dashboard",
      description: "Band targets and daily practice load.",
      localAutoSave: "Local auto-save",
      scoreTargets: "Score Targets",
      dailyGoals: "Daily Goals",
      totalBand: "Total band",
      sectionBand: (section) => `${section} band`,
      sectionMinutes: (section) => `${section} minutes`
    },
    timer: {
      regionLabel: "Study Timer",
      title: "Study Timer",
      description: "Record focused IELTS section practice.",
      sectionGroupLabel: "Timer section",
      plannedMinutes: (minutes) => `Planned ${minutes} min`,
      readyToRecord: (minutes) => `${minutes} min ready to record`,
      overtime: (minutes) => `Overtime ${minutes} min`,
      status: {
        idle: "Idle",
        running: "Running",
        paused: "Paused",
        finished: "Recorded"
      },
      buttons: {
        start: "Start",
        pause: "Pause",
        resume: "Resume",
        endAndRecord: "End and record",
        recordExternalTime: "Record external time"
      },
      manualEntry: "Manual Entry",
      manualExternalTime: "Manual external time",
      manualSection: "Manual section",
      manualMinutes: "Manual minutes"
    },
    history: {
      title: "History Summary",
      description: "Latest 60 local study days.",
      active: "Active",
      average: "Average",
      best: "Best",
      allClearDays: "100% days",
      heatmapLabel: "60-day completion heatmap",
      complete: "complete",
      dayLabel: (date, percent) => `${date}, ${percent} complete`,
      dayDetail: (date, percent) => `${date} - ${percent} complete`,
      legendLabel: "Heatmap legend from 0 percent to 100 percent"
    },
    rewards: {
      title: "Rewards",
      levelValue: (level) => `Level ${level}`,
      xpProgressLabel: "XP progress to next level",
      latestUnlock: "Latest unlock",
      noUnlocksYet: "No unlocks yet",
      unlocked: "Unlocked",
      locked: "Locked",
      achievementName: achievementName("en"),
      achievementDescription: achievementDescription("en")
    },
    settings: {
      title: "Settings",
      description: "Control targets, language, and local-first storage.",
      languageTitle: "Language",
      languageDescription: "Switch visible dashboard copy between Chinese and English.",
      targetsTitle: "Targets and daily goals",
      storageTitle: "Local data",
      storageDescription: "This version stores study data in the current browser.",
      localStateKey: "Study data key: ielts-dashboard-state",
      languageKey: "Language key: ielts-dashboard-language",
      cloudReady: "Cloud sync is planned, not active."
    },
    units: {
      band: "band",
      words: "words",
      topics: "topics",
      tests: "tests",
      xp: "XP",
      minutesShort: "min"
    }
  },
  zh: {
    languageToggle: {
      label: "语言",
      zh: "中",
      en: "Eng"
    },
    sections: {
      listening: "听力",
      speaking: "口语",
      reading: "阅读",
      writing: "写作"
    },
    summary: {
      dashboardTitle: "雅思备考打卡看板",
      localMode: "本地模式 · 已预留云同步结构",
      todayCompletion: "今日完成度",
      targetBand: "目标总分",
      streak: "连续学习",
      xp: "经验值",
      levelLabel: "等级",
      levelValue: (level) => `${level} 级`,
      streakDays: (days) => `${days} 天`
    },
    navigation: {
      regionLabel: "看板页面",
      consoleTitle: "备考控制台",
      viewLabel: navigationLabel("zh"),
      viewDescription: navigationDescription("zh"),
      settings: "设置"
    },
    overview: {
      title: "总览",
      description: "集中查看今天的雅思备考状态。",
      todayFocus: "今日重点",
      sectionBalance: "四科均衡",
      recentProgress: "近期进度",
      rewardPreview: "奖励预览",
      openView: (viewLabel) => `打开${viewLabel}`
    },
    shell: {
      sidebarLabel: "紧凑看板侧栏"
    },
    checkIn: {
      regionLabel: "每日打卡",
      title: "每日打卡",
      allClear: "全部完成",
      target: "目标",
      off: "关闭",
      complete: "已完成",
      incomplete: "未完成",
      actualLabel: (label) => `${label} 实际值`,
      statusLabel: (label, state) => {
        if (state === "off") return `${label} 已关闭`;
        return `${label} ${state === "complete" ? "已完成" : "未完成"}`;
      },
      studyTimePending: "学习时长目标待完成",
      pendingStudyTimeProgress: "待完成学习时长进度",
      taskLabels: {
        words: "单词",
        speakingTopics: "口语话题",
        listeningTests: "听力套题",
        corpusMinutes: "语料库时长"
      }
    },
    targets: {
      regionLabel: "目标看板",
      title: "目标看板",
      description: "分数目标和每日练习负荷。",
      localAutoSave: "本地自动保存",
      scoreTargets: "分数目标",
      dailyGoals: "每日目标",
      totalBand: "总分目标",
      sectionBand: (section) => `${section}分数`,
      sectionMinutes: (section) => `${section}时长`
    },
    timer: {
      regionLabel: "学习计时器",
      title: "学习计时器",
      description: "记录雅思各科专注练习时长。",
      sectionGroupLabel: "计时科目",
      plannedMinutes: (minutes) => `计划 ${minutes} 分钟`,
      readyToRecord: (minutes) => `${minutes} 分钟可记录`,
      overtime: (minutes) => `已超时 ${minutes} 分钟`,
      status: {
        idle: "待开始",
        running: "进行中",
        paused: "已暂停",
        finished: "已记录"
      },
      buttons: {
        start: "开始",
        pause: "暂停",
        resume: "继续",
        endAndRecord: "结束并记录",
        recordExternalTime: "记录外部时长"
      },
      manualEntry: "手动录入",
      manualExternalTime: "外部学习时长",
      manualSection: "手动科目",
      manualMinutes: "手动分钟"
    },
    history: {
      title: "历史概览",
      description: "最近 60 天本地学习记录。",
      active: "活跃",
      average: "平均",
      best: "最佳",
      allClearDays: "满分天数",
      heatmapLabel: "60 天完成度热力图",
      complete: "完成",
      dayLabel: (date, percent) => `${date}，完成 ${percent}`,
      dayDetail: (date, percent) => `${date} - 完成 ${percent}`,
      legendLabel: "热力图图例，从 0% 到 100%"
    },
    rewards: {
      title: "奖励",
      levelValue: (level) => `${level} 级`,
      xpProgressLabel: "距离下一等级的经验进度",
      latestUnlock: "最新解锁",
      noUnlocksYet: "暂无解锁",
      unlocked: "已解锁",
      locked: "未解锁",
      achievementName: achievementName("zh"),
      achievementDescription: achievementDescription("zh")
    },
    settings: {
      title: "设置",
      description: "管理目标、语言和本地优先数据。",
      languageTitle: "语言",
      languageDescription: "在中文和英文看板文案之间切换。",
      targetsTitle: "目标和每日任务",
      storageTitle: "本地数据",
      storageDescription: "当前版本会把学习数据保存在当前浏览器。",
      localStateKey: "学习数据 key：ielts-dashboard-state",
      languageKey: "语言 key：ielts-dashboard-language",
      cloudReady: "云同步已规划，当前尚未启用。"
    },
    units: {
      band: "分",
      words: "词",
      topics: "题",
      tests: "套",
      xp: "经验",
      minutesShort: "分钟"
    }
  }
};
