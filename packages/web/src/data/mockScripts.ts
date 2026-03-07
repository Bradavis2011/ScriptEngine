export type ScriptType = "series_episode" | "data_drop" | "trend_take" | "niche_tip";
export type FilmingStatus = "ready" | "filmed" | "posted";

export interface ScriptSection {
  title: string;
  spokenWords: string;
  cameraDirection: string;
  bRollSuggestion: string;
  textOverlay: string;
}

export interface Script {
  id: string;
  scriptType: ScriptType;
  coldOpen: string;
  coldOpenCamera: string;
  sections: ScriptSection[];
  callToAction: string;
  callToActionCamera: string;
  teleprompterText: string;
  caption: string;
  hashtags: string[];
  duration: number;
  filmingStatus: FilmingStatus;
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  createdAt: string;
  performance?: {
    views: number;
    likes: number;
    shares: number;
    follows: number;
  };
}

export interface Series {
  id: string;
  title: string;
  description: string;
  episodeCount: number;
  episodes: { episodeNumber: number; scriptId: string; status: FilmingStatus }[];
  status: "in_progress" | "complete" | "archived";
}

export const mockScripts: Script[] = [
  {
    id: "1",
    scriptType: "data_drop",
    coldOpen: "93% of creators quit before their 10th video. Here's why the ones who stay win big.",
    coldOpenCamera: "Direct to camera, tight frame, serious expression",
    sections: [
      {
        title: "The Dropout Cliff",
        spokenWords: "Most creators give up because they expect viral results from day one. But the algorithm doesn't work that way. It tests your consistency before it rewards your content.",
        cameraDirection: "Medium shot, slight lean in",
        bRollSuggestion: "Phone screen showing analytics going up",
        textOverlay: "93% quit before video #10",
      },
      {
        title: "The Compound Effect",
        spokenWords: "The creators who post 3 times a week for 90 days see an average 340% growth in followers. Not because one video went viral — because the algorithm finally trusts them.",
        cameraDirection: "Wide to tight zoom during the stat",
        bRollSuggestion: "Graph showing exponential growth curve",
        textOverlay: "340% growth in 90 days",
      },
    ],
    callToAction: "Follow me for more creator data that actually matters. Drop a 🔥 if you're past video 10.",
    callToActionCamera: "Direct to camera, smile, point at camera",
    teleprompterText: "93% of creators quit before their 10th video. Here's why the ones who stay win big. Most creators give up because they expect viral results from day one. But the algorithm doesn't work that way. It tests your consistency before it rewards your content. The creators who post 3 times a week for 90 days see an average 340% growth in followers. Not because one video went viral — because the algorithm finally trusts them. Follow me for more creator data that actually matters. Drop a fire emoji if you're past video 10.",
    caption: "The data doesn't lie — consistency beats virality every time.\n\n93% of creators quit before video #10.\n\nBut those who post 3x/week for 90 days?\n340% average follower growth.\n\nThe algorithm rewards persistence, not perfection.",
    hashtags: ["#creatoreconomy", "#contentcreator", "#growthmindset", "#tiktoktips", "#creatortips"],
    duration: 45,
    filmingStatus: "ready",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    scriptType: "series_episode",
    coldOpen: "Day 3 of building a startup in public. Today I almost quit.",
    coldOpenCamera: "Handheld, raw, slightly shaky — authenticity over polish",
    sections: [
      {
        title: "The Morning Crisis",
        spokenWords: "I woke up to 47 support tickets and zero new signups. My co-founder texted me 'we need to talk' which is never good. For a second I thought — maybe I should just get a real job.",
        cameraDirection: "Close up, natural lighting, sitting at desk",
        bRollSuggestion: "Laptop screen with notification badges",
        textOverlay: "Day 3: Almost Quit",
      },
      {
        title: "The Pivot Moment",
        spokenWords: "Then I looked at our retention data. The people who DO use us? They use us every single day. We don't have a product problem. We have a discovery problem. And that's fixable.",
        cameraDirection: "Medium shot, energy shifts — sit up straighter",
        bRollSuggestion: "Dashboard showing retention metrics",
        textOverlay: "Retention > Acquisition",
      },
    ],
    callToAction: "Follow along for the real startup journey. No fluff, no filters. Day 4 drops tomorrow.",
    callToActionCamera: "Direct to camera, genuine smile",
    teleprompterText: "Day 3 of building a startup in public. Today I almost quit. I woke up to 47 support tickets and zero new signups. My co-founder texted me we need to talk which is never good. For a second I thought maybe I should just get a real job. Then I looked at our retention data. The people who DO use us? They use us every single day. We don't have a product problem. We have a discovery problem. And that's fixable. Follow along for the real startup journey. No fluff, no filters. Day 4 drops tomorrow.",
    caption: "Day 3 of building a startup in public.\n\nAlmost quit this morning.\n47 support tickets. Zero signups.\n\nBut then I looked at the data...\n\nRetention is 94%.\nWe don't have a product problem.\nWe have a discovery problem.\n\nAnd that's fixable. 💡",
    hashtags: ["#startuplife", "#buildinpublic", "#founder", "#entrepreneurship", "#startup"],
    duration: 52,
    filmingStatus: "ready",
    seriesId: "s1",
    seriesTitle: "30 Days of Startup Truths",
    episodeNumber: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    scriptType: "trend_take",
    coldOpen: "Everyone's talking about the new Instagram algorithm. Here's what they're getting wrong.",
    coldOpenCamera: "Direct to camera, confident stance, arms crossed then unfold",
    sections: [
      {
        title: "The Misconception",
        spokenWords: "Everyone says Reels are dead and carousels are king. That's a surface-level take. What actually changed is that Instagram now prioritizes sends over saves. Content people share in DMs gets 3x the reach.",
        cameraDirection: "Talking head, medium shot, emphatic gestures",
        bRollSuggestion: "Instagram UI showing share button highlighted",
        textOverlay: "Sends > Saves in 2026",
      },
    ],
    callToAction: "Save this for your next content strategy session. Follow for weekly algorithm updates.",
    callToActionCamera: "Point at camera, then point down (save gesture)",
    teleprompterText: "Everyone's talking about the new Instagram algorithm. Here's what they're getting wrong. Everyone says Reels are dead and carousels are king. That's a surface-level take. What actually changed is that Instagram now prioritizes sends over saves. Content people share in DMs gets 3x the reach. Save this for your next content strategy session. Follow for weekly algorithm updates.",
    caption: "The Instagram algorithm just changed again.\n\nBut everyone's focused on the wrong thing.\n\nIt's not Reels vs Carousels.\n\nIt's Sends vs Saves.\n\nContent shared in DMs gets 3x the reach. 📈",
    hashtags: ["#instagramalgorithm", "#socialmediatips", "#contentcreator", "#reels", "#instagram2026"],
    duration: 38,
    filmingStatus: "filmed",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    scriptType: "niche_tip",
    coldOpen: "Stop posting at 9am. Here's the actual best time to post in 2026.",
    coldOpenCamera: "Direct to camera, lean in like sharing a secret",
    sections: [
      {
        title: "The Real Best Time",
        spokenWords: "The best time to post isn't a universal time slot. It's 30 minutes before your audience's most active hour. Check your analytics, find the spike, and post half an hour early so the algorithm has time to test your content before the wave hits.",
        cameraDirection: "Medium close-up, casual setting",
        bRollSuggestion: "Phone analytics showing audience active hours",
        textOverlay: "Post 30 min BEFORE the peak",
      },
    ],
    callToAction: "Try this for one week and watch what happens. Comment your results below.",
    callToActionCamera: "Casual, encouraging tone, thumbs up",
    teleprompterText: "Stop posting at 9am. Here's the actual best time to post in 2026. The best time to post isn't a universal time slot. It's 30 minutes before your audience's most active hour. Check your analytics, find the spike, and post half an hour early so the algorithm has time to test your content before the wave hits. Try this for one week and watch what happens. Comment your results below.",
    caption: "Stop posting at 9am. ⏰\n\nThe best time to post is 30 minutes BEFORE your audience peaks.\n\nHere's why:\nThe algorithm needs time to test your content before the wave hits.\n\nTry it for 7 days. Thank me later.",
    hashtags: ["#postingtime", "#socialmediatips", "#growthhack", "#contentcreator", "#tiktoktips"],
    duration: 35,
    filmingStatus: "posted",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    performance: { views: 12400, likes: 890, shares: 234, follows: 67 },
  },
  {
    id: "5",
    scriptType: "series_episode",
    coldOpen: "Day 1 of building a startup in public. Let's document everything.",
    coldOpenCamera: "Wide shot of workspace, then turn to camera",
    sections: [
      {
        title: "Why I'm Doing This",
        spokenWords: "I'm building a SaaS product from scratch and documenting every single day. The wins, the losses, the revenue numbers — everything. Because the best startup advice comes from people currently in the trenches, not people who made it 10 years ago.",
        cameraDirection: "Direct to camera, passionate delivery",
        bRollSuggestion: "Whiteboard with product sketches",
        textOverlay: "Day 1: The Beginning",
      },
    ],
    callToAction: "Follow for daily startup reality. No filters, no BS.",
    callToActionCamera: "Direct to camera, fist bump toward lens",
    teleprompterText: "Day 1 of building a startup in public. Let's document everything. I'm building a SaaS product from scratch and documenting every single day. The wins, the losses, the revenue numbers — everything. Because the best startup advice comes from people currently in the trenches, not people who made it 10 years ago. Follow for daily startup reality. No filters, no BS.",
    caption: "Day 1.\n\nI'm building a SaaS product from scratch.\nDocumenting every single day.\n\nThe wins. The losses. The revenue.\nEverything.\n\nFollow along. 🚀",
    hashtags: ["#buildinpublic", "#startupjourney", "#day1", "#saas", "#founder"],
    duration: 40,
    filmingStatus: "posted",
    seriesId: "s1",
    seriesTitle: "30 Days of Startup Truths",
    episodeNumber: 1,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    performance: { views: 8900, likes: 650, shares: 180, follows: 45 },
  },
];

export const mockSeries: Series[] = [
  {
    id: "s1",
    title: "30 Days of Startup Truths",
    description: "Raw, unfiltered founder journey documented daily",
    episodeCount: 30,
    episodes: [
      { episodeNumber: 1, scriptId: "5", status: "posted" },
      { episodeNumber: 2, scriptId: "6", status: "filmed" },
      { episodeNumber: 3, scriptId: "2", status: "ready" },
      { episodeNumber: 4, scriptId: "", status: "ready" },
    ],
    status: "in_progress",
  },
  {
    id: "s2",
    title: "Algorithm Secrets",
    description: "Weekly deep dives into how social algorithms actually work",
    episodeCount: 10,
    episodes: [
      { episodeNumber: 1, scriptId: "7", status: "posted" },
      { episodeNumber: 2, scriptId: "8", status: "ready" },
    ],
    status: "in_progress",
  },
];
