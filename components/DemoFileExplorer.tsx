import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface DemoFileExplorerProps {
  isOpen: boolean;
  onComplete: () => void;
  variant: 'research' | 'salesforce';
}

interface FileEntry {
  name: string;
  size: string;
  date: string;
}

const VARIANT_CONFIG = {
  research: {
    path: 'Documents > Atlas Research',
    files: [
      { name: 'sap_targets_research.csv', size: '245 KB', date: '02/08/2026' },
      { name: 'old_targets_2025.csv', size: '189 KB', date: '11/14/2025' },
      { name: 'notes.txt', size: '4 KB', date: '01/30/2026' },
    ] as FileEntry[],
    selectedFile: 'sap_targets_research.csv',
    folderHeader: null as string | null,
  },
  salesforce: {
    path: 'Documents > Salesforce Exports',
    files: [
      { name: 'crm_export_salesforce_2026.csv', size: '512 KB', date: '02/09/2026' },
      { name: 'contacts_backup.csv', size: '328 KB', date: '01/22/2026' },
      { name: 'accounts_q4.csv', size: '156 KB', date: '12/15/2025' },
    ] as FileEntry[],
    selectedFile: 'crm_export_salesforce_2026.csv',
    folderHeader: '☁️ SF',
  },
};

const SIDEBAR_FOLDERS = ['Desktop', 'Documents', 'Downloads'];

export default function DemoFileExplorer({ isOpen, onComplete, variant }: DemoFileExplorerProps) {
  const [visible, setVisible] = useState(false);
  const [highlightedFile, setHighlightedFile] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [buttonActive, setButtonActive] = useState(false);

  const config = VARIANT_CONFIG[variant];

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      setHighlightedFile(null);
      setInputValue('');
      setButtonActive(false);
      return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;

    setVisible(true);

    const runSequence = async () => {
      // Step 1: after 1s highlight the file
      await wait(1000, signal);
      if (signal.aborted) return;
      setHighlightedFile(config.selectedFile);

      // Step 2: after 2s fill the filename input
      await wait(1000, signal);
      if (signal.aborted) return;
      setInputValue(config.selectedFile);

      // Step 3: after 2.5s click animation on Open button
      await wait(500, signal);
      if (signal.aborted) return;
      setButtonActive(true);

      // Step 4: after 3s complete
      await wait(500, signal);
      if (signal.aborted) return;
      setButtonActive(false);
      setVisible(false);
      onComplete();
    };

    runSequence();

    return () => {
      abortController.abort();
    };
  }, [isOpen]);

  if (!visible) return null;

  const dialog = (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        {/* Title bar */}
        <div style={styles.titleBar}>
          <span style={styles.titleText}>Open</span>
          <button style={styles.closeBtn} onClick={() => { setVisible(false); onComplete(); }}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Path bar */}
          <div style={styles.pathBar}>
            <span style={styles.pathIcon}>📁</span>
            <span style={styles.pathText}>
              {config.folderHeader ? `${config.folderHeader}  ${config.path}` : config.path}
            </span>
          </div>

          <div style={styles.content}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
              {SIDEBAR_FOLDERS.map((folder) => (
                <div
                  key={folder}
                  style={{
                    ...styles.sidebarItem,
                    ...(config.path.includes(folder) ? styles.sidebarItemActive : {}),
                  }}
                >
                  <span style={styles.folderIcon}>📁</span> {folder}
                </div>
              ))}
            </div>

            {/* File list */}
            <div style={styles.fileArea}>
              {/* Column headers */}
              <div style={styles.fileHeader}>
                <span style={{ flex: 1 }}>Name</span>
                <span style={{ width: 80, textAlign: 'right' }}>Size</span>
                <span style={{ width: 100, textAlign: 'right' }}>Date</span>
              </div>

              {config.files.map((file) => (
                <div
                  key={file.name}
                  style={{
                    ...styles.fileRow,
                    ...(highlightedFile === file.name ? styles.fileRowSelected : {}),
                  }}
                >
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={styles.fileIcon}>📄</span>
                    {file.name}
                  </span>
                  <span style={{ width: 80, textAlign: 'right', opacity: 0.6 }}>{file.size}</span>
                  <span style={{ width: 100, textAlign: 'right', opacity: 0.6 }}>{file.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerLabel}>File name:</span>
          <input
            style={styles.filenameInput}
            value={inputValue}
            readOnly
            placeholder="Select a file..."
          />
          <button
            style={{
              ...styles.openBtn,
              ...(buttonActive ? styles.openBtnActive : {}),
            }}
          >
            Open
          </button>
          <button style={styles.cancelBtn} onClick={() => { setVisible(false); onComplete(); }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(dialog, document.body);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.3s ease',
  },
  dialog: {
    width: 620,
    maxWidth: '90vw',
    backgroundColor: '#1a1f36',
    borderRadius: 8,
    border: '1px solid #2d3454',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    color: '#e2e8f0',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#141829',
    borderBottom: '1px solid #2d3454',
  },
  titleText: {
    fontWeight: 600,
    fontSize: 13,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 6px',
    borderRadius: 4,
    lineHeight: 1,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  pathBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    backgroundColor: '#1e2340',
    borderBottom: '1px solid #2d3454',
    fontSize: 12,
    color: '#94a3b8',
  },
  pathIcon: {
    fontSize: 14,
  },
  pathText: {
    opacity: 0.9,
  },
  content: {
    display: 'flex',
    minHeight: 200,
  },
  sidebar: {
    width: 140,
    backgroundColor: '#161a2e',
    borderRight: '1px solid #2d3454',
    padding: '6px 0',
    flexShrink: 0,
  },
  sidebarItem: {
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#94a3b8',
    cursor: 'default',
    borderRadius: 0,
  },
  sidebarItemActive: {
    backgroundColor: '#252b48',
    color: '#e2e8f0',
  },
  folderIcon: {
    fontSize: 13,
  },
  fileArea: {
    flex: 1,
    padding: '4px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  fileHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    fontSize: 11,
    color: '#64748b',
    borderBottom: '1px solid #2d3454',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 12px',
    fontSize: 12,
    cursor: 'default',
    borderRadius: 0,
    transition: 'background-color 0.2s ease',
  },
  fileRowSelected: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
  },
  fileIcon: {
    fontSize: 13,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderTop: '1px solid #2d3454',
    backgroundColor: '#141829',
  },
  footerLabel: {
    fontSize: 12,
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  filenameInput: {
    flex: 1,
    backgroundColor: '#1e2340',
    border: '1px solid #2d3454',
    borderRadius: 4,
    padding: '5px 8px',
    color: '#e2e8f0',
    fontSize: 12,
    outline: 'none',
  },
  openBtn: {
    padding: '5px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  openBtnActive: {
    backgroundColor: '#3b82f6',
    transform: 'scale(0.96)',
    boxShadow: '0 0 8px rgba(59,130,246,0.5)',
  },
  cancelBtn: {
    padding: '5px 14px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #2d3454',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
  },
};
