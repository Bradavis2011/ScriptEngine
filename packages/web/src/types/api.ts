import { Script, ScriptType, FilmingStatus } from '@/data/mockScripts';

export interface ApiScriptSection {
  heading: string;
  script: string;
  bRollSuggestion: string;
  cameraDirection?: string;
  textOverlay?: string;
}

export interface ApiScriptData {
  coldOpen: string;
  coldOpenCamera?: string;
  sections: ApiScriptSection[];
  callToAction: string;
  callToActionCamera?: string;
  teleprompterText: string;
  caption: string;
  hashtags: string[];
  totalDurationSeconds: number;
}

export interface ApiScript {
  id: string;
  tenantId: string;
  scriptType: ScriptType;
  filmingStatus: FilmingStatus;
  scriptData: ApiScriptData;
  seriesId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSeries {
  id: string;
  tenantId: string;
  name: string;
  episodeCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function fromApiScript(s: ApiScript): Script {
  const d = s.scriptData;
  return {
    id: s.id,
    scriptType: s.scriptType,
    filmingStatus: s.filmingStatus,
    coldOpen: d.coldOpen,
    coldOpenCamera: d.coldOpenCamera ?? '',
    sections: d.sections.map((sec) => ({
      title: sec.heading,
      spokenWords: sec.script,
      bRollSuggestion: sec.bRollSuggestion,
      cameraDirection: sec.cameraDirection ?? '',
      textOverlay: sec.textOverlay ?? '',
    })),
    callToAction: d.callToAction,
    callToActionCamera: d.callToActionCamera ?? '',
    teleprompterText: d.teleprompterText,
    caption: d.caption,
    hashtags: d.hashtags,
    duration: d.totalDurationSeconds,
    seriesId: s.seriesId ?? undefined,
    createdAt: s.createdAt,
  };
}
