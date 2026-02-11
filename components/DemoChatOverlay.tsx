/**
 * ═══════════════════════════════════════════════════════════
 * DEMO CHAT OVERLAY – Full 28-step guided product walkthrough
 * ═══════════════════════════════════════════════════════════
 *
 * This component is ONLY rendered when demoMode is active.
 * Safe to delete without affecting the rest of the app.
 *
 * Architecture: The demo runs in two phases:
 *   Phase 1 (pre-login):  Disclaimer -> type credentials -> trigger login
 *   Phase 2 (post-login): 28-step chat + data orchestration
 *
 * Because the parent re-renders on login, this component
 * watches `isLoggedIn` to kick off Phase 2.
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Bot, X, Minimize2, Maximize2, Volume2, VolumeX } from 'lucide-react';
import {
  DemoStep,
  DemoMessage,
  MSG,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  createDemoVertical,
  createPersonsSheet,
  createFakeFile1,
  createFakeFile2,
  generatePersons,
  getEnrichmentData,
  isSapRelevant,
  isInEmployeeRange,
  isNotCorporate,
  CLASSIFICATION_COLUMNS,
  OWNERSHIP_COLUMN,
  SCORING_COLUMN,
  SCREENSHOT_COMPANIES,
  typeText,
  delay,
} from '../services/demoService';
import { speakText, cancelSpeech, setMuted, initVoices, prefetchAudio, playAudioBlob, clearAudioCache, primeAudioPlayback } from '../services/demoVoiceService';
import { VerticalData, RowData, ColumnDefinition, SheetTab } from '../types';
import DemoHubspotModal from './DemoHubspotModal';
import DemoTargetCounter from './DemoTargetCounter';
import DemoFileExplorer from './DemoFileExplorer';
import DemoSalesforceScreen from './DemoSalesforceScreen';
import DemoPhoneScreen from './DemoPhoneScreen';

// ── Props Interface ────────────────────────────────────────

interface DemoChatOverlayProps {
  withVoice: boolean;
  speedMultiplier: number; // 1.0 = normal, 0.8 = 20% faster, 0.67 = 1.5x
  isLoggedIn: boolean;
  isEntryReady: boolean; // true after reactor + blackout are complete
  setLoginEmail: (val: string) => void;
  setLoginPassword: (val: string) => void;
  triggerLogin: () => void;
  addVertical: (vertical: VerticalData) => void;
  navigateToVertical: (verticalId: string, sheetId: string) => void;
  addRowToSheet: (verticalId: string, sheetId: string, row: RowData) => void;
  addColumns: (verticalId: string, sheetId: string, columns: ColumnDefinition[]) => void;
  updateRows: (verticalId: string, sheetId: string, updates: { rowId: string; data: Record<string, any> }[]) => void;
  addSheet: (verticalId: string, sheet: SheetTab) => void;
  filterRows: (verticalId: string, sheetId: string, keepRowIds: string[]) => void;
  openUploadModal: (file: File) => void;
  closeUploadModal: () => void;
  openAgentModal: () => void;
  closeAgentModal: () => void;
  toggleTheme: () => void;
  onDemoGridHighlight?: (cells?: Set<string>, columns?: Set<string>, scrollToColId?: string | null) => void;
  onDemoGridLoading?: (loading: boolean) => void;
  onStopDemo: () => void;
}

// ── Component ──────────────────────────────────────────────

const DemoChatOverlay: React.FC<DemoChatOverlayProps> = ({
  withVoice,
  speedMultiplier,
  isLoggedIn,
  isEntryReady,
  setLoginEmail,
  setLoginPassword,
  triggerLogin,
  addVertical,
  navigateToVertical,
  addRowToSheet,
  addColumns,
  updateRows,
  addSheet,
  filterRows,
  openUploadModal,
  closeUploadModal,
  openAgentModal,
  closeAgentModal,
  toggleTheme,
  onDemoGridHighlight,
  onDemoGridLoading,
  onStopDemo,
}) => {
  const [step, setStep] = useState<DemoStep>('DISCLAIMER');
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [isMutedState, setIsMutedState] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHubspot, setShowHubspot] = useState(false);
  const [targetCount, setTargetCount] = useState(0);
  const [showCounter, setShowCounter] = useState(false);
  const [tickerMode, setTickerMode] = useState<'companies' | 'persons'>('companies');
  const [personCount, setPersonCount] = useState(0);
  const [pendingButtonClick, setPendingButtonClick] = useState<string | null>(null);
  const pendingButtonClickRef = useRef<string | null>(null);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [fileExplorerVariant, setFileExplorerVariant] = useState<'research' | 'salesforce'>('research');
  const fileExplorerResolveRef = useRef<(() => void) | null>(null);
  const [showSalesforce, setShowSalesforce] = useState(false);
  const salesforceResolveRef = useRef<(() => void) | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const phoneResolveRef = useRef<(() => void) | null>(null);

  const abortRef = useRef(new AbortController());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const phase1DoneRef = useRef(false);
  const phase2StartedRef = useRef(false);
  const verticalRef = useRef<VerticalData | null>(null);
  const disclaimerResolveRef = useRef<(() => void) | null>(null);
  const hubspotResolveRef = useRef<(() => void) | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init voices on mount, reset ElevenLabs state so demo uses ElevenLabs from the start
  useEffect(() => {
    setMuted(!withVoice);
    setIsMutedState(!withVoice);
    initVoices();
    clearAudioCache(); // reset ElevenLabs health so whole demo tries ElevenLabs first
  }, []);

  // ── Helpers ────────────────────────────────────────────────

  const signal = () => abortRef.current.signal;

  // Speed-adjusted delay: applies the speed multiplier
  const d = useCallback((ms: number) => delay(Math.round(ms * speedMultiplier), signal()), [speedMultiplier]);

  const addMsg = useCallback(async (msg: DemoMessage, speak = true): Promise<void> => {
    // Start prefetching audio immediately while showing typing indicator
    const audioPromise = (speak && msg.voiceText) ? prefetchAudio(msg.voiceText, msg.sender) : null;

    // Brief typing indicator
    const typingMsg: DemoMessage = { ...msg, text: '', isTyping: true };
    setMessages(prev => [...prev, typingMsg]);

    const typingDuration = Math.min(300 + msg.text.length * 4, 800);
    await d(typingDuration);

    // Show text
    setMessages(prev =>
      prev.map(m => (m.id === msg.id ? { ...msg, isTyping: false } : m))
    );

    // Play pre-fetched audio (should be ready by now)
    if (audioPromise) {
      setIsSpeaking(true);
      const blob = await audioPromise;
      if (blob) {
        await playAudioBlob(blob, signal(), msg.sender);
      } else {
        await speakText(msg.voiceText!, msg.sender, signal());
      }
      setIsSpeaking(false);
    }
  }, [speedMultiplier]);

  const addUserMsg = useCallback(async (msg: DemoMessage): Promise<void> => {
    // Start prefetching audio
    const audioPromise = msg.voiceText ? prefetchAudio(msg.voiceText, 'user') : null;

    // Show full text immediately
    setMessages(prev => [...prev, msg]);

    // Play pre-fetched audio
    if (audioPromise) {
      setIsSpeaking(true);
      const blob = await audioPromise;
      if (blob) {
        await playAudioBlob(blob, signal(), 'user');
      } else {
        await speakText(msg.voiceText!, 'user', signal());
      }
      setIsSpeaking(false);
    }
  }, []);

  const waitForButton = (buttonIds: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (signal().aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const checkInterval = setInterval(() => {
        if (signal().aborted) {
          clearInterval(checkInterval);
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const current = pendingButtonClickRef.current;
        if (current && buttonIds.includes(current)) {
          clearInterval(checkInterval);
          pendingButtonClickRef.current = null;
          setPendingButtonClick(null);
          resolve(current);
        }
      }, 150);
    });
  };

  // Auto-advance: simulate button click after delay
  const autoClickButton = useCallback(async (buttonId: string, delayMs = 2000) => {
    try {
      await delay(delayMs, signal());
      pendingButtonClickRef.current = buttonId;
      setPendingButtonClick(buttonId);
    } catch {
      // AbortError — demo stopped, ignore
    }
  }, []);

  const handleButtonClick = (buttonId: string) => {
    primeAudioPlayback();
    pendingButtonClickRef.current = buttonId;
    setPendingButtonClick(buttonId);
  };

  const toggleMute = () => {
    const newVal = !isMutedState;
    setIsMutedState(newVal);
    setMuted(newVal);
    if (newVal) cancelSpeech();
  };

  const handleStop = useCallback(() => {
    cancelSpeech();
    clearAudioCache();
    abortRef.current.abort();
    setShowHubspot(false);
    setShowCounter(false);
    setShowFileExplorer(false);
    setShowSalesforce(false);
    setShowPhone(false);
    onStopDemo();
  }, [onStopDemo]);

  // ── Phase 1: Disclaimer -> Login ───────────────────────────

  useEffect(() => {
    if (phase1DoneRef.current || isLoggedIn) return;
    phase1DoneRef.current = true;

    const run = async () => {
      try {
        // Disclaimer parked — skip directly to login
        setShowDisclaimer(false);
        await delay(500, signal());

        // Type email
        setStep('LOGIN_TYPE_EMAIL');
        await typeText(setLoginEmail, DEMO_EMAIL, 45, signal());
        await delay(400, signal());

        // Type password
        setStep('LOGIN_TYPE_PASSWORD');
        await typeText(setLoginPassword, DEMO_PASSWORD, 55, signal());
        await delay(600, signal());

        // Submit
        setStep('LOGIN_SUBMIT');
        triggerLogin();
        setStep('WAIT_FOR_APP');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Demo Phase 1 error:', err);
      }
    };
    run();
  }, []);

  // ── Phase 2: Full demo flow (waits for login + loading done) ──

  useEffect(() => {
    if (!isLoggedIn || !isEntryReady || phase2StartedRef.current) return;
    phase2StartedRef.current = true;

    const run = async () => {
      try {
        const s = signal();
        // Helper: wait for a modal to complete via resolve ref
        const waitModal = (ref: React.MutableRefObject<(() => void) | null>) =>
          new Promise<void>((resolve, reject) => {
            if (s.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
            ref.current = resolve;
            s.addEventListener('abort', () => { ref.current = null; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
          });
        const btnDelay = (ms: number) => Math.round(ms * speedMultiplier);

        await d(600);

        // === Welcome ===
        setStep('CHAT_WELCOME');
        await addMsg(MSG.welcome);
        await d(650);

        setStep('CHAT_USER_YES');
        await addUserMsg(MSG.userYes);
        await d(550);

        setStep('CHAT_HOW_HELP');
        await addMsg(MSG.howHelp);
        autoClickButton('upload', btnDelay(2000));
        await waitForButton(['upload', 'vertical', 'enrich']);

        setStep('CHAT_USER_UPLOAD');
        await addUserMsg(MSG.userUpload);
        await d(550);

        // === Upload 1: Research CSV ===
        setStep('UPLOAD_1_OPEN');
        await addMsg(MSG.upload1Prompt);
        await d(500);

        const vertical = createDemoVertical();
        verticalRef.current = vertical;
        addVertical(vertical);
        await delay(300, s);
        navigateToVertical(vertical.id, vertical.sheets[0].id);
        await delay(400, s);

        // File explorer -> Upload modal
        setFileExplorerVariant('research');
        setShowFileExplorer(true);
        await waitModal(fileExplorerResolveRef);
        setShowFileExplorer(false);
        await delay(300, s);

        const fakeFile1 = createFakeFile1();
        openUploadModal(fakeFile1);
        await delay(2500, s); // longer: let viewer see upload modal
        setStep('UPLOAD_1_MAPPING');
        closeUploadModal();
        await delay(400, s);

        // Add 100 rows with visible loading
        const companyDataMap = new Map<string, { name: string; website: string }>();
        const csv1Lines = (await fakeFile1.text()).split('\n').slice(1);
        for (let i = 0; i < csv1Lines.length; i++) {
          if (s.aborted) return;
          const parts = csv1Lines[i].split(',');
          if (parts.length >= 2) {
            const rowId = `demo-row-${i}`;
            companyDataMap.set(rowId, { name: parts[0], website: parts[1] });
            addRowToSheet(vertical.id, vertical.sheets[0].id, { id: rowId, company_name: parts[0], company_website: parts[1] });
          }
          if (i % 15 === 14) await delay(100, s); // slower batches for visibility
        }

        setStep('UPLOAD_1_DONE');
        setTargetCount(100);
        setShowCounter(true);
        await addMsg(MSG.upload1Done);
        await d(500);

        // === AI Matching explanation ===
        setStep('CHAT_AI_MATCHING');
        await addMsg(MSG.aiMatching);
        await d(650);

        // === Upload 2: CRM/Salesforce ===
        setStep('CHAT_MORE_SOURCES');
        await addMsg(MSG.moreSources);
        await d(650);

        setStep('CHAT_USER_CRM');
        await addUserMsg(MSG.userCrm);
        await d(550);

        // Salesforce export screen first
        setStep('UPLOAD_2_OPEN');
        setShowSalesforce(true);
        await waitModal(salesforceResolveRef);
        setShowSalesforce(false);
        await delay(400, s);

        // Then file explorer with SF branding
        setFileExplorerVariant('salesforce');
        setShowFileExplorer(true);
        await waitModal(fileExplorerResolveRef);
        setShowFileExplorer(false);
        await delay(300, s);

        const fakeFile2 = createFakeFile2();
        openUploadModal(fakeFile2);
        await delay(2500, s);
        closeUploadModal();
        await delay(400, s);

        // Add CRM rows
        const csv2Lines = (await fakeFile2.text()).split('\n').slice(1);
        const existingNames = new Set(csv1Lines.map(l => l.split(',')[0]));
        let nextRowIdx = 100;
        for (const line of csv2Lines) {
          if (s.aborted) return;
          const parts = line.split(',');
          if (parts.length >= 2 && !existingNames.has(parts[0])) {
            const rowId = `demo-row-${nextRowIdx}`;
            companyDataMap.set(rowId, { name: parts[0], website: parts[1] });
            addRowToSheet(vertical.id, vertical.sheets[0].id, { id: rowId, company_name: parts[0], company_website: parts[1] });
            nextRowIdx++;
            await delay(80, s);
          }
        }

        setStep('UPLOAD_2_MERGE');
        await addMsg(MSG.mergeAsk);
        autoClickButton('merge-yes', btnDelay(2000));
        await waitForButton(['merge-yes', 'merge-no']);
        await addUserMsg(MSG.userMergeYes);
        await d(550);

        setTargetCount(110);
        await addMsg(MSG.mergeResult);
        await d(650);

        // === Screenshot Upload (phone) ===
        setStep('SCREENSHOT_INTRO');
        await addMsg(MSG.botScreenshotIntro);
        await d(650);

        await addUserMsg(MSG.userScreenshot);
        await d(550);

        await addMsg(MSG.botScreenshotYes);
        await d(400);

        setStep('SCREENSHOT_UPLOAD');
        setShowPhone(true);
        await waitModal(phoneResolveRef);
        setShowPhone(false);
        await delay(400, s);

        // Add 20 screenshot companies
        for (let i = 0; i < SCREENSHOT_COMPANIES.length; i++) {
          if (s.aborted) return;
          const [name, website] = SCREENSHOT_COMPANIES[i];
          const rowId = `demo-row-${nextRowIdx}`;
          companyDataMap.set(rowId, { name, website });
          addRowToSheet(vertical.id, vertical.sheets[0].id, { id: rowId, company_name: name, company_website: website });
          nextRowIdx++;
          if (i % 5 === 4) await delay(100, s);
        }
        setTargetCount(130);
        await addMsg(MSG.botScreenshotDone);
        await d(650);

        // === Vertical refinement ===
        setStep('CHAT_VERTICAL_ASK');
        await addMsg(MSG.verticalAsk);
        await d(650);

        setStep('CHAT_USER_VERTICAL');
        await addUserMsg(MSG.userVertical);
        await d(550);

        setStep('CHAT_VERTICAL_REFINE');
        await addMsg(MSG.verticalRefine1);
        await d(650);
        await addUserMsg(MSG.userRefine1);
        await d(550);
        await addMsg(MSG.verticalRefine2);
        await d(550);
        await addUserMsg(MSG.userClassifyYes);
        await d(550);

        // Lookalikes
        setStep('CHAT_LOOKALIKES');
        await addMsg(MSG.lookalikes);
        autoClickButton('like-1', btnDelay(1500));
        await waitForButton(['like-1', 'like-2', 'like-3']);
        await d(400);
        autoClickButton('like-2', btnDelay(1000));
        await waitForButton(['like-1', 'like-2', 'like-3']);
        await d(600);

        // === Classification + visible enrichment ===
        setStep('CLASSIFY_RUN');
        await addMsg(MSG.classifyRun);
        await d(500);

        onDemoGridLoading?.(true);
        addColumns(vertical.id, vertical.sheets[0].id, CLASSIFICATION_COLUMNS);
        const classificationColIds = CLASSIFICATION_COLUMNS.map(c => c.id);
        const firstClassificationColId = classificationColIds[0];
        onDemoGridHighlight?.(undefined, new Set(classificationColIds), firstClassificationColId);
        onDemoGridLoading?.(false);
        await delay(500, s); // longer: let viewer see new columns

        const allRowIds: string[] = [];
        for (let i = 0; i < nextRowIdx; i++) allRowIds.push(`demo-row-${i}`);

        const enrichmentBatch: { rowId: string; data: Record<string, any> }[] = [];
        for (let i = 0; i < allRowIds.length; i++) {
          const enr = getEnrichmentData(i);
          enrichmentBatch.push({ rowId: allRowIds[i], data: { classification: enr.classification, employees: enr.employees, description: enr.description } });
        }

        onDemoGridLoading?.(true);
        const ENRICHMENT_BATCH_SIZE = 5;
        const enrichmentColIds = ['classification', 'employees', 'description'];
        for (let batch = 0; batch < enrichmentBatch.length; batch += ENRICHMENT_BATCH_SIZE) {
          if (s.aborted) return;
          const slice = enrichmentBatch.slice(batch, batch + ENRICHMENT_BATCH_SIZE);
          updateRows(vertical.id, vertical.sheets[0].id, slice);
          const cellKeys = slice.flatMap(u => enrichmentColIds.map(colId => `${u.rowId}:${colId}`));
          onDemoGridHighlight?.(new Set(cellKeys));
          await delay(180, s);
        }
        onDemoGridLoading?.(false);
        await delay(400, s);

        setStep('CLASSIFY_RESULT');
        const sapRelevantIds = allRowIds.filter((_, i) => isSapRelevant(i));
        filterRows(vertical.id, vertical.sheets[0].id, sapRelevantIds);
        setTargetCount(sapRelevantIds.length);
        await addMsg(MSG.classifyResult);
        await d(650);

        // === Scoring Agent ===
        setStep('SCORING_ASK');
        await addMsg(MSG.scoringAsk);
        await d(650);
        await addUserMsg(MSG.userScoringYes);
        await d(550);

        setStep('SCORING_RUN');
        await addMsg(MSG.scoringRun);
        await d(400);

        openAgentModal();
        await delay(3000, s); // show agent modal
        closeAgentModal();
        await delay(400, s);

        onDemoGridLoading?.(true);
        addColumns(vertical.id, vertical.sheets[0].id, [SCORING_COLUMN]);
        onDemoGridHighlight?.(undefined, new Set([SCORING_COLUMN.id]), SCORING_COLUMN.id);
        onDemoGridLoading?.(false);
        await delay(400, s);

        // Populate scores (top-to-bottom fill)
        const scoreBatch = sapRelevantIds.map((rowId, i) => ({
          rowId, data: { relevance_score: 3 + (((i * 7) % 8)) } // scores 3-10
        }));
        onDemoGridLoading?.(true);
        const SCORE_BATCH_SIZE = 5;
        for (let b = 0; b < scoreBatch.length; b += SCORE_BATCH_SIZE) {
          if (s.aborted) return;
          const slice = scoreBatch.slice(b, b + SCORE_BATCH_SIZE);
          updateRows(vertical.id, vertical.sheets[0].id, slice);
          const cellKeys = slice.map(u => `${u.rowId}:${SCORING_COLUMN.id}`);
          onDemoGridHighlight?.(new Set(cellKeys));
          await delay(180, s);
        }
        onDemoGridLoading?.(false);
        await addMsg(MSG.scoringDone);
        await d(650);

        // === Employee filter ===
        setStep('CHAT_EMPLOYEE_ASK');
        await addMsg(MSG.employeeAsk);
        await d(650);
        await addUserMsg(MSG.userEmployee);
        await d(550);

        setStep('EMPLOYEE_FILTER');
        const employeeFilterIds = sapRelevantIds.filter((_, i) => isInEmployeeRange(i, 50, 200));
        filterRows(vertical.id, vertical.sheets[0].id, employeeFilterIds);
        setTargetCount(employeeFilterIds.length);
        await addMsg(MSG.employeeResult);
        await d(650);

        // === Employee data source question ===
        setStep('CHAT_EMPLOYEE_SOURCE');
        await addUserMsg(MSG.userEmployeeSource);
        await d(550);
        await addMsg(MSG.botEmployeeSource);
        await d(650);

        // === Ownership ===
        setStep('CHAT_OWNERSHIP_ASK');
        await addMsg(MSG.ownershipAsk);
        await d(650);
        await addUserMsg(MSG.userOwnershipYes);
        await d(550);

        setStep('OWNERSHIP_RUN');
        await addMsg(MSG.ownershipRun);
        await d(400);

        onDemoGridLoading?.(true);
        addColumns(vertical.id, vertical.sheets[0].id, [OWNERSHIP_COLUMN]);
        onDemoGridHighlight?.(undefined, new Set([OWNERSHIP_COLUMN.id]), OWNERSHIP_COLUMN.id);
        onDemoGridLoading?.(false);
        await delay(400, s);

        onDemoGridLoading?.(true);
        const ownershipBatch = employeeFilterIds.map((rowId, i) => ({ rowId, data: { ownership_type: getEnrichmentData(i).ownershipType } }));
        updateRows(vertical.id, vertical.sheets[0].id, ownershipBatch);
        const ownershipCellKeys = ownershipBatch.map(u => `${u.rowId}:${OWNERSHIP_COLUMN.id}`);
        onDemoGridHighlight?.(new Set(ownershipCellKeys));
        onDemoGridLoading?.(false);
        await delay(400, s);

        const ownershipFilterIds = employeeFilterIds.filter((_, i) => isNotCorporate(i));
        const finalTargetIds = ownershipFilterIds.slice(0, 31);
        filterRows(vertical.id, vertical.sheets[0].id, finalTargetIds);
        setTargetCount(31);
        await addMsg(MSG.ownershipResult);
        await d(650);

        // === People ===
        setStep('CHAT_PEOPLE_ASK');
        await addMsg(MSG.peopleAsk);
        await d(650);
        await addUserMsg(MSG.userPeopleYes);
        await d(550);

        setStep('PEOPLE_CREATE');
        const personsSheet = createPersonsSheet();
        addSheet(vertical.id, personsSheet);
        await delay(300, s);
        navigateToVertical(vertical.id, personsSheet.id);
        setTickerMode('persons');
        await delay(400, s);

        const realCompanyNames: string[] = [];
        const realCompanyWebsites: string[] = [];
        for (const rowId of finalTargetIds) {
          const data = companyDataMap.get(rowId);
          if (data) { realCompanyNames.push(data.name); realCompanyWebsites.push(data.website); }
        }

        const persons = generatePersons(realCompanyNames, realCompanyWebsites);
        setPersonCount(persons.length);
        for (let i = 0; i < persons.length; i++) {
          if (s.aborted) return;
          const p = persons[i];
          addRowToSheet(vertical.id, personsSheet.id, { id: p.id, full_name: p.full_name, first_name: p.first_name, last_name: p.last_name, role: p.role, type: p.type, company_name: p.company_name, company_website: p.company_website });
          if (i % 6 === 5) await delay(120, s); // visible person loading
        }
        await addMsg(MSG.peopleDone);
        await d(650);

        // === Contact details ===
        setStep('CHAT_CONTACTS_ASK');
        await addMsg(MSG.contactsAsk);
        autoClickButton('contacts-all', btnDelay(2000));
        await waitForButton(['contacts-all', 'contacts-email', 'contacts-skip']);
        await addUserMsg(MSG.userContactsAll);
        await d(550);

        setStep('CONTACTS_POPULATE');
        const contactUpdates = persons.map(p => ({ rowId: p.id, data: { email: p.email, phone: p.phone, address_street: p.address_street, address_city: p.address_city, address_postal: p.address_postal } }));
        const contactColIds = ['email', 'phone', 'address_street', 'address_city', 'address_postal'];
        onDemoGridLoading?.(true);
        const CONTACT_BATCH_SIZE = 5;
        for (let b = 0; b < contactUpdates.length; b += CONTACT_BATCH_SIZE) {
          if (s.aborted) return;
          const slice = contactUpdates.slice(b, b + CONTACT_BATCH_SIZE);
          updateRows(vertical.id, personsSheet.id, slice);
          const cellKeys = slice.flatMap(u => contactColIds.map(colId => `${u.rowId}:${colId}`));
          onDemoGridHighlight?.(new Set(cellKeys));
          await delay(180, s);
        }
        onDemoGridLoading?.(false);
        await addMsg(MSG.contactsDone);
        await d(650);

        // === CRM Sync ===
        setStep('CHAT_CRM_ASK');
        await addMsg(MSG.crmAsk);
        autoClickButton('crm-hubspot', btnDelay(2000));
        await waitForButton(['crm-hubspot', 'crm-salesforce', 'crm-export']);
        await addUserMsg(MSG.userHubspot);
        await d(550);

        setStep('HUBSPOT_LOGIN');
        setShowHubspot(true);
        await waitModal(hubspotResolveRef);
        setStep('HUBSPOT_SYNC');
        setShowHubspot(false);
        await d(200);
        await addMsg(MSG.hubspotConnected, false);
        await d(250);
        await addMsg(MSG.hubspotDone);
        await d(800);

        // === Custom Agent ===
        setStep('CHAT_AGENT_ASK');
        await addMsg(MSG.agentAsk);
        await d(650);
        await addUserMsg(MSG.userAgentExplain);
        await d(550);

        setStep('AGENT_SHOW');
        await addMsg(MSG.agentExplain);
        await d(400);
        openAgentModal();
        await delay(4000, s); // show agent modal longer
        closeAgentModal();
        await d(500);

        // === Light Mode Joke ===
        setStep('CHAT_LIGHT_JOKE');
        await addUserMsg(MSG.userDarkMode);
        await d(550);
        await addMsg(MSG.botLightMode);
        await d(400);
        toggleTheme();
        await delay(2500, s); // see light mode

        // === Wrap up ===
        setStep('CHAT_WRAP_UP');
        setShowCounter(false);
        await addMsg(MSG.botThankYou);
        await delay(3000, s);

        setStep('RESET_TO_LOGIN');
        toggleTheme(); // restore dark mode
        handleStop();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Demo Phase 2 error:', err);
      }
    };

    run();
  }, [isLoggedIn, isEntryReady]);

  const handleHubspotComplete = useCallback(() => {
    if (hubspotResolveRef.current) {
      hubspotResolveRef.current();
      hubspotResolveRef.current = null;
    }
  }, []);

  const handleFileExplorerComplete = useCallback(() => {
    if (fileExplorerResolveRef.current) { fileExplorerResolveRef.current(); fileExplorerResolveRef.current = null; }
  }, []);
  const handleSalesforceComplete = useCallback(() => {
    if (salesforceResolveRef.current) { salesforceResolveRef.current(); salesforceResolveRef.current = null; }
  }, []);
  const handlePhoneComplete = useCallback(() => {
    if (phoneResolveRef.current) { phoneResolveRef.current(); phoneResolveRef.current = null; }
  }, []);

  // ── Disclaimer Overlay ─────────────────────────────────────

  if (showDisclaimer && !isLoggedIn) {
    return ReactDOM.createPortal(
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10003,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#050a15',
        overflow: 'hidden',
      }}>
        {/* Floating particles */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 2 + (i % 4),
            height: 2 + (i % 4),
            borderRadius: '50%',
            background: `rgba(59,130,246,${0.15 + (i % 5) * 0.08})`,
            boxShadow: `0 0 ${4 + (i % 6)}px rgba(59,130,246,${0.1 + (i % 4) * 0.05})`,
            left: `${(i * 17.3) % 100}%`,
            top: `${(i * 23.7) % 100}%`,
            animation: `demoFloat${i % 3} ${8 + (i % 7) * 2}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 5}s`,
          }} />
        ))}

        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Glowing orb behind card */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
          borderRadius: 20, padding: '48px 56px', maxWidth: 540,
          border: '1px solid rgba(59,130,246,0.15)',
          boxShadow: '0 0 80px rgba(59,130,246,0.08), 0 25px 50px rgba(0,0,0,0.5)',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          animation: 'demoCardAppear 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 30px rgba(59,130,246,0.3)',
          }}>
            <Bot size={32} color="#fff" />
          </div>
          <h2 style={{
            margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#f1f5f9',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: '0.02em',
          }}>
            Demo Mode
          </h2>
          <p style={{
            margin: '0 0 28px', fontSize: 14, lineHeight: 1.7,
            color: '#94a3b8',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            We have used demo data for illustrative and data protection purposes only.
            All company names, persons, and contact details shown are entirely fictional.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'rgba(96,165,250,0.7)', fontSize: 12,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 8px #4ade80',
              animation: 'demoPulseGreen 2s ease-in-out infinite',
            }} />
            Starting demo...
          </div>
        </div>

        <style>{`
          @keyframes demoFloat0 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            33% { transform: translateY(-30px) translateX(15px); }
            66% { transform: translateY(15px) translateX(-10px); }
          }
          @keyframes demoFloat1 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            33% { transform: translateY(20px) translateX(-20px); }
            66% { transform: translateY(-25px) translateX(10px); }
          }
          @keyframes demoFloat2 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-20px) translateX(20px); }
          }
          @keyframes demoCardAppear {
            0% { opacity: 0; transform: scale(0.9) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes demoPulseGreen {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>,
      document.body
    );
  }

  // ── Pre-Login: floating indicator ──────────────────────────

  if (!isLoggedIn) {
    return ReactDOM.createPortal(
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ position: 'relative' }}>
          <Bot size={20} color="#60a5fa" />
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 8, height: 8, borderRadius: '50%',
            background: '#4ade80',
          }} />
        </div>
        <span style={{ fontSize: 12, color: '#bfdbfe', fontWeight: 500 }}>
          Demo running...
        </span>
        <button
          onClick={handleStop}
          style={{
            marginLeft: 8, padding: 4, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <X size={14} color="#9ca3af" />
        </button>
      </div>,
      document.body
    );
  }

  // Keep overlay hidden while the entry choreography (reactor + blackout)
  // is still active to avoid visual overlap.
  if (isLoggedIn && !isEntryReady) {
    return null;
  }

  // ── Post-Login: full chat panel + extras ───────────────────

  return ReactDOM.createPortal(
    <>
      {/* Target Counter */}
      <DemoTargetCounter
        target={tickerMode === 'persons' ? personCount : targetCount}
        label={tickerMode === 'persons' ? 'Persons' : 'Relevant Targets'}
        visible={showCounter}
      />

      {/* HubSpot Modal */}
      <DemoHubspotModal
        isOpen={showHubspot}
        onComplete={handleHubspotComplete}
        onClose={() => {
          setShowHubspot(false);
          handleHubspotComplete();
        }}
      />

      {/* File Explorer */}
      <DemoFileExplorer
        isOpen={showFileExplorer}
        variant={fileExplorerVariant}
        onComplete={handleFileExplorerComplete}
      />

      {/* Salesforce Screen */}
      <DemoSalesforceScreen
        isOpen={showSalesforce}
        onComplete={handleSalesforceComplete}
      />

      {/* Phone Screenshot */}
      <DemoPhoneScreen
        isOpen={showPhone}
        onComplete={handlePhoneComplete}
      />

      {/* Chat Panel */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        width: isMinimized ? 200 : 280,
        maxHeight: isMinimized ? 48 : 250,
        borderRadius: 16, overflow: 'hidden',
        background: '#0c1425',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', cursor: 'pointer', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.1))',
            borderBottom: '1px solid rgba(59,130,246,0.15)',
          }}
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Bot size={20} color="#60a5fa" />
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 8, height: 8, borderRadius: '50%',
                background: isSpeaking ? '#fbbf24' : '#4ade80',
                boxShadow: isSpeaking ? '0 0 8px #fbbf24' : 'none',
                transition: 'all 0.3s',
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Atlas Demo</span>
            {step !== 'DONE' && step !== 'RESET_TO_LOGIN' && (
              <span style={{
                fontSize: 10, color: 'rgba(147,197,253,0.5)',
                textTransform: 'uppercase', letterSpacing: 2,
              }}>Live</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              style={{
                padding: 4, borderRadius: 8,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              {isMutedState
                ? <VolumeX size={16} color="#9ca3af" />
                : <Volume2 size={16} color="#60a5fa" />
              }
            </button>
            {isMinimized
              ? <Maximize2 size={16} color="#9ca3af" />
              : <Minimize2 size={16} color="#9ca3af" />
            }
            <button
              onClick={(e) => { e.stopPropagation(); handleStop(); }}
              style={{
                padding: 4, borderRadius: 8, marginLeft: 4,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <X size={16} color="#9ca3af" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {!isMinimized && (
          <div style={{
            flex: 1, overflowY: 'auto', padding: 16,
            minHeight: 200, maxHeight: 440,
          }}>
            {messages.length === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', padding: '40px 0',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Bot size={32} color="rgba(59,130,246,0.3)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Starting demo...</p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 12, lineHeight: 1.5,
                    background: msg.sender === 'user'
                      ? 'rgba(59, 130, 246, 0.25)'
                      : 'rgba(30, 45, 61, 0.8)',
                    color: msg.sender === 'user' ? '#bfdbfe' : '#cbd5e1',
                    border: `1px solid ${msg.sender === 'user'
                      ? 'rgba(59,130,246,0.2)'
                      : 'rgba(59,130,246,0.08)'}`,
                  }}>
                    {msg.isTyping ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'flex', gap: 4 }}>
                          {[0, 150, 300].map(d => (
                            <span key={d} style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: 'rgba(96,165,250,0.6)',
                              animation: `demoBounce 1.2s infinite`,
                              animationDelay: `${d}ms`,
                            }} />
                          ))}
                        </span>
                      </span>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>

                {/* Buttons */}
                {!msg.isTyping && msg.buttons && msg.buttons.length > 0 && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    marginTop: 8,
                    paddingLeft: msg.sender === 'user' ? 0 : 4,
                  }}>
                    {msg.buttons.map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => handleButtonClick(btn.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 20,
                          fontSize: 12, fontWeight: 500,
                          background: 'rgba(59,130,246,0.15)',
                          color: '#93c5fd', cursor: 'pointer',
                          border: '1px solid rgba(59,130,246,0.25)',
                          transition: 'all 0.2s',
                          fontFamily: 'inherit',
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,0.3)';
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,0.15)';
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Footer */}
        {!isMinimized && (
          <div style={{
            padding: '8px 16px', textAlign: 'center', flexShrink: 0,
            borderTop: '1px solid rgba(59,130,246,0.1)',
          }}>
            {step === 'DONE' || step === 'RESET_TO_LOGIN' ? (
              <button
                onClick={handleStop}
                style={{
                  fontSize: 11, fontWeight: 600, color: '#60a5fa',
                  textTransform: 'uppercase', letterSpacing: 2,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                End Demo
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#4ade80',
                }} />
                <span style={{
                  fontSize: 10, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: 2,
                }}>Demo active</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bounce animation for typing indicator */}
      <style>{`
        @keyframes demoBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </>,
    document.body
  );
};

export default DemoChatOverlay;
