import { useCurrentProject } from './ProjectContext';

export default function ProjectScopeBanner() {
  const { currentProject } = useCurrentProject();

  if (!currentProject) {
    return <div className="border-b border-amber-500/30 bg-amber-950/20 px-6 py-2 text-sm text-amber-200">尚未选择项目。请先在项目中心创建或打开项目。</div>;
  }

  return (
    <div className="border-b border-primary/30 bg-primary/10 px-6 py-2 text-sm text-gray-200">
      当前项目：<span className="font-medium text-white">{currentProject.name}</span>
      <span className="ml-2 text-gray-400">{currentProject.sourceRoot || '未绑定资料目录'}</span>
    </div>
  );
}
