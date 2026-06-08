import { displayName } from '../domain/heroes';
import { factionLabel, lanePlan, pickOrderLabel } from '../domain/lanes';
import { getTeam } from '../domain/teams';
import { useDraftStore } from '../store/useDraftStore';
import type { DraftPlan, Hero, LaneComparison } from '../types';
import { HeroImage } from '../components/HeroImage';

export function OverviewPage() {
  const { config, plans, setPage } = useDraftStore();
  if (plans.length === 0) return <section className="overview-screen"><div className="empty-state">暂无方案</div></section>;
  return (
    <section className="overview-screen">
      <div className="overview-toolbar">
        <div>
          <h2>BP 方案总览</h2>
          <span className="minor">{getTeam(config.myTeam).name} vs {getTeam(config.enemyTeam).name} / {factionLabel(config.faction)} / {pickOrderLabel(config.pickOrder)}</span>
        </div>
        <div className="top-actions"><button className="button primary" onClick={() => setPage('bp')}>继续编辑</button></div>
      </div>
      {plans.map((plan) => <SchemeRow plan={plan} key={plan.id} />)}
    </section>
  );
}

function SchemeRow({ plan }: { plan: DraftPlan }) {
  const config = useDraftStore.getState().config;
  const lanes = lanePlan(plan, config);
  return (
    <div className="scheme-row">
      <div className="scheme-meta"><div><h3>{plan.name}</h3><span className="chip active">{plan.steps.length}/24 手</span></div><p>{plan.steps.length >= 24 ? '完整方案' : '未完成方案'}，已记录 {plan.steps.filter((step) => step.action === 'Pick').length} 个 Pick。</p></div>
      <div className="lane-grid">{lanes.map((lane) => <LaneCard key={lane.name} lane={lane} />)}</div>
    </div>
  );
}

function LaneCard({ lane }: { lane: LaneComparison }) {
  return <div className="lane-card"><div className="lane-title"><span>{lane.name}</span><span className="muted">分路对位</span></div><LaneSide heroes={lane.own} label={lane.ownLabel} /><div className="lane-vs">对位</div><LaneSide heroes={lane.enemy} label={lane.enemyLabel} /></div>;
}

function LaneSide({ heroes, label }: { heroes: Hero[]; label: string }) {
  const cellIndexes = heroes.length <= 1 ? [0] : [0, 1];
  return <div className={'lane-side ' + (heroes.length <= 1 ? 'single' : '')}>{cellIndexes.map((index) => heroes[index] ? <div className="tiny-hero" title={heroes[index].name} key={index}><HeroImage hero={heroes[index]} /></div> : <div className="tiny-hero" key={index}>?</div>)}<div className="lane-text">{label}<span>{heroes.map(displayName).join(' + ') || '待定'}</span></div></div>;
}
