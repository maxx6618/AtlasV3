/**
 * ═══════════════════════════════════════════════════════════
 * DEMO SERVICE – Full Product Walkthrough Data & Orchestration
 * ═══════════════════════════════════════════════════════════
 *
 * ALL data in this file is ENTIRELY FICTIONAL.
 * No real company names, persons, or contact details.
 *
 * To remove the demo: delete this file + DemoChatOverlay.tsx
 * + DemoHubspotModal.tsx + DemoTargetCounter.tsx + demoVoiceService.ts
 * and revert small changes in App.tsx / LoginPage.tsx.
 * ═══════════════════════════════════════════════════════════
 */

import { VerticalData, ColumnType, ColumnDefinition, RowData, SheetTab } from '../types';
import { COMPANY_COLUMNS, PERSON_COLUMNS } from '../constants';
import { playKeyClick } from './demoVoiceService';

// ── Demo Step Definitions ──────────────────────────────────

export type DemoStep =
  | 'DISCLAIMER'
  | 'LOGIN_TYPE_EMAIL'
  | 'LOGIN_TYPE_PASSWORD'
  | 'LOGIN_SUBMIT'
  | 'WAIT_FOR_APP'
  | 'CHAT_WELCOME'
  | 'CHAT_USER_YES'
  | 'CHAT_HOW_HELP'
  | 'CHAT_USER_UPLOAD'
  | 'UPLOAD_1_OPEN'
  | 'UPLOAD_1_MAPPING'
  | 'UPLOAD_1_DONE'
  | 'CHAT_MORE_SOURCES'
  | 'CHAT_USER_CRM'
  | 'UPLOAD_2_OPEN'
  | 'UPLOAD_2_MERGE'
  | 'CHAT_VERTICAL_ASK'
  | 'CHAT_USER_VERTICAL'
  | 'CHAT_VERTICAL_REFINE'
  | 'CHAT_LOOKALIKES'
  | 'CLASSIFY_RUN'
  | 'CLASSIFY_RESULT'
  | 'CHAT_EMPLOYEE_ASK'
  | 'EMPLOYEE_FILTER'
  | 'CHAT_OWNERSHIP_ASK'
  | 'OWNERSHIP_RUN'
  | 'CHAT_PEOPLE_ASK'
  | 'PEOPLE_CREATE'
  | 'CHAT_CONTACTS_ASK'
  | 'CONTACTS_POPULATE'
  | 'CHAT_CRM_ASK'
  | 'HUBSPOT_LOGIN'
  | 'HUBSPOT_SYNC'
  | 'CHAT_WRAP_UP'
  | 'CHAT_AI_MATCHING'
  | 'CHAT_AGENT_ASK'
  | 'AGENT_SHOW'
  | 'CHAT_LIGHT_JOKE'
  | 'SCORING_ASK'
  | 'SCORING_RUN'
  | 'CHAT_EMPLOYEE_SOURCE'
  | 'SCREENSHOT_INTRO'
  | 'SCREENSHOT_UPLOAD'
  | 'RESET_TO_LOGIN'
  | 'DONE';

// ── Message Types ──────────────────────────────────────────

export interface DemoMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  voiceText?: string; // TTS-optimized (no emojis)
  isTyping?: boolean;
  buttons?: DemoChatButton[];
}

export interface DemoChatButton {
  id: string;
  label: string;
}

// ── Credentials ────────────────────────────────────────────

export const DEMO_EMAIL = 'jarvis@nextgen-equity.com';
export const DEMO_PASSWORD = 'Atlas2026!';

// ── Chat Messages (English) ────────────────────────────────

export const MSG = {
  // Phase 1: Onboarding
  welcome: {
    id: 'msg-welcome',
    sender: 'bot' as const,
    text: 'Welcome to Atlas, your AI-powered sourcing engine by NextGen. 👋 Would you like some help getting started?',
    voiceText: 'Welcome to Atlas, your AI-powered sourcing engine by NextGen. Would you like some help getting started?',
  },
  userYes: {
    id: 'msg-user-yes',
    sender: 'user' as const,
    text: "Yes, let's go!",
    voiceText: "Yes, let's go!",
  },
  howHelp: {
    id: 'msg-how-help',
    sender: 'bot' as const,
    text: 'Great! What would you like to do?',
    voiceText: 'Great! What would you like to do?',
    buttons: [
      { id: 'upload', label: '📤 Upload a list' },
      { id: 'vertical', label: '📊 Create new vertical' },
      { id: 'enrich', label: '🔍 Enrich data' },
    ],
  },
  userUpload: {
    id: 'msg-user-upload',
    sender: 'user' as const,
    text: 'Upload a list',
    voiceText: 'I would like to upload a list.',
  },

  // Phase 2: Uploads
  upload1Prompt: {
    id: 'msg-upload1',
    sender: 'bot' as const,
    text: 'Go ahead and drag your file into the upload area, or select one from your computer.',
    voiceText: 'Go ahead and drag your file into the upload area, or select one from your computer.',
  },
  upload1Done: {
    id: 'msg-upload1-done',
    sender: 'bot' as const,
    text: '✅ Done! 100 companies imported successfully.',
    voiceText: 'Done! 100 companies imported successfully.',
  },
  moreSources: {
    id: 'msg-more-sources',
    sender: 'bot' as const,
    text: 'Do you have any additional data sources? For example, a CRM export?',
    voiceText: 'Do you have any additional data sources? For example, a CRM export?',
  },
  userCrm: {
    id: 'msg-user-crm',
    sender: 'user' as const,
    text: 'Yes, I have a Salesforce export as well.',
    voiceText: 'Yes, I have a Salesforce export as well.',
  },
  mergeAsk: {
    id: 'msg-merge-ask',
    sender: 'bot' as const,
    text: 'I detected 20 duplicates across both lists. Shall I merge them?',
    voiceText: 'I detected 20 duplicates across both lists. Shall I merge them?',
    buttons: [
      { id: 'merge-yes', label: '✅ Yes, merge' },
      { id: 'merge-no', label: '❌ No, keep separate' },
    ],
  },
  userMergeYes: {
    id: 'msg-user-merge-yes',
    sender: 'user' as const,
    text: 'Yes, please.',
    voiceText: 'Yes, please merge them.',
  },
  mergeResult: {
    id: 'msg-merge-result',
    sender: 'bot' as const,
    text: '✅ Lists merged. 110 unique companies ready for analysis.',
    voiceText: 'Lists merged. 110 unique companies ready for analysis.',
  },

  // Phase 3: Vertical refinement
  verticalAsk: {
    id: 'msg-vertical-ask',
    sender: 'bot' as const,
    text: '130 companies loaded. Ready to start the analysis — what vertical are you targeting?',
    voiceText: '130 companies loaded. Ready to start the analysis. What vertical are you targeting?',
  },
  userVertical: {
    id: 'msg-user-vertical',
    sender: 'user' as const,
    text: 'SAP integration in IT services.',
    voiceText: 'S A P integration in IT services.',
  },
  verticalRefine1: {
    id: 'msg-refine1',
    sender: 'bot' as const,
    text: 'Got it. Are you focusing on S/4HANA migration specifically, or SAP consulting in general?',
    voiceText: 'Got it. Are you focusing on S 4 HANA migration specifically, or S A P consulting in general?',
  },
  userRefine1: {
    id: 'msg-user-refine1',
    sender: 'user' as const,
    text: 'S/4HANA and cloud integration.',
    voiceText: 'S 4 HANA and cloud integration.',
  },
  verticalRefine2: {
    id: 'msg-refine2',
    sender: 'bot' as const,
    text: 'Perfect. Shall we start the classification? I can also suggest some lookalike companies.',
    voiceText: 'Perfect. Shall we start the classification? I can also suggest some lookalike companies.',
  },
  userClassifyYes: {
    id: 'msg-user-classify',
    sender: 'user' as const,
    text: 'Yes, go ahead.',
    voiceText: 'Yes, go ahead.',
  },
  lookalikes: {
    id: 'msg-lookalikes',
    sender: 'bot' as const,
    text: 'Based on your criteria, here are some lookalike suggestions:',
    voiceText: 'Based on your criteria, here are some lookalike suggestions.',
    buttons: [
      { id: 'like-1', label: '✅ Taunus IT Consulting GmbH' },
      { id: 'like-2', label: '✅ Oberrhein Cloud AG' },
      { id: 'like-3', label: '❌ Münchner Maschinenbau KG' },
    ],
  },

  // Phase 4: Progressive enrichment
  classifyRun: {
    id: 'msg-classify-run',
    sender: 'bot' as const,
    text: '⚙️ Running classification across all companies...',
    voiceText: 'Running classification across all companies.',
  },
  classifyResult: {
    id: 'msg-classify-result',
    sender: 'bot' as const,
    text: '105 out of 130 companies show SAP relevance. 25 filtered out.',
    voiceText: '105 out of 130 companies show S A P relevance. 25 have been filtered out.',
  },
  employeeAsk: {
    id: 'msg-employee-ask',
    sender: 'bot' as const,
    text: 'Is there an employee range we should consider?',
    voiceText: 'Is there an employee range we should consider?',
  },
  userEmployee: {
    id: 'msg-user-employee',
    sender: 'user' as const,
    text: 'Yes, 50 to 200 employees.',
    voiceText: 'Yes, 50 to 200 employees.',
  },
  employeeResult: {
    id: 'msg-employee-result',
    sender: 'bot' as const,
    text: 'Filtered by employee count. 52 companies remaining.',
    voiceText: 'Filtered by employee count. 52 companies remaining.',
  },
  ownershipAsk: {
    id: 'msg-ownership-ask',
    sender: 'bot' as const,
    text: 'Would you like to analyze ownership structures? This helps identify buy-and-build targets.',
    voiceText: 'Would you like to analyze ownership structures? This helps identify buy and build targets.',
  },
  userOwnershipYes: {
    id: 'msg-user-ownership',
    sender: 'user' as const,
    text: "Yes, let's do that.",
    voiceText: "Yes, let's do that.",
  },
  ownershipRun: {
    id: 'msg-ownership-run',
    sender: 'bot' as const,
    text: '⚙️ Analyzing ownership structures...',
    voiceText: 'Analyzing ownership structures.',
  },
  ownershipResult: {
    id: 'msg-ownership-result',
    sender: 'bot' as const,
    text: 'Ownership analysis complete. 21 corporate-owned removed. 31 qualified targets remaining — mostly family-owned and founder-led.',
    voiceText: 'Ownership analysis complete. 21 corporate owned removed. 31 qualified targets remaining. Mostly family owned and founder led.',
  },

  // Phase 5: People + contacts
  peopleAsk: {
    id: 'msg-people-ask',
    sender: 'bot' as const,
    text: '31 qualified targets. Shall I identify the management team and shareholders?',
    voiceText: '31 qualified targets. Shall I identify the management team and shareholders?',
  },
  userPeopleYes: {
    id: 'msg-user-people',
    sender: 'user' as const,
    text: 'Yes, please.',
    voiceText: 'Yes, please.',
  },
  peopleDone: {
    id: 'msg-people-done',
    sender: 'bot' as const,
    text: '✅ 45 key contacts identified across 31 companies. Created a new "Persons" tab.',
    voiceText: '45 key contacts identified across 31 companies. Created a new Persons tab.',
  },
  contactsAsk: {
    id: 'msg-contacts-ask',
    sender: 'bot' as const,
    text: 'Would you like contact details? I can pull addresses, email, and phone numbers.',
    voiceText: 'Would you like contact details? I can pull addresses, email, and phone numbers.',
    buttons: [
      { id: 'contacts-all', label: '📋 Yes, all of them' },
      { id: 'contacts-email', label: '📧 Email only' },
      { id: 'contacts-skip', label: '⏭️ Skip for now' },
    ],
  },
  userContactsAll: {
    id: 'msg-user-contacts',
    sender: 'user' as const,
    text: 'Yes, all of them please.',
    voiceText: 'Yes, all of them please.',
  },
  contactsDone: {
    id: 'msg-contacts-done',
    sender: 'bot' as const,
    text: '✅ Contact details enriched — addresses, emails, and phone numbers added.',
    voiceText: 'Contact details enriched. Addresses, emails, and phone numbers added.',
  },

  // Phase 6: CRM Sync
  crmAsk: {
    id: 'msg-crm-ask',
    sender: 'bot' as const,
    text: 'What would you like to do with the data? Shall I push it to a CRM?',
    voiceText: 'What would you like to do with the data? Shall I push it to a CRM?',
    buttons: [
      { id: 'crm-hubspot', label: '🟠 Push to HubSpot' },
      { id: 'crm-salesforce', label: '☁️ Push to Salesforce' },
      { id: 'crm-export', label: '📥 Export as CSV' },
    ],
  },
  userHubspot: {
    id: 'msg-user-hubspot',
    sender: 'user' as const,
    text: 'Yes, HubSpot please.',
    voiceText: 'Yes, HubSpot please.',
  },
  hubspotConnected: {
    id: 'msg-hubspot-connected',
    sender: 'bot' as const,
    text: '🔗 HubSpot connected! Starting sync...',
    voiceText: 'HubSpot connected. Starting sync.',
  },
  hubspotDone: {
    id: 'msg-hubspot-done',
    sender: 'bot' as const,
    text: '✅ All done! 31 companies and 45 contacts have been synced to your HubSpot.',
    voiceText: 'All done! 31 companies and 45 contacts have been synced to your HubSpot.',
  },
  // After upload - AI matching explanation
  aiMatching: {
    id: 'msg-ai-matching',
    sender: 'bot' as const,
    text: '🤖 I used AI-based field matching to automatically map your columns. This saves hours of manual configuration.',
    voiceText: 'I used AI based field matching to automatically map your columns. This saves hours of manual configuration.',
  },

  // Scoring agent
  scoringAsk: {
    id: 'msg-scoring-ask',
    sender: 'bot' as const,
    text: 'Would you like me to run a relevance scoring? I can rate each company from 1-10 based on their S/4HANA focus.',
    voiceText: 'Would you like me to run a relevance scoring? I can rate each company from 1 to 10 based on their S 4 HANA focus.',
  },
  userScoringYes: {
    id: 'msg-user-scoring',
    sender: 'user' as const,
    text: 'Yes, run the scoring.',
    voiceText: 'Yes, run the scoring.',
  },
  scoringRun: {
    id: 'msg-scoring-run',
    sender: 'bot' as const,
    text: '⚙️ Running scoring agent...',
    voiceText: 'Running scoring agent.',
  },
  scoringDone: {
    id: 'msg-scoring-done',
    sender: 'bot' as const,
    text: '✅ Scoring complete. Companies rated from 1 to 10 based on relevance.',
    voiceText: 'Scoring complete. Companies rated from 1 to 10 based on relevance.',
  },

  // Employee data source
  userEmployeeSource: {
    id: 'msg-user-emp-source',
    sender: 'user' as const,
    text: 'Where does the employee data actually come from?',
    voiceText: 'Where does the employee data actually come from?',
  },
  botEmployeeSource: {
    id: 'msg-bot-emp-source',
    sender: 'bot' as const,
    text: 'Great question. We use a complex search algorithm that accesses multiple databases like LinkedIn and Google simultaneously. It also visits company websites and counts team members — even from team photos.',
    voiceText: 'Great question. We use a complex search algorithm that accesses multiple databases like LinkedIn and Google simultaneously. It also visits company websites and counts team members, even from team photos.',
  },

  // Screenshot upload
  botScreenshotIntro: {
    id: 'msg-screenshot-intro',
    sender: 'bot' as const,
    text: '📸 By the way — we\'re one of the very few enrichment engines that can process screenshots. Actually, I think we might be the only one!',
    voiceText: 'By the way, we are one of the very few enrichment engines that can process screenshots. Actually, I think we might be the only one!',
  },
  userScreenshot: {
    id: 'msg-user-screenshot',
    sender: 'user' as const,
    text: 'Oh interesting! I have a screenshot from a conference on my phone. Can I use that?',
    voiceText: 'Oh interesting! I have a screenshot from a conference on my phone. Can I use that?',
  },
  botScreenshotYes: {
    id: 'msg-screenshot-yes',
    sender: 'bot' as const,
    text: 'Absolutely! Just upload the image and I\'ll extract the company names automatically.',
    voiceText: 'Absolutely! Just upload the image and I will extract the company names automatically.',
  },
  botScreenshotDone: {
    id: 'msg-screenshot-done',
    sender: 'bot' as const,
    text: '✅ Got it! I extracted 20 companies from your screenshot and added them to the list.',
    voiceText: 'Got it! I extracted 20 companies from your screenshot and added them to the list.',
  },

  // Phase 7: Custom Agent
  agentAsk: {
    id: 'msg-agent-ask',
    sender: 'bot' as const,
    text: 'One more thing — would you like to set up a custom AI agent for deeper analysis?',
    voiceText: 'One more thing. Would you like to set up a custom AI agent for deeper analysis?',
  },
  userAgentExplain: {
    id: 'msg-user-agent-explain',
    sender: 'user' as const,
    text: 'Interesting — can you explain what that means?',
    voiceText: 'Interesting. Can you explain what that means?',
  },
  agentExplain: {
    id: 'msg-agent-explain',
    sender: 'bot' as const,
    text: 'Of course! You can build custom agents for any research question. For example: How old are the managing directors? What\'s the succession risk score? Let me show you.',
    voiceText: 'Of course! You can build custom agents for any research question. For example: How old are the managing directors? What is the succession risk score? Let me show you.',
  },

  // Light mode joke
  userDarkMode: {
    id: 'msg-user-dark',
    sender: 'user' as const,
    text: 'I really liked listening to you, but I can\'t really see anything in these dark colors.',
    voiceText: 'I really liked listening to you, but I can not really see anything in these dark colors.',
  },
  botLightMode: {
    id: 'msg-bot-light',
    sender: 'bot' as const,
    text: '😄 Ha! Never mind — there\'s a light mode too!',
    voiceText: 'Ha! Never mind, there is a light mode too!',
  },
  botThankYou: {
    id: 'msg-bot-thanks',
    sender: 'bot' as const,
    text: 'But thank you for listening. That\'s a wrap! 🎬',
    voiceText: 'But thank you for listening. That is a wrap!',
  },

  wrapUp: {
    id: 'msg-wrap-up',
    sender: 'bot' as const,
    text: "That's a wrap! Thanks for watching the Atlas demo. 🎬",
    voiceText: "That's a wrap! Thanks for watching the Atlas demo.",
  },
};

// ── Helper Functions ───────────────────────────────────────

export const typeText = async (
  setter: (val: string) => void,
  text: string,
  delayMs = 65,
  signal?: AbortSignal
): Promise<void> => {
  for (let i = 0; i <= text.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    setter(text.slice(0, i));
    if (i > 0) playKeyClick(); // keyboard click sound
    await new Promise(r => setTimeout(r, delayMs));
  }
};

export const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

// ── 100 Fictional German Companies (CSV Upload 1) ─────────

const COMPANY_NAMES: [string, string][] = [
  ['Bergstein Consulting GmbH', 'bergstein-consulting.de'],
  ['DataFlow Systems AG', 'dataflow-systems.de'],
  ['Rheinwerk IT Solutions GmbH', 'rheinwerk-it.de'],
  ['Alpenvision Software SE', 'alpenvision-soft.de'],
  ['Nordlicht Digital GmbH', 'nordlicht-digital.de'],
  ['KernTech Systeme AG', 'kerntech-systeme.de'],
  ['Schwarzwald IT GmbH', 'schwarzwald-it.de'],
  ['Elbetech Consulting GmbH', 'elbetech-consulting.de'],
  ['BayernSoft AG', 'bayernsoft.de'],
  ['HanseCom Solutions GmbH', 'hansecom-solutions.de'],
  ['Donau Digital SE', 'donau-digital.de'],
  ['Westfalen Systems GmbH', 'westfalen-systems.de'],
  ['Spreetech GmbH', 'spreetech.de'],
  ['Moselwerk IT AG', 'moselwerk-it.de'],
  ['SaaleConsult GmbH', 'saaleconsult.de'],
  ['Taunus IT Consulting GmbH', 'taunus-it.de'],
  ['Oberrhein Cloud AG', 'oberrhein-cloud.de'],
  ['Eifel Systems GmbH', 'eifel-systems.de'],
  ['Neckartal Software GmbH', 'neckartal-software.de'],
  ['Holstein Digital GmbH', 'holstein-digital.de'],
  ['Frankentech AG', 'frankentech.de'],
  ['Pfalz IT Solutions GmbH', 'pfalz-it.de'],
  ['Oderwerk Consulting GmbH', 'oderwerk-consulting.de'],
  ['Harzberg Systems AG', 'harzberg-systems.de'],
  ['Allgäu Software GmbH', 'allgaeu-software.de'],
  ['Bodensee Digital SE', 'bodensee-digital.de'],
  ['Weserland IT GmbH', 'weserland-it.de'],
  ['Sauerland Consulting AG', 'sauerland-consulting.de'],
  ['Lausitz Tech GmbH', 'lausitz-tech.de'],
  ['Münsterland IT GmbH', 'muensterland-it.de'],
  ['Rheingau Systems GmbH', 'rheingau-systems.de'],
  ['Oberpfalz Digital AG', 'oberpfalz-digital.de'],
  ['Fichtelberg IT GmbH', 'fichtelberg-it.de'],
  ['Westerwald Consulting GmbH', 'westerwald-consulting.de'],
  ['Hunsrück Software AG', 'hunsrueck-software.de'],
  ['Chiemgau IT Solutions GmbH', 'chiemgau-it.de'],
  ['Vogtland Systems GmbH', 'vogtland-systems.de'],
  ['Emsland Digital GmbH', 'emsland-digital.de'],
  ['Bergisches IT Werk GmbH', 'bergisches-it-werk.de'],
  ['Odenwald Consulting AG', 'odenwald-consulting.de'],
  ['Spessart Tech GmbH', 'spessart-tech.de'],
  ['Altmark IT Solutions GmbH', 'altmark-it.de'],
  ['Prignitz Software GmbH', 'prignitz-software.de'],
  ['Uckermark Digital GmbH', 'uckermark-digital.de'],
  ['Wendland Systems AG', 'wendland-systems.de'],
  ['Lüneburger IT GmbH', 'lueneburger-it.de'],
  ['Ostfriesland Consulting GmbH', 'ostfriesland-consulting.de'],
  ['Ammerland Digital GmbH', 'ammerland-digital.de'],
  ['Dithmarschen IT AG', 'dithmarschen-it.de'],
  ['Angeln Software GmbH', 'angeln-software.de'],
  ['Ruhrtal Systems GmbH', 'ruhrtal-systems.de'],
  ['Lippe IT Consulting GmbH', 'lippe-it-consulting.de'],
  ['Siegerland Tech AG', 'siegerland-tech.de'],
  ['Wittgenstein Consulting GmbH', 'wittgenstein-consulting.de'],
  ['Hellweg Digital GmbH', 'hellweg-digital.de'],
  ['Soester IT GmbH', 'soester-it.de'],
  ['Ravensberger Systems AG', 'ravensberger-systems.de'],
  ['Teutoburger IT GmbH', 'teutoburger-it.de'],
  ['Grafschaft Consulting GmbH', 'grafschaft-consulting.de'],
  ['Oldenburger Digital GmbH', 'oldenburger-digital.de'],
  ['Worpswede Tech AG', 'worpswede-tech.de'],
  ['Cuxhavener IT GmbH', 'cuxhavener-it.de'],
  ['Wildeshauser Systems GmbH', 'wildeshauser-systems.de'],
  ['Stader Consulting GmbH', 'stader-consulting.de'],
  ['Harburger IT Solutions GmbH', 'harburger-it.de'],
  ['Lauenburger Digital GmbH', 'lauenburger-digital.de'],
  ['Stormarner Systems AG', 'stormarner-systems.de'],
  ['Pinneberger IT GmbH', 'pinneberger-it.de'],
  ['Segeberger Consulting GmbH', 'segeberger-consulting.de'],
  ['Plöner Software GmbH', 'ploener-software.de'],
  ['Eckernförder IT AG', 'eckernfoerder-it.de'],
  ['Rendsburger Tech GmbH', 'rendsburger-tech.de'],
  ['Flensburger Systems GmbH', 'flensburger-systems.de'],
  ['Nordfriesland Digital AG', 'nordfriesland-digital.de'],
  ['Sylter IT Solutions GmbH', 'sylter-it.de'],
  ['Föhrer Consulting GmbH', 'foehrer-consulting.de'],
  ['Pellwormer Tech GmbH', 'pellwormer-tech.de'],
  ['Helgoländer IT GmbH', 'helgolaender-it.de'],
  ['Borkumer Digital GmbH', 'borkumer-digital.de'],
  ['Norderneyer Systems AG', 'norderneyer-systems.de'],
  ['Wangerooger Consulting GmbH', 'wangerooger-consulting.de'],
  ['Langeooger IT GmbH', 'langeooger-it.de'],
  ['Juister Software GmbH', 'juister-software.de'],
  ['Baltrum Tech AG', 'baltrum-tech.de'],
  ['Spiekerooger IT Solutions GmbH', 'spiekerooger-it.de'],
  ['Memeler Digital GmbH', 'memeler-digital.de'],
  ['Pregel Systems AG', 'pregel-systems.de'],
  ['Warnow Consulting GmbH', 'warnow-consulting.de'],
  ['Peene IT GmbH', 'peene-it.de'],
  ['Trebel Software AG', 'trebel-software.de'],
  ['Recknitz Digital GmbH', 'recknitz-digital.de'],
  ['Ryck IT Solutions GmbH', 'ryck-it.de'],
  ['Tollense Systems GmbH', 'tollense-systems.de'],
  ['Uecker Tech AG', 'uecker-tech.de'],
  ['Randow Consulting GmbH', 'randow-consulting.de'],
  ['Ihna Digital GmbH', 'ihna-digital.de'],
  ['Plauer IT GmbH', 'plauer-it.de'],
  ['Malchiner Systems AG', 'malchiner-systems.de'],
  ['Kummerower Consulting GmbH', 'kummerower-consulting.de'],
  ['Müritz Software GmbH', 'mueritz-software.de'],
];

export const generateFakeCSV1 = (): string => {
  const header = 'Company Name,Website';
  const rows = COMPANY_NAMES.map(([name, website]) => `${name},${website}`);
  return [header, ...rows].join('\n');
};

// ── 30 Fictional CRM Export Companies (Upload 2) ──────────

const CRM_EXPORT_DATA: [string, string, string, string, string][] = [
  // 20 duplicates (same as Upload 1)
  ['Bergstein Consulting GmbH', 'bergstein-consulting.de', 'IT Consulting', 'T. Bergstein', '2026-01-15'],
  ['DataFlow Systems AG', 'dataflow-systems.de', 'SAP Services', 'S. Weidmann', '2026-02-01'],
  ['Rheinwerk IT Solutions GmbH', 'rheinwerk-it.de', 'SAP Consulting', 'M. Lindner', '2026-01-28'],
  ['Alpenvision Software SE', 'alpenvision-soft.de', 'ERP Integration', 'P. Hofmann', '2025-12-10'],
  ['Nordlicht Digital GmbH', 'nordlicht-digital.de', 'Cloud Services', 'J. Kaltenberg', '2026-01-20'],
  ['KernTech Systeme AG', 'kerntech-systeme.de', 'IT Infrastructure', 'R. Stein', '2025-11-30'],
  ['Schwarzwald IT GmbH', 'schwarzwald-it.de', 'SAP Basis', 'H. Tannberger', '2026-02-05'],
  ['Elbetech Consulting GmbH', 'elbetech-consulting.de', 'S/4HANA Migration', 'F. Elbing', '2026-01-08'],
  ['BayernSoft AG', 'bayernsoft.de', 'SAP Development', 'K. Huber', '2025-12-22'],
  ['HanseCom Solutions GmbH', 'hansecom-solutions.de', 'IT Outsourcing', 'D. Reeder', '2026-01-30'],
  ['Donau Digital SE', 'donau-digital.de', 'Cloud Integration', 'B. Stromer', '2025-11-15'],
  ['Westfalen Systems GmbH', 'westfalen-systems.de', 'ERP Services', 'U. Kampe', '2026-02-03'],
  ['Spreetech GmbH', 'spreetech.de', 'SAP Analytics', 'N. Berliner', '2026-01-12'],
  ['Moselwerk IT AG', 'moselwerk-it.de', 'IT Consulting', 'G. Winzer', '2025-12-18'],
  ['SaaleConsult GmbH', 'saaleconsult.de', 'SAP Consulting', 'V. Hallberger', '2026-01-25'],
  ['Taunus IT Consulting GmbH', 'taunus-it.de', 'S/4HANA', 'A. Kronberg', '2026-02-08'],
  ['Oberrhein Cloud AG', 'oberrhein-cloud.de', 'Cloud Services', 'L. Freiberg', '2025-11-28'],
  ['Eifel Systems GmbH', 'eifel-systems.de', 'IT Services', 'W. Vulkan', '2026-01-05'],
  ['Neckartal Software GmbH', 'neckartal-software.de', 'ERP Integration', 'C. Necker', '2025-12-30'],
  ['Holstein Digital GmbH', 'holstein-digital.de', 'SAP Services', 'M. Kieler', '2026-02-10'],
  // 10 new companies
  ['Zugspitz IT Solutions GmbH', 'zugspitz-it.de', 'SAP Consulting', 'E. Garmisch', '2026-01-18'],
  ['Mainzer Cloudwerk AG', 'mainzer-cloudwerk.de', 'Cloud Integration', 'J. Domberg', '2026-02-06'],
  ['Ostsee Digital GmbH', 'ostsee-digital.de', 'IT Consulting', 'S. Rostocker', '2025-12-14'],
  ['Thüringer Systemhaus GmbH', 'thueringer-systemhaus.de', 'SAP Basis', 'F. Erfurter', '2026-01-22'],
  ['Sachsen IT Consulting GmbH', 'sachsen-it-consulting.de', 'S/4HANA Migration', 'K. Dresdner', '2025-11-25'],
  ['Brandenburgische Software AG', 'brandenburger-software.de', 'ERP Development', 'P. Potsdamer', '2026-02-09'],
  ['Schleswig Tech GmbH', 'schleswig-tech.de', 'Cloud Services', 'R. Husumer', '2026-01-03'],
  ['Anhaltiner IT GmbH', 'anhaltiner-it.de', 'SAP Analytics', 'D. Dessauer', '2025-12-28'],
  ['Niedersachsen Consulting GmbH', 'niedersachsen-consulting.de', 'IT Infrastructure', 'H. Hannoveraner', '2026-01-14'],
  ['Mecklenburger Digital AG', 'mecklenburger-digital.de', 'SAP Services', 'T. Schweriner', '2026-02-02'],
];

export const generateFakeCSV2 = (): string => {
  const header = 'Company Name,Website,Industry,Contact Person,Last Activity';
  const rows = CRM_EXPORT_DATA.map(r => r.join(','));
  return [header, ...rows].join('\n');
};

export const createFakeFile1 = (): File =>
  new File([generateFakeCSV1()], 'sap_targets_research.csv', { type: 'text/csv' });

export const createFakeFile2 = (): File =>
  new File([generateFakeCSV2()], 'crm_export_salesforce_2026.csv', { type: 'text/csv' });

// ── Progressive Enrichment Data ────────────────────────────

// Classification categories
type Classification = 'SAP S/4HANA' | 'SAP Cloud' | 'SAP Basis' | 'SAP Analytics' | 'General IT' | 'Non-SAP';

interface EnrichmentData {
  classification: Classification;
  employees: number;
  description: string;
  ownershipType: 'Family-owned' | 'Founder-led' | 'Corporate' | 'PE-backed' | 'Public';
}

// Generate enrichment data for all 110 companies (deterministic based on index)
const ENRICHMENT_SEED: EnrichmentData[] = [];

const CLASSIFICATIONS: Classification[] = ['SAP S/4HANA', 'SAP Cloud', 'SAP Basis', 'SAP Analytics', 'General IT', 'Non-SAP'];
const OWNERSHIP_TYPES: EnrichmentData['ownershipType'][] = ['Family-owned', 'Founder-led', 'Corporate', 'PE-backed', 'Public'];
const DESCRIPTIONS = [
  'Specializes in S/4HANA migration projects for mid-market companies.',
  'Cloud-native SAP integration and custom ABAP development.',
  'SAP Basis operations and managed services provider.',
  'Business intelligence and SAP Analytics Cloud consulting.',
  'Full-service IT consulting with SAP practice.',
  'Web development and IT infrastructure — no SAP focus.',
  'S/4HANA greenfield implementations for manufacturing.',
  'SAP SuccessFactors and HCM integration specialist.',
  'SAP BTP development and cloud extension services.',
  'ERP migration consulting with focus on SAP and Oracle.',
];

for (let i = 0; i < 110; i++) {
  const classIdx = i < 85 ? (i % 5) : 5; // First 85 are SAP-relevant, rest are Non-SAP
  const empBase = 20 + (((i * 37) % 300));
  const ownIdx = i % OWNERSHIP_TYPES.length;
  ENRICHMENT_SEED.push({
    classification: CLASSIFICATIONS[classIdx],
    employees: empBase,
    description: DESCRIPTIONS[i % DESCRIPTIONS.length],
    ownershipType: OWNERSHIP_TYPES[ownIdx],
  });
}

export const getEnrichmentData = (index: number): EnrichmentData =>
  ENRICHMENT_SEED[index] || ENRICHMENT_SEED[0];

export const isSapRelevant = (index: number): boolean =>
  getEnrichmentData(index).classification !== 'Non-SAP';

export const isInEmployeeRange = (index: number, min: number, max: number): boolean => {
  const emp = getEnrichmentData(index).employees;
  return emp >= min && emp <= max;
};

export const isNotCorporate = (index: number): boolean =>
  getEnrichmentData(index).ownershipType !== 'Corporate' && getEnrichmentData(index).ownershipType !== 'Public';

// ── Fictional Persons ──────────────────────────────────────

interface FakePerson {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  type: string;
  company_name: string;
  company_website: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_postal: string;
}

const FIRST_NAMES = ['Thomas', 'Sabine', 'Markus', 'Petra', 'Jens', 'Andrea', 'Stefan', 'Claudia', 'Michael', 'Kathrin', 'Frank', 'Monika', 'Wolfgang', 'Heike', 'Rainer', 'Ute', 'Dirk', 'Birgit', 'Holger', 'Susanne'];
const LAST_NAMES = ['Bergstein', 'Weidmann', 'Lindner', 'Hofmann', 'Kaltenberg', 'Steinfeld', 'Bruckner', 'Eisenberg', 'Felsner', 'Grünwald', 'Hainberger', 'Kirchner', 'Moormann', 'Nordheim', 'Obermeier', 'Pfeifer', 'Rosenthal', 'Seidel', 'Vogtländer', 'Winkler'];
const ROLES = ['Managing Director', 'CEO', 'CTO', 'CFO', 'COO', 'Shareholder', 'Board Member', 'Partner', 'VP Engineering', 'Head of SAP'];
const STREETS = ['Hauptstraße', 'Bahnhofstraße', 'Industrieweg', 'Gartenweg', 'Lindenallee', 'Schillerstraße', 'Mozartweg', 'Berliner Str.', 'Frankfurter Allee', 'Münchner Str.'];
const CITIES = ['München', 'Hamburg', 'Frankfurt', 'Düsseldorf', 'Stuttgart', 'Köln', 'Hannover', 'Nürnberg', 'Leipzig', 'Dresden'];

export const generatePersons = (companyNames: string[], companyWebsites: string[]): FakePerson[] => {
  const persons: FakePerson[] = [];
  let personId = 1;

  for (let ci = 0; ci < Math.min(companyNames.length, 31); ci++) {
    // 1-2 persons per company → 14*2 + 17*1 = 45 persons for 31 companies
    const count = ci < 14 ? 2 : 1;
    for (let pi = 0; pi < count; pi++) {
      const fnIdx = (ci + pi * 7) % FIRST_NAMES.length;
      const lnIdx = (ci + pi * 3) % LAST_NAMES.length;
      const firstName = FIRST_NAMES[fnIdx];
      const lastName = LAST_NAMES[lnIdx];
      const roleIdx = (ci * 2 + pi) % ROLES.length;
      const streetIdx = (ci + pi) % STREETS.length;
      const cityIdx = ci % CITIES.length;
      const streetNum = 10 + ((ci * 7 + pi * 13) % 90);
      const postal = `${(10000 + (ci * 397 + pi * 211) % 89999)}`;
      const domain = companyWebsites[ci].replace('.de', '');

      persons.push({
        id: `person-${personId++}`,
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        role: ROLES[roleIdx],
        type: pi === 0 ? 'Management' : 'Shareholder',
        company_name: companyNames[ci],
        company_website: companyWebsites[ci],
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.de`,
        phone: `+49 ${100 + (ci % 900)} ${1000000 + ((ci * 131 + pi * 77) % 8999999)}`,
        address_street: `${STREETS[streetIdx]} ${streetNum}`,
        address_city: CITIES[cityIdx],
        address_postal: postal,
      });
    }
  }
  return persons;
};

// ── Create Demo Vertical ───────────────────────────────────

export const DEMO_VERTICAL_NAME = 'SAP Integration – IT Services';

export const createDemoVertical = (): VerticalData => {
  const sheetId = `demo-sheet-${Date.now()}`;
  return {
    id: `demo-vertical-${Date.now()}`,
    name: DEMO_VERTICAL_NAME,
    color: '#2563EB',
    sheets: [
      {
        id: sheetId,
        name: 'Companies',
        color: '#3B82F6',
        columns: [
          { id: 'company_name', header: 'Company Name', width: 260, type: ColumnType.TEXT },
          { id: 'company_website', header: 'Website', width: 220, type: ColumnType.URL },
        ],
        rows: [],
        agents: [],
        httpRequests: [],
      },
    ],
  };
};

export const createPersonsSheet = (): SheetTab => ({
  id: `demo-persons-${Date.now()}`,
  name: 'Persons',
  color: '#EF4444',
  columns: [
    { id: 'full_name', header: 'Full Name', width: 200, type: ColumnType.TEXT },
    { id: 'first_name', header: 'First Name', width: 140, type: ColumnType.TEXT },
    { id: 'last_name', header: 'Last Name', width: 140, type: ColumnType.TEXT },
    { id: 'role', header: 'Role', width: 160, type: ColumnType.TEXT },
    { id: 'type', header: 'Type', width: 120, type: ColumnType.TEXT },
    { id: 'company_name', header: 'Company', width: 240, type: ColumnType.TEXT },
    { id: 'company_website', header: 'Website', width: 200, type: ColumnType.URL },
    { id: 'email', header: 'Email', width: 260, type: ColumnType.EMAIL },
    { id: 'phone', header: 'Phone', width: 180, type: ColumnType.TEXT },
    { id: 'address_street', header: 'Street', width: 200, type: ColumnType.TEXT },
    { id: 'address_city', header: 'City', width: 140, type: ColumnType.TEXT },
    { id: 'address_postal', header: 'Postal Code', width: 120, type: ColumnType.TEXT },
  ],
  rows: [],
  agents: [],
  httpRequests: [],
});

// ── Enrichment Column Definitions ──────────────────────────

export const CLASSIFICATION_COLUMNS: ColumnDefinition[] = [
  { id: 'classification', header: 'Classification', width: 160, type: ColumnType.TEXT },
  { id: 'employees', header: 'Employees', width: 120, type: ColumnType.NUMBER },
  { id: 'description', header: 'Description', width: 300, type: ColumnType.TEXT },
];

export const OWNERSHIP_COLUMN: ColumnDefinition = {
  id: 'ownership_type', header: 'Ownership', width: 150, type: ColumnType.TEXT,
};

export const SCORING_COLUMN: ColumnDefinition = {
  id: 'relevance_score', header: 'Relevance Score', width: 140, type: ColumnType.NUMBER,
};

// Screenshot companies (from conference)
export const SCREENSHOT_COMPANIES: [string, string][] = [
  ['Rheintech Solutions GmbH', 'rheintech-solutions.de'],
  ['Alpine Data GmbH', 'alpine-data.de'],
  ['NordStar Consulting AG', 'nordstar-consulting.de'],
  ['BayernCloud AG', 'bayerncloud.de'],
  ['Hanseatik IT GmbH', 'hanseatik-it.de'],
  ['Bodensee Analytics GmbH', 'bodensee-analytics.de'],
  ['Schwarzwald Digital AG', 'schwarzwald-digital.de'],
  ['Elbe Systems GmbH', 'elbe-systems.de'],
  ['Franken IT Consulting GmbH', 'franken-it.de'],
  ['Mosel Tech AG', 'mosel-tech.de'],
  ['Taunus Solutions GmbH', 'taunus-solutions.de'],
  ['Hanse Digital GmbH', 'hanse-digital.de'],
  ['Pfalz IT Services AG', 'pfalz-it-services.de'],
  ['Ruhr Valley Tech GmbH', 'ruhr-valley-tech.de'],
  ['Spree Innovations AG', 'spree-innovations.de'],
  ['Weser Consulting GmbH', 'weser-consulting.de'],
  ['Neckar Systems AG', 'neckar-systems.de'],
  ['Alster Digital GmbH', 'alster-digital.de'],
  ['Isar Tech Solutions GmbH', 'isar-tech.de'],
  ['Main IT Partners AG', 'main-it-partners.de'],
];

// ── Fake HubSpot Credentials (same user as main demo login) ──

export const HUBSPOT_EMAIL = DEMO_EMAIL;
export const HUBSPOT_PASSWORD = 'HubSpot2026!';
