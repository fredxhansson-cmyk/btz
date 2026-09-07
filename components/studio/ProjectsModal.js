import React, { useEffect, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import {
  listProjects, loadProject, saveProject, renameProject, deleteProject, duplicateProject,
} from '../../lib/studio/projects-store';
import { cloudStatus, cloudLoad, cloudSave } from '../../lib/studio/cloud';

const CLERK = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function when(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch (e) { return ''; }
}

export default function ProjectsModal({ onClose }) {
  const {
    project, dispatch, setHint, ui, setUi,
  } = useStudio();
  const [items, setItems] = useState(() => listProjects());
  const refresh = () => setItems(listProjects());
  const currentId = ui.libId || null;

  const saveCurrent = (asNew) => {
    let data = project;
    if (asNew) {
      const name = window.prompt('Name this project', project.name || 'Untitled');
      if (!name) return;
      data = { ...project, name };
      dispatch({ type: 'patch', patch: { name } });
    }
    const { id, strippedSamples } = saveProject(data, asNew ? undefined : currentId);
    setUi({ libId: id });
    refresh();
    setHint(strippedSamples
      ? 'Saved to your library (samples were too big for browser storage — export to a file to keep them).'
      : 'Saved to your library.');
  };

  const open = (id) => {
    const data = loadProject(id);
    if (!data) { setHint('Could not open that project.'); return; }
    dispatch({ type: 'set', project: data });
    setUi({ libId: id });
    setHint(`Opened "${data.name || 'Untitled'}".`);
    onClose();
  };

  const rename = (item) => {
    const name = window.prompt('Rename project', item.name);
    if (!name) return;
    renameProject(item.id, name);
    if (item.id === currentId) dispatch({ type: 'patch', patch: { name } });
    refresh();
  };

  const remove = (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    deleteProject(item.id);
    if (item.id === currentId) setUi({ libId: null });
    refresh();
  };

  const duplicate = (item) => { duplicateProject(item.id); refresh(); setHint('Project duplicated.'); };

  // Cloud sync (only shown when signed in and a blob store is configured).
  const [cloud, setCloud] = useState({ enabled: false, signedIn: false, index: [] });
  const [syncing, setSyncing] = useState(false);
  const refreshCloud = () => cloudStatus().then(setCloud).catch(() => {});
  useEffect(() => { refreshCloud(); }, []);

  const backupAll = async () => {
    setSyncing(true);
    try {
      const all = listProjects();
      for (const it of all) { const data = loadProject(it.id); if (data) { /* eslint-disable-next-line no-await-in-loop */ await cloudSave(it.id, data); } }
      await refreshCloud();
      setHint(`Backed up ${all.length} project${all.length === 1 ? '' : 's'} to your account.`);
    } finally { setSyncing(false); }
  };

  const openCloud = async (id) => {
    const data = await cloudLoad(id);
    if (!data) { setHint('Could not fetch that cloud project.'); return; }
    saveProject(data, id); // mirror into the local library
    dispatch({ type: 'set', project: data });
    setUi({ libId: id });
    refresh();
    setHint(`Opened "${data.name || 'Untitled'}" from the cloud.`);
    onClose();
  };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={`${s.modal} ${s.settingsModal}`} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>My Projects</span>
          <span className={s.dim}>saved in this browser</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>

        <div className={s.settingsBody}>
          <div className={s.projToolbar}>
            <button type="button" className={`${s.btn} ${s.on}`} onClick={() => saveCurrent(false)}>Save current</button>
            <button type="button" className={s.btn} onClick={() => saveCurrent(true)}>Save as new…</button>
            <div className={s.spacer} />
            <span className={s.dim}>{items.length} saved</span>
          </div>

          {!items.length && (
            <div className={s.helpBox}>No saved projects yet. Press <b>Save current</b> to add this one to your library.</div>
          )}

          <div className={s.projList}>
            {items.map((it) => (
              <div key={it.id} className={it.id === currentId ? `${s.projRow} ${s.projRowOn}` : s.projRow}>
                <button type="button" className={s.projMain} onClick={() => open(it.id)} title="Open this project">
                  <span className={s.projName}>{it.name}{it.id === currentId ? ' ·' : ''}</span>
                  <span className={s.projMeta}>{when(it.updatedAt)}{it.hasSamples ? ' · has samples' : ''}</span>
                </button>
                <div className={s.projActions}>
                  <button type="button" className={s.btn} onClick={() => rename(it)}>Rename</button>
                  <button type="button" className={s.btn} onClick={() => duplicate(it)}>Duplicate</button>
                  <button type="button" className={s.dangerBtn} onClick={() => remove(it)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {cloud.enabled && cloud.signedIn && (
            <div className={s.projList} style={{ marginTop: 8 }}>
              <div className={s.projToolbar}>
                <span className={s.dim}>☁ Cloud — synced to your account</span>
                <div className={s.spacer} />
                <button type="button" className={s.btn} disabled={syncing} onClick={backupAll}>{syncing ? 'Backing up…' : 'Back up all → cloud'}</button>
              </div>
              {!cloud.index.length && (
                <div className={s.helpBox}>No cloud projects yet. Press <b>Back up all → cloud</b> to sync your library across devices.</div>
              )}
              {cloud.index.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map((it) => (
                <div key={it.id} className={s.projRow}>
                  <button type="button" className={s.projMain} onClick={() => openCloud(it.id)} title="Open this project from the cloud">
                    <span className={s.projName}>☁ {it.name}</span>
                    <span className={s.projMeta}>{when(it.updatedAt)}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={s.helpBox}>
            {cloud.enabled
              ? (cloud.signedIn
                ? 'Local projects live in this browser; the cloud list follows your account across devices. Back up to sync.'
                : 'Cloud sync is available — sign in to sync your library across devices.')
              : (CLERK
                ? 'These projects live in this browser. Cloud sync activates once a storage token is configured.'
                : 'These projects live in this browser (per device). Cloud sync tied to your account is available once sign-in + storage are enabled.')}
            {' '}You can also use <b>File → Save project</b> to keep a project as a portable <b>.flow.json</b> file.
          </div>
        </div>
      </div>
    </div>
  );
}
