"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent, MouseEvent, TouchEvent } from "react";
import { saveSurvey, listSurveys, loadSurvey, deleteSurvey, loadBrand, saveBrand, SurveyRow } from "@/lib/local-store";

// ── Types ──
interface Photo {
  id: number;
  /** base64 data URL */
  data?: string;
  label: string;
}

interface Door {
  id: string;
  location: string;
  type: string;
  lockStyle: string;
  frame: string;
  ada: boolean;
  notes: string;
  readerSide: string;
  existingHardware: string;
  photos: Photo[];
}

interface Camera {
  id: string;
  location: string;
  type: string;
  mounting: string;
  view: string;
  height: string;
  notes: string;
  interior: boolean;
  photos: Photo[];
}

interface SurveyData {
  opp: string; walkDate: string; projectName: string; walkBy: string;
  customerName: string; installDate: string; pocName: string; pocEmail: string;
  targetBudget: string; timeline: string; customerAddress: string;
  installAddress: string; otherSites: string; scopeOverview: string;
  cctvScope: string; cctvSystemType: string; cctvVendors: string;
  recordingType: string[]; cloudYearsCctv: string; retention: string;
  recordingSchedule: string[]; featuresRequired: string[]; audioAreas: string;
  otherFeatures: string; existingVms: string[]; existingVendorCctv: string;
  cctvIntegrations: string; monitoringStations: string;
  cameras: Camera[];
  acScope: string; acSystemType: string; doors: Door[];
  credentialType: string[]; acCloudSystem: string[]; acCloudYears: string;
  userCapacity: string; acVendors: string; existingAc: string[];
  existingVendorAc: string; currentCardType: string; fireAlarm: string;
  acIntegrations: string; acProgramming: string;
  networkType: string; vlan: string; subnetDetails: string;
  remoteAccess: string[]; custEquipment: string;
  ceilingTypes: string[]; plenumSpace: string[]; crawlSpace: string[];
  ceilingHeight: string; wallTypes: string;
  conduit: string; rackSpace: string; lifts: string[]; blueprints: string[];
  electrical: string;
  serviceContracts: string; training: string[]; thirdParty: string;
  specialProgramming: string; additionalProducts: string; notes: string;
  photos: Photo[];
  permitAcknowledged: boolean;
  permitNotes: string;
  completedBy: string; completedDate: string; signature: string;
  [key: string]: unknown;
}

interface Brand {
  name: string;
  logo: string;
  tagline: string;
}

type FieldValue = string | string[] | boolean | Photo[] | Door[] | Camera[];
type SetField = (name: string, value: FieldValue) => void;

interface JsPdfWindow extends Window {
  jspdf?: { jsPDF: new (opts: object) => JsPdfDoc };
}

interface JsPdfDoc {
  setFillColor: (r: number, g?: number, b?: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  setFont: (font: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  text: (text: string | string[], x: number, y: number, opts?: object) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (w: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  addPage: () => void;
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
  getNumberOfPages: () => number;
  setPage: (n: number) => void;
  save: (filename: string) => void;
}

// ── Constants ──
const STORAGE_KEY = "site_survey_draft";
const SURVEY_ID_KEY = "site_survey_id";
const B = { dark: "#1B3A5C", med: "#2E75B6", light: "#D5E8F0", accent: "#E8913A", bg: "#F7F8FA", card: "#FFFFFF", text: "#1a1a1a", muted: "#6B7280", border: "#D1D5DB", inputBg: "#FAFBFC" };

const TABS = [
  { id: "project", label: "Project" }, { id: "cctv", label: "CCTV" },
  { id: "access", label: "Access" }, { id: "site", label: "Site" },
  { id: "additional", label: "More" }, { id: "photos", label: "Photos" },
] as const;

type TabId = typeof TABS[number]["id"];

const EMPTY_DOOR: Omit<Door, "id"> = { location: "", type: "", lockStyle: "", frame: "", ada: false, notes: "", readerSide: "", existingHardware: "", photos: [] };
const EMPTY_CAM: Omit<Camera, "id"> = { location: "", type: "", mounting: "", view: "", height: "", notes: "", interior: true, photos: [] };

const INITIAL: SurveyData = {
  opp: "", walkDate: "", projectName: "", walkBy: "", customerName: "", installDate: "",
  pocName: "", pocEmail: "", targetBudget: "", timeline: "", customerAddress: "",
  installAddress: "", otherSites: "", scopeOverview: "",
  cctvScope: "", cctvSystemType: "", cctvVendors: "", recordingType: [], cloudYearsCctv: "",
  retention: "", recordingSchedule: [], featuresRequired: [], audioAreas: "", otherFeatures: "",
  existingVms: [], existingVendorCctv: "", cctvIntegrations: "", monitoringStations: "",
  cameras: [{ ...EMPTY_CAM, id: "cam-1" }],
  acScope: "", acSystemType: "", doors: [{ ...EMPTY_DOOR, id: "door-1" }],
  credentialType: [], acCloudSystem: [], acCloudYears: "", userCapacity: "", acVendors: "",
  existingAc: [], existingVendorAc: "", currentCardType: "", fireAlarm: "",
  acIntegrations: "", acProgramming: "",
  networkType: "", vlan: "", subnetDetails: "", remoteAccess: [], custEquipment: "",
  ceilingTypes: [], plenumSpace: [], crawlSpace: [], ceilingHeight: "", wallTypes: "",
  conduit: "", rackSpace: "", lifts: [], blueprints: [], electrical: "",
  serviceContracts: "", training: [], thirdParty: "", specialProgramming: "",
  additionalProducts: "", notes: "", photos: [],
  permitAcknowledged: false,
  permitNotes: "",
  completedBy: "", completedDate: "", signature: "",
};

// ── Icons ──
const IconProject = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IconCCTV = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l5-5v10l-5-5z"/><rect x="7" y="8" width="10" height="8" rx="1.5"/><path d="M17 10l4-2v8l-4-2"/><circle cx="12" cy="12" r="2"/></svg>;
const IconAccess = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1.5"/></svg>;
const IconSite = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/></svg>;
const IconMore = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>;
const IconPhotos = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
const TAB_ICONS: Record<TabId, () => React.JSX.Element> = { project: IconProject, cctv: IconCCTV, access: IconAccess, site: IconSite, additional: IconMore, photos: IconPhotos };
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const DlIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const PdfIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const JsonIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const ShareIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const GearIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const CamIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12l5-5v10l-5-5z"/><rect x="7" y="8" width="10" height="8" rx="1"/><path d="M17 10l4-2v8l-4-2"/></svg>;
const ListIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body,html,#__next{font-family:'DM Sans',sans-serif;background:${B.bg};color:${B.text};height:100%;overflow:hidden}
.app{display:flex;flex-direction:column;height:100vh;max-width:900px;margin:0 auto;background:${B.bg}}
.header{background:${B.dark};padding:12px 16px 10px;flex-shrink:0}
.header-top{display:flex;justify-content:space-between;align-items:center}
.header-brand{display:flex;align-items:center;gap:10px;min-width:0}
.header-logo{height:32px;width:auto;border-radius:4px;object-fit:contain;flex-shrink:0}
.header-text{min-width:0}
.header h1{color:white;font-size:15px;font-weight:700;letter-spacing:.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header-sub{color:${B.light};font-size:10px;opacity:.8;margin-top:1px}
.header-actions{display:flex;gap:6px;flex-shrink:0}
.hbtn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:white;font-size:11px;font-weight:600;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;gap:4px}
.hbtn:hover{background:rgba(255,255,255,.2)}
.hbtn.accent{background:${B.accent};border-color:${B.accent}}
.hbtn.danger{background:rgba(220,60,60,.8);border-color:rgba(220,60,60,.6)}
.tabs{display:flex;background:white;border-bottom:2px solid ${B.light};flex-shrink:0;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:1;min-width:60px;padding:8px 4px 6px;text-align:center;cursor:pointer;border:none;background:none;font-family:inherit;font-size:10px;font-weight:500;color:${B.muted};border-bottom:3px solid transparent;transition:all .15s;white-space:nowrap;display:flex;flex-direction:column;align-items:center;gap:2px}
.tab.active{color:${B.dark};font-weight:700;border-bottom-color:${B.med};background:${B.light}}
.tab svg{opacity:.6}.tab.active svg{opacity:1}
.content{flex:1;overflow-y:auto;padding:14px 14px 100px;-webkit-overflow-scrolling:touch}
.section{background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:14px;overflow:hidden}
.section-header{background:${B.dark};color:white;padding:9px 14px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.section-body{padding:14px}
.sub-header{font-size:12px;font-weight:700;color:${B.med};text-transform:uppercase;letter-spacing:.3px;padding-bottom:5px;margin:14px 0 8px;border-bottom:2px solid ${B.light}}
.sub-header:first-child{margin-top:0}
.field{margin-bottom:12px}
.field-label{font-size:11px;font-weight:600;color:${B.dark};margin-bottom:3px;display:block}
.field-hint{font-size:10px;color:${B.muted};margin-bottom:3px;font-style:italic}
.field-input{width:100%;padding:8px 10px;border:1px solid ${B.border};border-radius:6px;font-family:inherit;font-size:13px;background:${B.inputBg};color:${B.text};transition:border-color .15s;-webkit-appearance:none}
.field-input:focus{outline:none;border-color:${B.med};box-shadow:0 0 0 3px rgba(46,117,182,.12)}
textarea.field-input{min-height:70px;resize:vertical;line-height:1.5}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:480px){.field-row{grid-template-columns:1fr}}
.checkbox-group{display:flex;flex-wrap:wrap;gap:6px;margin-top:3px}
.cb-item{display:flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid ${B.border};border-radius:6px;cursor:pointer;font-size:12px;transition:all .15s;user-select:none;background:white}
.cb-item.on{background:${B.light};border-color:${B.med};color:${B.dark};font-weight:600}
.cb-box{width:14px;height:14px;border:2px solid ${B.border};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;transition:all .15s}
.cb-item.on .cb-box{background:${B.med};border-color:${B.med};color:white}
.item-card{border:1px solid ${B.border};border-radius:8px;padding:12px;margin-bottom:12px;background:${B.inputBg}}
.item-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.item-card-title{font-size:13px;font-weight:700;color:${B.dark};display:flex;align-items:center;gap:8px}
.item-num{background:${B.med};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.item-remove{background:none;border:1px solid rgba(220,60,60,.4);color:#dc3c3c;font-size:11px;padding:3px 10px;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:600}
.add-btn{width:100%;padding:10px;border:2px dashed ${B.border};border-radius:8px;background:none;font-family:inherit;font-size:13px;font-weight:600;color:${B.med};cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px}
.add-btn:hover{border-color:${B.med};background:rgba(46,117,182,.04)}
.mini-photos{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.mini-thumb{width:48px;height:48px;border-radius:4px;overflow:hidden;position:relative;border:1px solid ${B.border}}
.mini-thumb img{width:100%;height:100%;object-fit:cover}
.mini-rm{position:absolute;top:1px;right:1px;width:14px;height:14px;border-radius:50%;background:rgba(220,60,60,.85);color:white;border:none;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.mini-add{width:48px;height:48px;border:1px dashed ${B.border};border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${B.muted};font-size:16px;background:white}
.mini-add:hover{border-color:${B.med};color:${B.med}}
.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:8px}
.photo-thumb{aspect-ratio:1;border-radius:6px;overflow:hidden;position:relative;border:1px solid ${B.border}}
.photo-thumb img{width:100%;height:100%;object-fit:cover}
.photo-rm{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(220,60,60,.85);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.photo-lbl{width:100%;border:none;background:rgba(0,0,0,.65);color:white;font-size:9px;padding:3px 4px;text-align:center;position:absolute;bottom:0;left:0;right:0;font-family:inherit}
.photo-lbl::placeholder{color:rgba(255,255,255,.5)}
.photo-lbl:focus{outline:none;background:rgba(0,0,0,.8)}
.photo-add{aspect-ratio:1;border:2px dashed ${B.border};border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:${B.muted};font-size:10px;gap:3px;background:${B.inputBg};transition:all .15s}
.photo-add:hover{border-color:${B.med};color:${B.med}}
.cl-item{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;line-height:1.4}
.cl-item:last-child{border-bottom:none}
.cl-check{width:18px;height:18px;border:2px solid ${B.border};border-radius:4px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:1px;transition:all .15s;font-size:10px}
.cl-check.done{background:${B.med};border-color:${B.med};color:white}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:white;border-radius:12px;padding:20px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto}
.modal h2{font-size:16px;color:${B.dark};margin-bottom:14px}
.mbtn{width:100%;padding:11px;border-radius:8px;border:none;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px}
.mbtn.pri{background:${B.dark};color:white}
.mbtn.sec{background:${B.light};color:${B.dark}}
.mbtn.can{background:#f3f4f6;color:${B.muted}}
.toast{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:${B.dark};color:white;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:500;z-index:200;animation:ti .3s ease}
@keyframes ti{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.sig-canvas{border:1px solid ${B.border};border-radius:6px;background:white;touch-action:none;width:100%;cursor:crosshair}
.sig-actions{display:flex;gap:8px;margin-top:6px}
.sig-btn{padding:5px 14px;border-radius:5px;border:1px solid ${B.border};background:white;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;color:${B.muted}}
.sig-btn:hover{border-color:${B.med};color:${B.med}}
.brand-settings{padding:16px}
.logo-upload-area{width:100%;padding:20px;border:2px dashed ${B.border};border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:${B.inputBg};transition:all .15s;margin-bottom:12px}
.logo-upload-area:hover{border-color:${B.med}}
.logo-preview{max-height:60px;max-width:200px;object-fit:contain;border-radius:4px}
.logo-remove{font-size:11px;color:#dc3c3c;cursor:pointer;border:none;background:none;font-family:inherit;font-weight:600;margin-top:4px}
.acct-err{background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C;font-size:12px;padding:8px 10px;border-radius:6px;margin-bottom:12px}
.field-input:disabled{background:#f3f4f6;color:${B.muted}}
.srv-list{border:1px solid ${B.border};border-radius:8px;overflow:hidden;margin-bottom:12px;max-height:320px;overflow-y:auto}
.srv-row{display:flex;justify-content:space-between;align-items:center;padding:10px 11px;border-bottom:1px solid #f0f0f0;gap:8px}
.srv-row:last-child{border-bottom:none}
.srv-main{min-width:0;flex:1;cursor:pointer}
.srv-main strong{display:block;color:${B.dark};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srv-main span{color:${B.muted};font-size:10px}
.srv-cur{background:${B.light};color:${B.dark};font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;flex-shrink:0}
.srv-rm{background:none;border:1px solid rgba(220,60,60,.4);color:#dc3c3c;font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;cursor:pointer;font-family:inherit;flex-shrink:0}
.srv-empty{text-align:center;color:${B.muted};font-size:12px;padding:22px}
.sync-pill{font-size:10px;font-weight:600;padding:4px 8px;border-radius:5px;background:rgba(255,255,255,.14);color:#fff;white-space:nowrap;align-self:center}
`;

// ── Field component ──
interface FieldProps {
  label: string;
  hint?: string;
  name: string;
  value: string;
  onChange: SetField;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}

function Field({ label, hint, name, value, onChange, type = "text", textarea, placeholder }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      {textarea
        ? <textarea className="field-input" value={value || ""} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(name, e.target.value)} placeholder={placeholder} />
        : <input type={type} className="field-input" value={value || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

interface CBGroupProps {
  label?: string;
  hint?: string;
  name: string;
  options: string[];
  value: string[];
  onChange: SetField;
}

function CBGroup({ label, hint, name, options, value, onChange }: CBGroupProps) {
  const cur = value || [];
  const toggle = (o: string) => onChange(name, cur.includes(o) ? cur.filter(v => v !== o) : [...cur, o]);
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {hint && <div className="field-hint">{hint}</div>}
      <div className="checkbox-group">
        {options.map(o => (
          <label key={o} className={`cb-item ${cur.includes(o) ? "on" : ""}`} onClick={() => toggle(o)}>
            <span className="cb-box">{cur.includes(o) ? "\u2713" : ""}</span>{o}
          </label>
        ))}
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="section"><div className="section-header">{title}</div><div className="section-body">{children}</div></div>;
}
function SubH({ text }: { text: string }) { return <div className="sub-header">{text}</div>; }

interface MiniPhotosProps {
  photos: Photo[];
  onAdd: (p: Photo) => void;
  onRemove: (id: number) => void;
}

function MiniPhotos({ photos, onAdd, onRemove }: MiniPhotosProps) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => {
        if (ev.target?.result) {
          onAdd({ id: Date.now() + Math.random(), data: ev.target.result as string, label: f.name.replace(/\.[^.]+$/, "") });
        }
      };
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  return (
    <div className="mini-photos">
      {(photos || []).map(p => (
        <div key={p.id} className="mini-thumb">
          <img src={p.data} alt={p.label} />
          <button className="mini-rm" onClick={() => onRemove(p.id)}>x</button>
        </div>
      ))}
      <div className="mini-add" onClick={() => ref.current?.click()}>+</div>
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handleFiles} />
    </div>
  );
}

// ── Signature Pad ──
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) { ctx.drawImage(img, 0, 0); setHasDrawn(true); }
      };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const r = canvasRef.current.getBoundingClientRect();
    const t = "touches" in e ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (600 / r.width), y: (t.clientY - r.top) * (120 / r.height) };
  };
  const start = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    ctx.lineWidth = 2;
    ctx.strokeStyle = B.dark;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const end = () => {
    if (drawing.current && canvasRef.current) {
      drawing.current = false;
      onChange(canvasRef.current.toDataURL());
    }
  };
  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, 600, 120);
    setHasDrawn(false);
    onChange("");
  };
  return (
    <div className="field">
      <label className="field-label">Signature</label>
      <canvas ref={canvasRef} className="sig-canvas" width={600} height={120} style={{ height: 80 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <div className="sig-actions">
        <button className="sig-btn" onClick={clear}>Clear Signature</button>
        {hasDrawn && <span style={{ fontSize: 10, color: B.muted, alignSelf: "center" }}>Signed</span>}
      </div>
    </div>
  );
}

// ── Settings Modal ──
// Branding is stored on this device only (see lib/local-store).
function SettingsModal({ brand, onSave, onClose }: { brand: Brand; onSave: (b: Brand) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState<Brand>(brand);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      setErr("Logo must be under 512 KB.");
      e.target.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = (ev) => { if (ev.target?.result) setDraft(d => ({ ...d, logo: ev.target!.result as string })); };
    r.readAsDataURL(file);
    e.target.value = "";
  };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save branding");
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>
        {err && <div className="acct-err">{err}</div>}

        <div className="brand-settings">
          <div className="sub-header">Branding</div>
          <div className="field">
            <label className="field-label">Company Name</label>
            <input className="field-input" value={draft.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Your company name" />
          </div>
          <div className="field">
            <label className="field-label">Company Logo</label>
            <div className="logo-upload-area" onClick={() => logoRef.current?.click()}>
              {draft.logo ? (
                <>
                  <img src={draft.logo} alt="Logo" className="logo-preview" />
                  <button className="logo-remove" onClick={(e) => { e.stopPropagation(); setDraft(d => ({ ...d, logo: "" })); }}>Remove Logo</button>
                </>
              ) : (
                <><PlusIcon /><span style={{ fontSize: 12, color: B.muted }}>Upload logo (PNG, JPG, SVG)</span></>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
          </div>
          <div className="field">
            <label className="field-label">Tagline (optional)</label>
            <input className="field-input" value={draft.tagline} onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, tagline: e.target.value }))} placeholder="e.g. Physical Security Solutions" />
          </div>
        </div>

        <button className="mbtn pri" onClick={save} disabled={saving}>{saving ? "Saving…" : "Done"}</button>
        <button className="mbtn can" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── Camera Card ──
interface CamCardProps {
  cam: Camera;
  index: number;
  total: number;
  onUpdate: (id: string, field: string, value: FieldValue) => void;
  onRemove: (id: string) => void;
}
function CamCard({ cam, index, total, onUpdate, onRemove }: CamCardProps) {
  const set = (f: string, v: FieldValue) => onUpdate(cam.id, f, v);
  return (
    <div className="item-card">
      <div className="item-card-header">
        <div className="item-card-title"><span className="item-num">{index + 1}</span><CamIcon /> Camera {index + 1}</div>
        {total > 1 && <button className="item-remove" onClick={() => onRemove(cam.id)}>Remove</button>}
      </div>
      <Field label="Location / Description" name="location" value={cam.location} onChange={set} placeholder="e.g. Main hallway, Parking lot SE" />
      <div className="field-row">
        <Field label="Camera Type" name="type" value={cam.type} onChange={set} placeholder="Dome, bullet, PTZ, multi-sensor" />
        <Field label="Mount Type" name="mounting" value={cam.mounting} onChange={set} placeholder="Ceiling, wall, pole, pendant" />
      </div>
      <div className="field-row">
        <Field label="Mount Height" name="height" value={cam.height} onChange={set} placeholder="Approx feet" />
        <div className="field">
          <label className="field-label">Int / Ext</label>
          <div className="checkbox-group">
            {["Interior", "Exterior"].map(o => {
              const on = cam.interior === (o === "Interior");
              return <label key={o} className={`cb-item ${on ? "on" : ""}`} onClick={() => set("interior", o === "Interior")}><span className="cb-box">{on ? "\u2713" : ""}</span>{o}</label>;
            })}
          </div>
        </div>
      </div>
      <Field label="Intended View" name="view" value={cam.view} onChange={set} textarea placeholder="What should this camera see?" />
      <Field label="Notes" name="notes" value={cam.notes} onChange={set} placeholder="Lighting, obstructions, requirements" />
      <div className="field">
        <label className="field-label">Photos</label>
        <MiniPhotos photos={cam.photos} onAdd={p => set("photos", [...(cam.photos || []), p])} onRemove={pid => set("photos", (cam.photos || []).filter(x => x.id !== pid))} />
      </div>
    </div>
  );
}

// ── Door Card ──
interface DoorCardProps {
  door: Door;
  index: number;
  total: number;
  onUpdate: (id: string, field: string, value: FieldValue) => void;
  onRemove: (id: string) => void;
}
function DoorCard({ door, index, total, onUpdate, onRemove }: DoorCardProps) {
  const set = (f: string, v: FieldValue) => onUpdate(door.id, f, v);
  const lockOpts = ["Electric Strike", "Rim Exit (Push Bar)", "Mag-Lock", "Motorized Latch", "Cylindrical", "Other"];
  return (
    <div className="item-card">
      <div className="item-card-header">
        <div className="item-card-title"><span className="item-num">{index + 1}</span>Door {index + 1}</div>
        {total > 1 && <button className="item-remove" onClick={() => onRemove(door.id)}>Remove</button>}
      </div>
      <Field label="Location / Name" name="location" value={door.location} onChange={set} placeholder="e.g. Main Entrance, Rm 101" />
      <div className="field-row">
        <Field label="Door Type" name="type" value={door.type} onChange={set} placeholder="Single, pair, HM, aluminum" />
        <Field label="Frame Type" name="frame" value={door.frame} onChange={set} placeholder="HM, wood, aluminum" />
      </div>
      <div className="field">
        <label className="field-label">Lock Style</label>
        <div className="checkbox-group">
          {lockOpts.map(o => {
            const on = door.lockStyle === o;
            return <label key={o} className={`cb-item ${on ? "on" : ""}`} onClick={() => set("lockStyle", on ? "" : o)}><span className="cb-box">{on ? "\u2713" : ""}</span>{o}</label>;
          })}
        </div>
      </div>
      <div className="field-row">
        <Field label="Existing Hardware" name="existingHardware" value={door.existingHardware} onChange={set} placeholder="Current lock mfg/model" />
        <Field label="Reader Side" name="readerSide" value={door.readerSide} onChange={set} placeholder="Left, right, exterior" />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => set("ada", !door.ada)}>
          <span className="cb-box" style={door.ada ? { background: B.med, borderColor: B.med, color: "white" } : {}}>{door.ada ? "\u2713" : ""}</span>ADA Door
        </label>
      </div>
      <Field label="Notes" name="notes" value={door.notes} onChange={set} textarea placeholder="Condition, special requirements..." />
      <div className="field">
        <label className="field-label">Photos</label>
        <MiniPhotos photos={door.photos} onAdd={p => set("photos", [...(door.photos || []), p])} onRemove={pid => set("photos", (door.photos || []).filter(x => x.id !== pid))} />
      </div>
    </div>
  );
}

// ── Tab Panels ──
interface TabProps { data: SurveyData; set: SetField; }

function ProjectTab({ data, set }: TabProps) {
  return (<>
    <Sec title="Project Information">
      <div className="field-row"><Field label="OPP #" name="opp" value={data.opp} onChange={set} /><Field label="Walk-Through Date" name="walkDate" value={data.walkDate} onChange={set} type="date" /></div>
      <div className="field-row"><Field label="Project Name" name="projectName" value={data.projectName} onChange={set} /><Field label="Walk-Through By" name="walkBy" value={data.walkBy} onChange={set} /></div>
      <div className="field-row"><Field label="Customer Name" name="customerName" value={data.customerName} onChange={set} /><Field label="Est. Install Date" name="installDate" value={data.installDate} onChange={set} type="date" /></div>
      <div className="field-row"><Field label="POC Name" name="pocName" value={data.pocName} onChange={set} /><Field label="POC Email" name="pocEmail" value={data.pocEmail} onChange={set} type="email" /></div>
      <div className="field-row"><Field label="Target Budget" name="targetBudget" value={data.targetBudget} onChange={set} /><Field label="Project Timeline" name="timeline" value={data.timeline} onChange={set} /></div>
      <Field label="Customer Address" name="customerAddress" value={data.customerAddress} onChange={set} />
      <Field label="Install Address" name="installAddress" value={data.installAddress} onChange={set} />
      <Field label="Other Sites" name="otherSites" value={data.otherSites} onChange={set} />
    </Sec>
    <Sec title="Project Overview / Scope"><Field label="Scope" hint="New Build / Rip & Replace / Adding to Existing." name="scopeOverview" value={data.scopeOverview} onChange={set} textarea /></Sec>
    <Sec title="Permitting">
      <div style={{ background: "#FFF8E7", border: "1px solid #F6C94E", borderRadius: 6, padding: "10px 12px", marginBottom: 12, fontSize: 12, lineHeight: 1.5, color: "#7A5C00" }}>
        <strong>Disclaimer:</strong> Permitting requirements vary by jurisdiction. It is the responsibility of the installing contractor and/or customer to verify all applicable permit requirements with local municipalities and the State Fire Marshall prior to installation. Some access control, electric locking hardware, and fire alarm integrations may require permits.
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13 }} onClick={() => set("permitAcknowledged", !data.permitAcknowledged)}>
        <span className="cb-box" style={data.permitAcknowledged ? { background: B.med, borderColor: B.med, color: "white", flexShrink: 0, marginTop: 1 } : { flexShrink: 0, marginTop: 1 }}>{data.permitAcknowledged ? "✓" : ""}</span>
        <span>I acknowledge that it is my responsibility to check with local municipalities and the State Fire Marshall to determine if permits are required for this installation.</span>
      </label>
      <div style={{ marginTop: 12 }}>
        <Field label="Permit Notes" name="permitNotes" value={data.permitNotes} onChange={set} textarea placeholder="e.g. Permit required – filed 6/1, contact city building dept. at 555-1234..." />
      </div>
    </Sec>
  </>);
}

function CctvTab({ data, set }: TabProps) {
  const cams = data.cameras || [{ ...EMPTY_CAM, id: "cam-1" }];
  const addCam = () => set("cameras", [...cams, { ...EMPTY_CAM, id: `cam-${Date.now()}` }]);
  const rmCam = (id: string) => { if (cams.length > 1) set("cameras", cams.filter(c => c.id !== id)); };
  const updCam = (id: string, f: string, v: FieldValue) => set("cameras", cams.map(c => c.id === id ? { ...c, [f]: v } : c));
  return (<>
    <Sec title="CCTV / Surveillance">
      <Field label="Scope" hint="Cameras, servers, switches needed?" name="cctvScope" value={data.cctvScope} onChange={set} textarea />
      <Field label="System Type" hint="New or Rip & Replace?" name="cctvSystemType" value={data.cctvSystemType} onChange={set} textarea />
      <Field label="Suggested Vendors" name="cctvVendors" value={data.cctvVendors} onChange={set} />
    </Sec>
    <Sec title={`Camera Locations \u2014 ${cams.length}`}>
      {cams.map((c, i) => <CamCard key={c.id} cam={c} index={i} total={cams.length} onUpdate={updCam} onRemove={rmCam} />)}
      <button className="add-btn" onClick={addCam}><PlusIcon /> Add Camera</button>
    </Sec>
    <Sec title="Recording & Storage">
      <CBGroup label="Recording Type" name="recordingType" options={["Cloud", "On-Prem (NVR/Server)"]} value={data.recordingType} onChange={set} />
      <div className="field-row"><Field label="Cloud Years" name="cloudYearsCctv" value={data.cloudYearsCctv} onChange={set} /><Field label="Retention" name="retention" value={data.retention} onChange={set} placeholder="30, 60, 90 days" /></div>
      <CBGroup label="Schedule" name="recordingSchedule" options={["24/7", "Motion Only"]} value={data.recordingSchedule} onChange={set} />
    </Sec>
    <Sec title="Features">
      <CBGroup label="Features" name="featuresRequired" options={["AI / Analytics", "LPR", "Audio Recording", "Covert Recording"]} value={data.featuresRequired} onChange={set} />
      <Field label="Audio Areas" name="audioAreas" value={data.audioAreas} onChange={set} />
      <Field label="Other Features" name="otherFeatures" value={data.otherFeatures} onChange={set} />
    </Sec>
    <Sec title="Existing System">
      <CBGroup label="Existing VMS" name="existingVms" options={["Rip & Replace", "Keep Some Cameras", "Adding to Existing"]} value={data.existingVms} onChange={set} />
      <Field label="Existing Vendor" name="existingVendorCctv" value={data.existingVendorCctv} onChange={set} />
      <Field label="Integrations" name="cctvIntegrations" value={data.cctvIntegrations} onChange={set} textarea />
      <Field label="Monitoring Stations" name="monitoringStations" value={data.monitoringStations} onChange={set} textarea />
    </Sec>
  </>);
}

function AccessTab({ data, set }: TabProps) {
  const doors = data.doors || [{ ...EMPTY_DOOR, id: "door-1" }];
  return (<>
    <Sec title="Access Control">
      <Field label="Scope" name="acScope" value={data.acScope} onChange={set} textarea />
      <Field label="System Type" name="acSystemType" value={data.acSystemType} onChange={set} textarea />
    </Sec>
    <Sec title={`Door Details \u2014 ${doors.length}`}>
      {doors.map((d, i) => (
        <DoorCard
          key={d.id}
          door={d}
          index={i}
          total={doors.length}
          onUpdate={(id, f, v) => set("doors", doors.map(dd => dd.id === id ? { ...dd, [f]: v } : dd))}
          onRemove={(id) => { if (doors.length > 1) set("doors", doors.filter(dd => dd.id !== id)); }}
        />
      ))}
      <button className="add-btn" onClick={() => set("doors", [...doors, { ...EMPTY_DOOR, id: `door-${Date.now()}` }])}><PlusIcon /> Add Door</button>
    </Sec>
    <Sec title="Credentials & System">
      <CBGroup label="Credential Type" name="credentialType" options={["RFID Card", "Key Fob", "Mobile", "Biometric", "Other"]} value={data.credentialType} onChange={set} />
      <CBGroup label="System Type" name="acCloudSystem" options={["On-Prem (Server)", "Cloud (Yearly License)"]} value={data.acCloudSystem} onChange={set} />
      <div className="field-row"><Field label="Cloud Years" name="acCloudYears" value={data.acCloudYears} onChange={set} /><Field label="User Capacity" name="userCapacity" value={data.userCapacity} onChange={set} /></div>
      <Field label="Vendors" name="acVendors" value={data.acVendors} onChange={set} />
    </Sec>
    <Sec title="Existing System">
      <CBGroup label="Existing AC" name="existingAc" options={["Replacing Entirely", "Adding to Existing"]} value={data.existingAc} onChange={set} />
      <Field label="Existing Vendor" name="existingVendorAc" value={data.existingVendorAc} onChange={set} />
      <Field label="Current Card Type" name="currentCardType" value={data.currentCardType} onChange={set} />
    </Sec>
    <Sec title="Fire Alarm"><Field label="Fire Alarm Panel" name="fireAlarm" value={data.fireAlarm} onChange={set} textarea /></Sec>
    <Sec title="Integrations & Programming">
      <Field label="Integrations" name="acIntegrations" value={data.acIntegrations} onChange={set} textarea />
      <Field label="Programming Notes" name="acProgramming" value={data.acProgramming} onChange={set} textarea />
    </Sec>
  </>);
}

function SiteTab({ data, set }: TabProps) {
  return (<>
    <Sec title="Network">
      <Field label="DHCP or Static" name="networkType" value={data.networkType} onChange={set} />
      <Field label="VLAN / Subnet" name="vlan" value={data.vlan} onChange={set} />
      <Field label="Subnet Details" name="subnetDetails" value={data.subnetDetails} onChange={set} />
      <CBGroup label="Remote Access" name="remoteAccess" options={["Yes", "No"]} value={data.remoteAccess} onChange={set} />
    </Sec>
    <Sec title="Customer Equipment"><Field label="Equipment" name="custEquipment" value={data.custEquipment} onChange={set} textarea /></Sec>
    <Sec title="Ceilings & Wire Paths">
      <CBGroup label="Ceiling Types" name="ceilingTypes" options={["Drop Tile", "Hard Ceiling", "Mixed", "Open Space"]} value={data.ceilingTypes} onChange={set} />
      <div className="field-row"><CBGroup label="Plenum" name="plenumSpace" options={["Yes", "No"]} value={data.plenumSpace} onChange={set} /><CBGroup label="Crawl Space" name="crawlSpace" options={["Yes", "No"]} value={data.crawlSpace} onChange={set} /></div>
      <div className="field-row"><Field label="Ceiling Height" name="ceilingHeight" value={data.ceilingHeight} onChange={set} /><Field label="Wall Types" name="wallTypes" value={data.wallTypes} onChange={set} /></div>
    </Sec>
    <Sec title="Conduit & Raceway"><Field label="Conduit" name="conduit" value={data.conduit} onChange={set} textarea /></Sec>
    <Sec title="MDF / IDF"><Field label="Rack Space" name="rackSpace" value={data.rackSpace} onChange={set} textarea /></Sec>
    <Sec title="Site Access">
      <CBGroup label="Lifts" name="lifts" options={["Available On-Site", "Need to Provide", "Tall Ladder Rental"]} value={data.lifts} onChange={set} />
      <CBGroup label="Blueprints" name="blueprints" options={["Yes (PDF/DWG)", "Evacuation Plan Only", "Not Available"]} value={data.blueprints} onChange={set} />
    </Sec>
    <Sec title="Electrical"><Field label="Electrical Needed" name="electrical" value={data.electrical} onChange={set} textarea /></Sec>
  </>);
}

function AdditionalTab({ data, set }: TabProps) {
  return (<>
    <Sec title="Additional Requirements">
      <Field label="Service Contracts" name="serviceContracts" value={data.serviceContracts} onChange={set} textarea />
      <CBGroup label="Training" name="training" options={["Full Detailed", "Basic Only"]} value={data.training} onChange={set} />
      <Field label="3rd-Party Integrations" name="thirdParty" value={data.thirdParty} onChange={set} textarea />
      <Field label="Special Programming" name="specialProgramming" value={data.specialProgramming} onChange={set} textarea />
      <Field label="Additional Products" name="additionalProducts" value={data.additionalProducts} onChange={set} textarea />
    </Sec>
    <Sec title="Notes"><Field label="Notes" name="notes" value={data.notes} onChange={set} textarea /></Sec>
    <Sec title="Sign-Off">
      <div className="field-row"><Field label="Completed By" name="completedBy" value={data.completedBy} onChange={set} /><Field label="Date" name="completedDate" value={data.completedDate} onChange={set} type="date" /></div>
      <SignaturePad value={data.signature} onChange={(v: string) => set("signature", v)} />
    </Sec>
  </>);
}

const CCTV_CL = ["Camera locations & views","Existing cameras","MDF/IDF rooms","Ceiling types & wiring","Equipment close-ups","Lighting conditions","Cable paths","Floor plans marked"];
const AC_CL = ["Door both sides","Jamb & strike","Handle/lock/push bar","Frame type","Controllers","Fire alarm panel","AC equipment close-ups","Floor plans with doors"];
const GEN_CL = ["Walls near equipment","Conduit & raceway","Rack / IDF / MDF","Photos grouped & labeled"];

function PhotosTab({ data, set }: TabProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const photos = data.photos || [];
  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => { if (ev.target?.result) set("photos", [...(data.photos || []), { id: Date.now() + Math.random(), data: ev.target.result as string, label: f.name.replace(/\.[^.]+$/, "") }]); };
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const CL = ({ title, items }: { title: string; items: string[] }) => (
    <>
      <SubH text={title} />
      {items.map(it => (
        <div key={it} className="cl-item">
          <div className={`cl-check ${checks[it] ? "done" : ""}`} onClick={() => setChecks(p => ({ ...p, [it]: !p[it] }))}>{checks[it] ? "\u2713" : ""}</div>
          <span>{it}</span>
        </div>
      ))}
    </>
  );
  return (<>
    <Sec title="General Photos">
      <div style={{ fontSize: 11, color: B.muted, marginBottom: 10, fontStyle: "italic" }}>General site photos. Door/camera photos attach to their cards.</div>
      <div className="photo-grid">
        {photos.map(p => (
          <div key={p.id} className="photo-thumb">
            <img src={p.data} alt={p.label} />
            <button className="photo-rm" onClick={() => set("photos", photos.filter(x => x.id !== p.id))}>x</button>
            <input className="photo-lbl" value={p.label} onChange={(e: ChangeEvent<HTMLInputElement>) => set("photos", photos.map(x => x.id === p.id ? { ...x, label: e.target.value } : x))} placeholder="Label..." />
          </div>
        ))}
        <div className="photo-add" onClick={() => ref.current?.click()}><PlusIcon /><span>Add</span></div>
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handleFiles} />
    </Sec>
    <Sec title="Checklist"><CL title="CCTV" items={CCTV_CL} /><CL title="Access Control" items={AC_CL} /><CL title="General" items={GEN_CL} /></Sec>
  </>);
}

// ── PDF Export ──
async function exportPDF(data: SurveyData, brand: Brand): Promise<void> {
  const w = window as JsPdfWindow;
  if (!w.jspdf) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
  }
  if (!w.jspdf) throw new Error("jsPDF not available");
  const { jsPDF } = w.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" }) as JsPdfDoc;
  const W = 612, H = 792, M = 50, CW = W - M * 2;
  let y = M;
  const companyName = brand.name || "Physical Security";

  const checkPage = (n: number = 40) => { if (y + n > H - M) { doc.addPage(); y = M; } };
  const secHead = (t: string) => { checkPage(50); doc.setFillColor(27, 58, 92); doc.rect(M, y, CW, 22, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text(t, M + 8, y + 15); y += 30; doc.setTextColor(0, 0, 0); };
  const subHead = (t: string) => { checkPage(30); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(46, 117, 182); doc.text(t, M, y + 10); y += 14; doc.setDrawColor(213, 232, 240); doc.line(M, y, M + CW, y); y += 8; doc.setTextColor(0, 0, 0); };
  const fl = (l: string, v: unknown) => {
    if (!v || (Array.isArray(v) && !v.length) || (typeof v === "string" && !v.trim())) return;
    const s = Array.isArray(v) ? v.join(", ") : String(v);
    checkPage(16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(l + ":", M + 4, y + 10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(s, CW - 120);
    doc.text(lines, M + 120, y + 10);
    y += Math.max(14, lines.length * 11);
  };
  const wf = (l: string, v: unknown) => {
    if (!v) return;
    checkPage(16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(l + ":", M + 4, y + 10);
    y += 14;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(v), CW - 8);
    checkPage(lines.length * 11);
    doc.text(lines, M + 8, y + 2);
    y += lines.length * 11 + 6;
  };

  // Title
  if (brand.logo) {
    try {
      doc.addImage(brand.logo, "PNG", M, y, 40, 40);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(27, 58, 92);
      doc.text(companyName, M + 50, y + 18);
      if (brand.tagline) { doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text(brand.tagline, M + 50, y + 30); }
      y += 48;
    } catch {
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(27, 58, 92);
      doc.text(companyName, W / 2, y + 16, { align: "center" });
      y += 24;
    }
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(27, 58, 92);
    doc.text(companyName.toUpperCase(), W / 2, y + 16, { align: "center" });
    y += 22;
    if (brand.tagline) { doc.setFontSize(10); doc.setTextColor(100, 100, 100); doc.text(brand.tagline, W / 2, y + 10, { align: "center" }); y += 16; }
  }
  doc.setFontSize(12); doc.setTextColor(46, 117, 182);
  doc.text("SITE SURVEY REPORT", W / 2, y + 14, { align: "center" });
  y += 24;
  doc.setDrawColor(27, 58, 92); doc.setLineWidth(2); doc.line(M, y, M + CW, y); y += 16;
  doc.setTextColor(0, 0, 0);

  secHead("PROJECT INFORMATION");
  fl("OPP #", data.opp); fl("Date", data.walkDate); fl("Project", data.projectName); fl("By", data.walkBy);
  fl("Customer", data.customerName); fl("Install Date", data.installDate); fl("POC", data.pocName); fl("Email", data.pocEmail);
  fl("Budget", data.targetBudget); fl("Timeline", data.timeline);
  fl("Cust Addr", data.customerAddress); fl("Install Addr", data.installAddress); fl("Other", data.otherSites);
  wf("Scope", data.scopeOverview);

  secHead("CCTV / SURVEILLANCE");
  wf("Scope", data.cctvScope); wf("System Type", data.cctvSystemType); fl("Vendors", data.cctvVendors);
  const cams = data.cameras || [];
  if (cams.length) {
    subHead(`CAMERAS (${cams.length})`);
    cams.forEach((c, i) => {
      checkPage(60);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(`Camera ${i + 1}: ${c.location || ""}`, M + 4, y + 10); y += 14;
      doc.setFont("helvetica", "normal");
      fl("  Type", c.type); fl("  Mount", c.mounting); fl("  Height", c.height);
      fl("  Int/Ext", c.interior ? "Interior" : "Exterior");
      if (c.view) wf("  View", c.view);
      if (c.notes) fl("  Notes", c.notes);
      if ((c.photos || []).length) fl("  Photos", `${c.photos.length} attached`);
    });
  }
  fl("Recording", data.recordingType); fl("Cloud Yrs", data.cloudYearsCctv); fl("Retention", data.retention);
  fl("Schedule", data.recordingSchedule); fl("Features", data.featuresRequired); fl("Audio", data.audioAreas);
  fl("VMS", data.existingVms); fl("VMS Vendor", data.existingVendorCctv);
  wf("Integrations", data.cctvIntegrations); wf("Monitoring", data.monitoringStations);

  secHead("ACCESS CONTROL");
  wf("Scope", data.acScope); wf("Type", data.acSystemType);
  const doors = data.doors || [];
  if (doors.length) {
    subHead(`DOORS (${doors.length})`);
    doors.forEach((d, i) => {
      checkPage(60);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(`Door ${i + 1}: ${d.location || ""}`, M + 4, y + 10); y += 14;
      doc.setFont("helvetica", "normal");
      fl("  Type", d.type); fl("  Frame", d.frame); fl("  Lock", d.lockStyle);
      fl("  HW", d.existingHardware); fl("  Reader", d.readerSide);
      if (d.ada) fl("  ADA", "Yes");
      if (d.notes) fl("  Notes", d.notes);
      if ((d.photos || []).length) fl("  Photos", `${d.photos.length} attached`);
    });
  }
  fl("Credentials", data.credentialType); fl("System", data.acCloudSystem); fl("Cloud Yrs", data.acCloudYears);
  fl("Users", data.userCapacity); fl("Vendors", data.acVendors); fl("Existing", data.existingAc);
  fl("Vendor", data.existingVendorAc); fl("Cards", data.currentCardType);
  wf("Fire Alarm", data.fireAlarm);
  fl("Permit Acknowledged", data.permitAcknowledged ? "Yes – contractor/customer confirmed permit check with local municipalities and State Fire Marshall" : "No – not yet acknowledged");
  wf("Permit Notes", data.permitNotes);
  wf("Integrations", data.acIntegrations); wf("Programming", data.acProgramming);

  secHead("SITE & INFRASTRUCTURE");
  fl("Network", data.networkType); fl("VLAN", data.vlan); fl("Subnet", data.subnetDetails);
  fl("Remote", data.remoteAccess); wf("Equipment", data.custEquipment);
  fl("Ceilings", data.ceilingTypes); fl("Plenum", data.plenumSpace); fl("Crawl", data.crawlSpace);
  fl("Height", data.ceilingHeight); fl("Walls", data.wallTypes);
  wf("Conduit", data.conduit); wf("Rack", data.rackSpace);
  fl("Lifts", data.lifts); fl("Plans", data.blueprints); wf("Electrical", data.electrical);

  secHead("ADDITIONAL");
  wf("Service Contracts", data.serviceContracts); fl("Training", data.training);
  wf("3rd Party", data.thirdParty); wf("Special", data.specialProgramming);
  wf("Products", data.additionalProducts); wf("Notes", data.notes);

  // Photos
  const allP: Array<Photo & { sec: string }> = [
    ...(data.photos || []).map(p => ({ ...p, sec: "General" })),
    ...(data.cameras || []).flatMap((c, i) => (c.photos || []).map(p => ({ ...p, sec: `Camera ${i + 1}` }))),
    ...(data.doors || []).flatMap((d, i) => (d.photos || []).map(p => ({ ...p, sec: `Door ${i + 1}` }))),
  ];
  if (allP.length) {
    doc.addPage(); y = M;
    secHead(`PHOTOS (${allP.length})`);
    for (const p of allP) {
      if (!p.data) continue;
      checkPage(130);
      try {
        doc.addImage(p.data, "JPEG", M, y, 120, 90);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7);
        doc.text(p.sec, M + 130, y + 10);
        doc.setFont("helvetica", "normal");
        doc.text(p.label || "", M + 130, y + 22);
        y += 100;
      } catch { y += 16; }
    }
  }

  // Signature
  if (data.signature) {
    checkPage(80);
    doc.setDrawColor(27, 58, 92); doc.line(M, y, M + CW, y); y += 12;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Signature:", M, y + 10); y += 16;
    try { doc.addImage(data.signature, "PNG", M, y, 200, 50); y += 56; } catch {}
    fl("Completed By", data.completedBy); fl("Date", data.completedDate);
  } else {
    checkPage(30);
    doc.setDrawColor(27, 58, 92); doc.line(M, y, M + CW, y); y += 12;
    fl("Completed By", data.completedBy); fl("Date", data.completedDate);
  }

  const pages = doc.getNumberOfPages();
  const stamp = `Generated ${new Date().toLocaleDateString()}`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text(companyName, M, H - 34);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 34, { align: "right" });
    doc.setFontSize(6); doc.setTextColor(180, 180, 180);
    doc.text(stamp, M, H - 25);
    doc.setTextColor(0, 0, 0);
  }
  doc.save(`Survey_${data.opp || "DRAFT"}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Text export ──
function buildReport(data: SurveyData, brand: Brand): string {
  const L: string[] = []; const hr = "=".repeat(56); const co = brand.name || "Physical Security";
  const add = (l: string, v: unknown) => {
    if (!v || (Array.isArray(v) && !v.length) || (typeof v === "string" && !v.trim())) return;
    L.push(`  ${l}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  };
  L.push(hr, `  ${co.toUpperCase()} - SITE SURVEY REPORT`, hr, "");
  L.push("-- PROJECT --");
  add("OPP", data.opp); add("Date", data.walkDate); add("Project", data.projectName); add("By", data.walkBy);
  add("Customer", data.customerName); add("Install", data.installDate); add("POC", data.pocName); add("Email", data.pocEmail);
  add("Budget", data.targetBudget); add("Timeline", data.timeline);
  add("Cust Addr", data.customerAddress); add("Install Addr", data.installAddress);
  add("Scope", data.scopeOverview); L.push("");
  L.push("-- CCTV --"); add("Scope", data.cctvScope); add("Type", data.cctvSystemType); add("Vendors", data.cctvVendors);
  (data.cameras || []).forEach((c, i) => {
    L.push(`  --- Camera ${i + 1} ---`);
    add("  Loc", c.location); add("  Type", c.type); add("  Mount", c.mounting);
    add("  Height", c.height); add("  Int/Ext", c.interior ? "Interior" : "Exterior");
    add("  View", c.view); add("  Notes", c.notes);
  });
  add("Recording", data.recordingType); add("Retention", data.retention);
  add("Features", data.featuresRequired); add("VMS", data.existingVms); L.push("");
  L.push("-- ACCESS CONTROL --"); add("Scope", data.acScope); add("Type", data.acSystemType);
  (data.doors || []).forEach((d, i) => {
    L.push(`  --- Door ${i + 1} ---`);
    add("  Loc", d.location); add("  Type", d.type); add("  Frame", d.frame);
    add("  Lock", d.lockStyle); add("  HW", d.existingHardware); add("  Reader", d.readerSide);
    if (d.ada) add("  ADA", "Yes"); add("  Notes", d.notes);
  });
  add("Creds", data.credentialType); add("System", data.acCloudSystem); add("Fire", data.fireAlarm);
  add("Permit Acknowledged", data.permitAcknowledged ? "Yes – confirmed permit check with local municipalities and State Fire Marshall" : "Not yet acknowledged");
  add("Permit Notes", data.permitNotes);
  L.push("");
  L.push("-- SITE --");
  add("Network", data.networkType); add("VLAN", data.vlan); add("Ceilings", data.ceilingTypes);
  add("Conduit", data.conduit); add("Rack", data.rackSpace); add("Lifts", data.lifts);
  add("Plans", data.blueprints); add("Electrical", data.electrical); L.push("");
  L.push("-- ADDITIONAL --");
  add("Service", data.serviceContracts); add("Training", data.training); add("Notes", data.notes); L.push("");
  L.push(hr); add("Completed By", data.completedBy); add("Date", data.completedDate); L.push(hr);
  L.push(`  Generated ${new Date().toLocaleDateString()}`);
  return L.join("\n");
}

// ── Surveys Modal ──
function SurveysModal({ currentId, onOpen, onNew, onClose }: {
  currentId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    listSurveys()
      .then(r => setRows(r))
      .catch(e => setErr(e instanceof Error ? e.message : "Could not load surveys"))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this survey from this device? This cannot be undone.")) return;
    try {
      await deleteSurvey(id);
      setRows(r => r.filter(x => x.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete survey");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Surveys</h2>
        {err && <div className="acct-err">{err}</div>}
        {loading ? (
          <div className="srv-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="srv-empty">No saved surveys yet. Your current draft saves automatically on this device.</div>
        ) : (
          <div className="srv-list">
            {rows.map(r => (
              <div key={r.id} className="srv-row">
                <div className="srv-main" onClick={() => onOpen(r.id)}>
                  <strong>{r.site_name || r.customer_name || r.opp_number || "Untitled survey"}</strong>
                  <span>
                    {r.customer_name ? `${r.customer_name} · ` : ""}
                    {new Date(r.updated_at).toLocaleDateString()}
                  </span>
                </div>
                {r.id === currentId && <span className="srv-cur">OPEN</span>}
                <button className="srv-rm" onClick={() => remove(r.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
        <button className="mbtn pri" onClick={onNew}><PlusIcon /> New Survey</button>
        <button className="mbtn can" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [tab, setTab] = useState<TabId>("project");
  const [data, setData] = useState<SurveyData>(INITIAL);
  const [modal, setModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [surveysModal, setSurveysModal] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [brand, setBrand] = useState<Brand>({ name: "", logo: "", tagline: "" });
  // Set before a programmatic setData so the save effect doesn't echo its own write.
  const skipSave = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setData(p => ({ ...p, ...JSON.parse(s) })); } catch {}
    try { setSurveyId(localStorage.getItem(SURVEY_ID_KEY)); } catch {}
    loadBrand().then(setBrand).catch(() => {});
    setLoaded(true);
  }, []);

  const updateBrand = async (b: Brand) => {
    await saveBrand(b);
    setBrand(b);
  };

  // Saves the survey, photos included, to this device's survey list.
  useEffect(() => {
    if (!loaded) return;
    if (!mounted.current) { mounted.current = true; return; }
    if (skipSave.current) { skipSave.current = false; return; }
    const t = setTimeout(async () => {
      setSyncState("saving");
      try {
        const id = await saveSurvey(surveyId, data);
        if (id !== surveyId) {
          setSurveyId(id);
          try { localStorage.setItem(SURVEY_ID_KEY, id); } catch {}
        }
        setSyncState("saved");
      } catch {
        setSyncState("error");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [data, loaded, surveyId]);

  const openSurvey = async (id: string) => {
    setSurveysModal(false);
    setSyncState("saving");
    try {
      const payload = await loadSurvey(id);
      skipSave.current = true;
      setData({ ...INITIAL, ...(payload as Partial<SurveyData>) });
      setSurveyId(id);
      try { localStorage.setItem(SURVEY_ID_KEY, id); } catch {}
      setSyncState("saved");
      flash("Survey loaded");
    } catch {
      setSyncState("error");
      flash("Could not load survey");
    }
  };

  const newSurvey = () => {
    setSurveysModal(false);
    skipSave.current = true;
    setData({ ...INITIAL });
    setSurveyId(null);
    try { localStorage.removeItem(SURVEY_ID_KEY); localStorage.removeItem(STORAGE_KEY); } catch {}
    setSyncState("idle");
    flash("New survey started");
  };

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...data,
            photos: [],
            cameras: (data.cameras || []).map(c => ({ ...c, photos: [] })),
            doors: (data.doors || []).map(d => ({ ...d, photos: [] })),
          }));
        }
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const set = useCallback<SetField>((n, v) => setData(p => ({ ...p, [n]: v })), []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const dl = (c: string, n: string, m: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([c], { type: m }));
    a.download = n;
    a.click();
  };

  const handlePDF = async () => {
    setExporting(true);
    try { await exportPDF(data, brand); flash("PDF exported"); }
    catch { flash("PDF error"); }
    setExporting(false);
    setModal(false);
  };

  const renderTab = () => {
    switch (tab) {
      case "project": return <ProjectTab data={data} set={set} />;
      case "cctv": return <CctvTab data={data} set={set} />;
      case "access": return <AccessTab data={data} set={set} />;
      case "site": return <SiteTab data={data} set={set} />;
      case "additional": return <AdditionalTab data={data} set={set} />;
      case "photos": return <PhotosTab data={data} set={set} />;
      default: return null;
    }
  };

  const headerTitle = brand.name || "SiteWalkSurvey";
  const headerSub = brand.tagline || "Scope it right the first time";

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div className="header-top">
            <div className="header-brand">
              {brand.logo && <img src={brand.logo} alt="Logo" className="header-logo" />}
              <div className="header-text">
                <h1>{headerTitle}</h1>
                <div className="header-sub">{headerSub}</div>
              </div>
            </div>
            <div className="header-actions">
              {syncState !== "idle" && (
                <span className="sync-pill">
                  {syncState === "saving" ? "Saving…"
                    : syncState === "saved" ? "Saved"
                    : "Save failed"}
                </span>
              )}
              <button className="hbtn" onClick={() => setSurveysModal(true)}><ListIcon /></button>
              <button className="hbtn" onClick={() => setSettingsModal(true)}><GearIcon /></button>
              <button className="hbtn danger" onClick={() => {
                if (confirm("Clear this draft and start a new survey? The saved copy stays in your Surveys list.")) {
                  newSurvey();
                }
              }}>Clear</button>
              <button className="hbtn accent" onClick={() => setModal(true)}>Export</button>
            </div>
          </div>
        </div>
        <div className="tabs">
          {TABS.map(t => {
            const Icon = TAB_ICONS[t.id];
            return (
              <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                <Icon />{t.label}
              </button>
            );
          })}
        </div>
        <div className="content">{renderTab()}</div>

        {modal && (
          <div className="modal-overlay" onClick={() => setModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Export Survey</h2>
              <button className="mbtn pri" onClick={handlePDF} disabled={exporting}>
                <PdfIcon />{exporting ? "Generating..." : "Download PDF Report"}
              </button>
              <button className="mbtn sec" onClick={() => {
                dl(buildReport(data, brand), `Survey_${data.opp || "DRAFT"}_${new Date().toISOString().slice(0, 10)}.txt`, "text/plain");
                setModal(false); flash("Exported");
              }}><DlIcon /> Download Text</button>
              <button className="mbtn sec" onClick={() => {
                dl(JSON.stringify(data, null, 2), `Survey_${data.opp || "DRAFT"}_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
                setModal(false); flash("JSON exported");
              }}><JsonIcon /> Download JSON</button>
              <button className="mbtn sec" onClick={async () => {
                const t = buildReport(data, brand);
                // White-label: the share sheet shows the survey's own identity,
                // never this product's name.
                const shareTitle = `${data.projectName || data.customerName || "Site"} — Survey Report`;
                if (navigator.share) { try { await navigator.share({ title: shareTitle, text: t }); } catch {} }
                else { await navigator.clipboard.writeText(t); flash("Copied"); }
                setModal(false);
              }}><ShareIcon /> {typeof navigator !== "undefined" && "share" in navigator ? "Share" : "Copy"}</button>
              <button className="mbtn can" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        )}

        {settingsModal && <SettingsModal brand={brand} onSave={updateBrand} onClose={() => setSettingsModal(false)} />}
        {surveysModal && (
          <SurveysModal
            currentId={surveyId}
            onOpen={openSurvey}
            onNew={newSurvey}
            onClose={() => setSurveysModal(false)}
          />
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
