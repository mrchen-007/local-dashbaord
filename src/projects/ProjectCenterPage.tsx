import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ProjectRecord } from '../api/tauriApi';
import { isTauri } from '../shared/environment';
import { useCurrentProject } from './ProjectContext';
import { projectService } from './projectService';
import { projectStatusLabels } from './projectStatus';
import { rebuildProjectLedger } from './projectLedgerService';

interface ProjectCenterPageProps {
  onOpenProject: () => void;
}

export default function ProjectCenterPage({ onOpenProject }: ProjectCenterPageProps) {
  const runtimeAvailable = isTauri();
  const { currentProject, setCurrentProject } = useCurrentProject();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [owner, setOwner] = useState('');
  const [directory, setDirectory] = useState('');
  const [loading, setLoading] = useState(runtimeAvailable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!runtimeAvailable) return;
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectService.list());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtimeAvailable]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtimeAvailable || saving) return;
    setSaving(true);
    setError(null);
    try {
      const project = await projectService.create({ name, code, owner });
      setProjects((items) => [project, ...items]);
      setCurrentProject(project);
      setName('');
      setCode('');
      setOwner('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSaving(false);
    }
  }

  async function bindDirectory() {
    if (!currentProject || !directory.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const project = await projectService.bindDirectory(currentProject.id, directory);
      setCurrentProject(project);
      setProjects((items) => items.map((item) => item.id === project.id ? project : item));
      setDirectory('');
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : String(bindError));
    } finally {
      setSaving(false);
    }
  }

  async function archive(project: ProjectRecord) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const archived = await projectService.archive(project.id);
      setProjects((items) => items.map((item) => item.id === archived.id ? archived : item));
      if (currentProject?.id === archived.id) setCurrentProject(archived);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : String(archiveError));
    } finally {
      setSaving(false);
    }
  }

  async function rebuildLedger() {
    if (!currentProject || saving) return;
    setSaving(true);
    setError(null);
    try {
      await rebuildProjectLedger(currentProject.id);
    } catch (ledgerError) {
      setError(ledgerError instanceof Error ? ledgerError.message : String(ledgerError));
    } finally {
      setSaving(false);
    }
  }

  if (!runtimeAvailable) {
    return <UnavailableState />;
  }

  return (
    <div className="p-8 space-y-6">
      <section>
        <p className="text-sm text-primary font-semibold">项目中心</p>
        <h2 className="text-2xl font-bold">以项目为单位管理资料稽查</h2>
        <p className="text-gray-400 mt-2">先创建项目并绑定本地资料目录；扫描、提取与风险流程将在后续阶段迁移到此项目范围。</p>
      </section>

      {error && <div className="rounded border border-red-500/50 bg-red-950/30 px-4 py-3 text-red-200">{error}</div>}

      <section className="card">
        <h3 className="font-semibold mb-4">创建项目</h3>
        <form onSubmit={create} className="grid gap-4 md:grid-cols-3">
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="项目名称" className="rounded bg-gray-800 border border-gray-700 px-3 py-2" />
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="项目编号（可选）" className="rounded bg-gray-800 border border-gray-700 px-3 py-2" />
          <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="项目负责人（可选）" className="rounded bg-gray-800 border border-gray-700 px-3 py-2" />
          <button disabled={saving} className="md:col-span-3 justify-self-start rounded bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">{saving ? '处理中…' : '创建项目'}</button>
        </form>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold">项目列表</h3>
          <button onClick={() => void loadProjects()} disabled={loading || saving} className="text-sm text-primary disabled:opacity-50">刷新</button>
        </div>
        {loading ? <p className="text-gray-400">正在加载项目…</p> : projects.length === 0 ? <p className="text-gray-400">尚无项目。创建第一个项目后再绑定资料目录。</p> : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id} className={`rounded border p-4 ${currentProject?.id === project.id ? 'border-primary bg-primary/10' : 'border-gray-700'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{project.name} {project.code && <span className="text-gray-400">· {project.code}</span>}</p>
                    <p className="mt-1 text-sm text-gray-400">{project.owner || '未设置负责人'} · {project.sourceRoot || '未绑定资料目录'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-300">{projectStatusLabels[project.status]}</span>
                    <button onClick={() => { setCurrentProject(project); onOpenProject(); }} className="text-sm text-primary">打开</button>
                    {project.status !== 'archived' && <button onClick={() => void archive(project)} className="text-sm text-red-300">归档</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {currentProject && (
        <section className="card space-y-3">
          <h3 className="font-semibold">绑定资料目录：{currentProject.name}</h3>
          <div className="flex flex-col gap-3 md:flex-row">
            <input value={directory} onChange={(event) => setDirectory(event.target.value)} placeholder="输入本地资料根目录，例如 D:\\项目资料" className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2" />
            <button onClick={() => void bindDirectory()} disabled={saving || !directory.trim()} className="rounded border border-primary px-4 py-2 text-primary disabled:opacity-50">验证并绑定</button>
          </div>
          <button onClick={() => void rebuildLedger()} disabled={saving} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">重建正式台账与风险</button>
        </section>
      )}
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="p-8">
      <div className="card max-w-2xl">
        <h2 className="text-2xl font-bold">项目中心需要桌面运行时</h2>
        <p className="mt-3 text-gray-400">项目数据存储在本地 SQLite，并需要 Tauri 命令验证资料目录。请通过桌面应用启动此功能。</p>
      </div>
    </div>
  );
}
