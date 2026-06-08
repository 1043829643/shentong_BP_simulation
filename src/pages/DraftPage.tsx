import { DRAFT_SEQUENCE, roleNames, roles, tiers } from '../data/dotaData';
import { ATTRIBUTE_LABELS, ATTRIBUTE_ORDER, HERO_ATTRIBUTE_BY_ID, HERO_NUMERIC_ORDER, type HeroAttribute } from '../data/heroAttributes';
import { getCurrentTurn, getDraftTurn, getLineup, isHeroSelected } from '../domain/draft';
import { pickImpactLevel } from '../domain/evaluation';
import { displayName, getAllHeroes, initials } from '../domain/heroes';
import { factionLabel, getLaneGroups, sideLabel } from '../domain/lanes';
import { getTeam } from '../domain/teams';
import { getActivePlan, useDraftStore } from '../store/useDraftStore';
import type { DraftConfig, DraftPlan, DraftStep, DraftTurn, Hero, HeroPool, LaneGroup, RolePool, TierPool } from '../types';
import { HeroImage } from '../components/HeroImage';

export function DraftPage() {
  const { bpViewMode, config, pools, plans, activePlanId, selectHero, cancelFromStep, undoLastStep, createBranch, activatePlan, moveHeroToLane, setPage } = useDraftStore();
  const activePlan = getActivePlan(plans, activePlanId);
  if (!activePlan || !pools) return <section className="draft-screen"><div className="empty-state">请先完成赛前配置</div></section>;
  const turn = getCurrentTurn(activePlan, config);
  getLineup(activePlan, config.faction);

  return (
    <section className="draft-screen">
      <main className="draft-main">
        <div className="draft-summary">
          <SideSummary label="我方" faction={config.faction} plan={activePlan} />
          <div className="turn-card">{turn ? <div><strong>{String(turn.step).padStart(2, '0')}</strong><span>{sideLabel(turn.side, config.faction)} {turn.action}</span></div> : <div><strong>24</strong><span>BP 完成</span></div>}</div>
          <SideSummary label="对方" faction={config.faction === 'radiant' ? 'dire' : 'radiant'} plan={activePlan} />
        </div>
        {bpViewMode === 'heroPool' ? (
          <div className="hero-board">
            <PoolRow title="我方英雄池" subtitle={getTeam(config.myTeam).name} pool={pools.my} activePlan={activePlan} turn={turn} config={config} onSelect={selectHero} />
            <PoolRow title="对方英雄池" subtitle={getTeam(config.enemyTeam).name} pool={pools.enemy} activePlan={activePlan} turn={turn} config={config} onSelect={selectHero} />
            <PoolRow title="其他英雄" subtitle="Global Meta" pool={pools.other} activePlan={activePlan} turn={turn} config={config} onSelect={selectHero} />
          </div>
        ) : (
          <TraditionalHeroBoard activePlan={activePlan} turn={turn} config={config} onSelect={selectHero} />
        )}
        <div className="draft-footer">
          <div className="legend">
            <span className="legend-item"><span className="counter-tri good"></span>克制当前对方已选</span>
            <span className="legend-item"><span className="counter-tri bad"></span>被当前对方已选克制</span>
            <span>灰色英雄在当前方案中已被选或被 Ban</span>
          </div>
          <div className="top-actions">
            <button className="button ghost" onClick={undoLastStep} disabled={activePlan.steps.length === 0}>撤销</button>
            <button className="button success" onClick={() => setPage('overview')}>完成</button>
          </div>
        </div>
      </main>
      <aside className="timeline">
        <div className="timeline-head"><h2>BP 方案分支</h2><button className="button primary" onClick={createBranch}>新方案</button></div>
        <div className="timeline-list"><DraftTrack activePlan={activePlan} onTruncate={cancelFromStep} /></div>
        <div className="scheme-panel">
          <span className="minor">切换方案</span>
          <div className="scheme-list">{plans.map((plan) => <button key={plan.id} className={'chip ' + (plan.id === activePlanId ? 'active' : '')} onClick={() => activatePlan(plan.id)}>{plan.id}</button>)}</div>
        </div>
      </aside>
    </section>
  );

  function SideSummary({ label, faction, plan }: { label: string; faction: 'radiant' | 'dire'; plan: DraftPlan }) {
    return <div className="side-block"><h2><span>{label}</span><span>{factionLabel(faction)}</span></h2><div className="lane-strip">{getLaneGroups(plan, faction).map((lane) => <LaneDrop key={lane.id} lane={lane} />)}</div></div>;
  }

  function LaneDrop({ lane }: { lane: LaneGroup }) {
    return (
      <div className="lane-drop" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }} onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag-over'); moveHeroToLane(event.dataTransfer.getData('text/plain'), lane.id); }}>
        <div className="lane-drop-head"><span>{lane.label}</span><span>{lane.heroes.length}</span></div>
        <div className="lane-heroes">{lane.heroes.length > 0 ? lane.heroes.map((heroObj) => <button className="lane-hero" draggable key={heroObj.id} title={'拖动调整分路：' + displayName(heroObj) + ' / ' + heroObj.name} onDragStart={(event) => { event.dataTransfer.setData('text/plain', heroObj.id); event.dataTransfer.effectAllowed = 'move'; }}><HeroImage hero={heroObj} /></button>) : <span className="lane-empty">拖入英雄</span>}</div>
      </div>
    );
  }
}

function TraditionalHeroBoard({ activePlan, turn, config, onSelect }: { activePlan: DraftPlan; turn: DraftTurn | null; config: DraftConfig; onSelect: (heroId: string) => void }) {
  const heroesByAttribute = ATTRIBUTE_ORDER.map((attribute) => ({
    attribute,
    heroes: getAllHeroes()
      .filter((heroObj) => heroAttribute(heroObj.id) === attribute)
      .sort((left, right) => heroOrder(left.id) - heroOrder(right.id))
  }));
  const heroCount = heroesByAttribute.reduce((total, group) => total + group.heroes.length, 0);

  return (
    <div className="traditional-board">
      <div className="traditional-attribute-board">
        {heroesByAttribute.map((group) => (
          <section className={'traditional-attribute-section attr-' + group.attribute} key={group.attribute}>
            <div className={'traditional-attribute-head attr-' + group.attribute}>
              <span className="traditional-attribute-icon" aria-hidden="true"></span>
              <b>{ATTRIBUTE_LABELS[group.attribute]}</b>
              <span>{group.heroes.length}</span>
            </div>
            <div className="traditional-attribute-grid">
              {group.heroes.map((heroObj) => (
                <HeroCard key={heroObj.id} hero={heroObj} activePlan={activePlan} turn={turn} config={config} onSelect={onSelect} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <span className="traditional-total muted">传统BP界面 · {heroCount} 英雄 · 按力量 / 敏捷 / 智力 / 全才排列</span>
    </div>
  );
}

function heroAttribute(heroId: string): HeroAttribute {
  return HERO_ATTRIBUTE_BY_ID[heroId] || 'all';
}

function heroOrder(heroId: string): number {
  return HERO_NUMERIC_ORDER[heroId] ?? 9999;
}

function PoolRow({ title, subtitle, pool, activePlan, turn, config, onSelect }: { title: string; subtitle: string; pool: HeroPool; activePlan: DraftPlan; turn: DraftTurn | null; config: DraftConfig; onSelect: (heroId: string) => void }) {
  return <div className="pool-row"><div className="pool-label"><b>{title}</b><span>{subtitle}<br />1-5号位 + 摇摆位</span></div>{(roles as string[]).map((role) => <RolePanel key={role} role={role} tierMap={pool[role as keyof HeroPool]} activePlan={activePlan} turn={turn} config={config} onSelect={onSelect} />)}</div>;
}

function RolePanel({ role, tierMap, activePlan, turn, config, onSelect }: { role: string; tierMap?: RolePool; activePlan: DraftPlan; turn: DraftTurn | null; config: DraftConfig; onSelect: (heroId: string) => void }) {
  const value = tierMap || { flat: [] };
  const isFlat = 'flat' in value;
  const count = isFlat ? value.flat.length : (tiers as string[]).reduce((total, tier) => total + ((value as TierPool)[tier as keyof TierPool]?.length || 0), 0);
  return <div className="role-panel"><div className="role-head"><span>{(roleNames as Record<string, string>)[role]}</span><span>{count}</span></div><div className="role-body">{isFlat ? <HeroWrap heroes={value.flat} activePlan={activePlan} turn={turn} config={config} onSelect={onSelect} /> : (tiers as string[]).map((tier) => <TierLine key={tier} tier={tier} heroes={(value as TierPool)[tier as keyof TierPool] || []} activePlan={activePlan} turn={turn} config={config} onSelect={onSelect} />)}</div></div>;
}

function TierLine({ tier, heroes, activePlan, turn, config, onSelect }: { tier: string; heroes: Hero[]; activePlan: DraftPlan; turn: DraftTurn | null; config: DraftConfig; onSelect: (heroId: string) => void }) {
  if (heroes.length === 0) return null;
  return <div className="tier-line"><div className={'tier-badge ' + tier.toLowerCase()}>{tier}</div><HeroWrap heroes={heroes} activePlan={activePlan} turn={turn} config={config} onSelect={onSelect} /></div>;
}

function HeroWrap({ heroes, activePlan, turn, config, onSelect }: { heroes: Hero[]; activePlan: DraftPlan; turn: DraftTurn | null; config: DraftConfig; onSelect: (heroId: string) => void }) {
  return <div className="hero-wrap">{heroes.map((heroObj) => <HeroCard key={heroObj.id} hero={heroObj} activePlan={activePlan} turn={turn} config={config} onSelect={onSelect} />)}</div>;
}

function HeroCard({ hero, activePlan, turn, config, onSelect }: { hero: Hero; activePlan: DraftPlan; turn: DraftTurn | null; config: DraftConfig; onSelect: (heroId: string) => void }) {
  const selected = isHeroSelected(activePlan, hero.id);
  const impact = !selected && turn?.action === 'Pick' ? pickImpactLevel(activePlan, hero.id, turn.side, config) : null;
  const level = impact?.level || 0;
  return (
    <button className={'hero-card ' + (selected ? 'selected' : '')} onClick={() => onSelect(hero.id)} title={(selected ? '已在当前方案中选择：' : '') + displayName(hero) + ' / ' + hero.name + (impact ? ` / 对我方胜率影响 ${(impact.deltaMyWinrate * 100).toFixed(1)}%` : '')}>
      <HeroImage hero={hero} />
      <span className="fallback">{initials(hero)}</span>
      {level !== 0 && <span className="counter-mark">{Array.from({ length: Math.abs(level) }).map((_, index) => <span key={index} className={'counter-tri ' + (level > 0 ? 'good' : 'bad')}></span>)}</span>}
    </button>
  );
}

function DraftTrack({ activePlan, onTruncate }: { activePlan: DraftPlan; onTruncate: (step: number) => void }) {
  return <div className="draft-track"><div className="track-head"><span className="track-label radiant">{factionLabel('radiant')}</span><span></span><span className="track-label dire">{factionLabel('dire')}</span></div>{DRAFT_SEQUENCE.map((_: unknown, index: number) => <TurnRow key={index + 1} step={index + 1} activePlan={activePlan} onTruncate={onTruncate} />)}</div>;
}

function TurnRow({ step, activePlan, onTruncate }: { step: number; activePlan: DraftPlan; onTruncate: (step: number) => void }) {
  const config = useDraftStore.getState().config;
  const turn = getDraftTurn(step, config)!;
  const stepData = activePlan.steps.find((item) => item.step === step);
  const current = step === activePlan.steps.length + 1;
  const future = step > activePlan.steps.length + 1;
  const isRadiant = turn.side === 'radiant';
  const actionType = turn.action.toLowerCase();
  return (
    <div className={'track-row ' + (stepData ? 'done ' : '') + (current ? 'current ' : '') + (future ? 'future' : '')} onDoubleClick={() => stepData && onTruncate(step)} title={stepData ? '双击从第 ' + String(step).padStart(2, '0') + ' 手开始取消后续选择' : undefined}>
      <div className="track-slot-wrap radiant">{isRadiant && <TrackSlot stepData={stepData} turn={turn} />}</div>
      <span className={'track-branch left ' + (isRadiant ? '' : 'muted')}></span>
      <span className={'track-number ' + actionType}>{step}</span>
      <span className={'track-branch right ' + (isRadiant ? 'muted' : '')}></span>
      <div className="track-slot-wrap dire">{!isRadiant && <TrackSlot stepData={stepData} turn={turn} />}</div>
    </div>
  );
}

function TrackSlot({ stepData, turn }: { stepData?: DraftStep; turn: DraftStep | ReturnType<typeof getDraftTurn> }) {
  if (!stepData || !turn) return null;
  const actionType = turn.action.toLowerCase();
  const heroObj = stepData.hero;
  return <div className={'track-slot ' + turn.side + ' filled slot-' + actionType} title={String(turn.step).padStart(2, '0') + ' ' + turn.action + ' ' + factionLabel(turn.side) + '：' + displayName(heroObj) + ' / ' + heroObj.name}><span className="track-fallback">{initials(heroObj)}</span><HeroImage hero={heroObj} />{turn.action === 'Ban' && <span className="ban-cross" aria-hidden="true"></span>}</div>;
}
