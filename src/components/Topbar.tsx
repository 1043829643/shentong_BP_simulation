import { getCurrentTurn } from '../domain/draft';
import { factionLabel, pickOrderLabel, sideLabel } from '../domain/lanes';
import { getTeam } from '../domain/teams';
import { getActivePlan, useDraftStore } from '../store/useDraftStore';

export function Topbar() {
  const { page, bpViewMode, config, plans, activePlanId, setPage, setBpViewMode } = useDraftStore();
  const activePlan = getActivePlan(plans, activePlanId);
  const turn = activePlan ? getCurrentTurn(activePlan, config) : null;
  const status = page === 'bp' && turn && activePlan
    ? activePlan.name + ' / 第 ' + String(turn.step).padStart(2, '0') + ' 手 / ' + sideLabel(turn.side, config.faction) + ' ' + turn.action
    : page === 'overview'
      ? '共 ' + plans.length + ' 个方案'
      : '新建 BP';

  return (
    <div className="topbar">
      <div className="brand">
        <button className="brand-mark brand-home-button" type="button" onClick={() => setPage('setup')} title="返回首页">首页</button>
        <div>
          <div className="brand-title-row">
            <h1>DOTA2 BP 交互模拟</h1>
            <div className="bp-view-tabs" aria-label="BP 界面切换">
              <button className={'bp-view-tab ' + (bpViewMode === 'heroPool' ? 'active' : '')} type="button" onClick={() => setBpViewMode('heroPool')}>英雄池BP界面</button>
              <button className={'bp-view-tab ' + (bpViewMode === 'traditional' ? 'active' : '')} type="button" onClick={() => setBpViewMode('traditional')}>传统BP界面</button>
            </div>
          </div>
          <span>{getTeam(config.myTeam).name} vs {getTeam(config.enemyTeam).name}</span>
        </div>
      </div>
      <div className="top-status">
        <span className={'chip ' + (config.faction === 'radiant' ? 'green' : 'red')}>{factionLabel(config.faction)}</span>
        <span className="chip active">{pickOrderLabel(config.pickOrder)}</span>
        <span>{status}</span>
      </div>
      <div className="top-actions">
        {page !== 'setup' && <button className="button ghost" onClick={() => setPage('setup')}>配置</button>}
        {page === 'overview' && <button className="button primary" onClick={() => setPage('bp')}>返回 BP</button>}
      </div>
    </div>
  );
}
