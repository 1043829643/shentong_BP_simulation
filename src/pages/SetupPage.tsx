import { ChangeEvent } from 'react';
import { getTeam, getTeams } from '../domain/teams';
import { parseHeroPoolFile } from '../importers/poolImporter';
import { useDraftStore } from '../store/useDraftStore';
import type { DraftConfig } from '../types';

export function SetupPage() {
  const { config, uploads, importMessages, setConfig, resetSetup, startDraft, setImportedPool, setImportError, clearLocalDraft } = useDraftStore();

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, side: 'myTeam' | 'enemyTeam') {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await parseHeroPoolFile(file);
    if (result.pool) {
      const detail = result.warnings.length ? '，' + result.warnings.join('；') : '';
      setImportedPool(side, file.name, result.pool, '导入成功' + detail);
    } else {
      setImportError(side, file.name, result.errors.join('；'));
    }
  }

  return (
    <section className="setup-screen">
      <div className="setup-hero">
        <div>
          <h2>把 BP 过程拆成可复盘、可分支、可比较的决策面板</h2>
          <p>入口确定阵营、先后手和战队数据；BP 页面逐手选择并复制分支；总览页按三路对位比较所有方案。</p>
          <div className="draft-preview">
            <div className="preview-row"><div className="preview-label">我方阵容</div>{[1, 2, 3, 4, 5].map((item) => <div className="preview-card" key={item}>{item}号位</div>)}</div>
            <div className="preview-row"><div className="preview-label">BP 流程</div>{['Ban', 'Ban', 'Pick', 'Pick', '分支'].map((item) => <div className="preview-card" key={item}>{item}</div>)}</div>
            <div className="preview-row"><div className="preview-label">对方阵容</div>{[1, 2, 3, 4, 5].map((item) => <div className="preview-card" key={item}>{item}号位</div>)}</div>
          </div>
        </div>
        <div className="data-status">
          <div className="status-card"><b>英雄池</b><span>预置战队自动加载</span></div>
          <div className="status-card"><b>Excel</b><span>支持模板解析</span></div>
          <div className="status-card"><b>克制</b><span>胜率模型标记</span></div>
          <div className="status-card"><b>总览</b><span>三路对位展示</span></div>
        </div>
      </div>

      <div className="setup-panel">
        <div className="panel-title">
          <h2>赛前配置</h2>
          <span className="minor">常见战队可直接使用，未收录战队可上传英雄池</span>
        </div>

        <div className="field-grid">
          <div className="field">
            <label>阵营</label>
            <div className="segmented">
              <button className={'seg-button ' + (config.faction === 'radiant' ? 'active' : '')} onClick={() => setConfig({ faction: 'radiant' })}>天辉</button>
              <button className={'seg-button ' + (config.faction === 'dire' ? 'active' : '')} onClick={() => setConfig({ faction: 'dire' })}>夜魇</button>
            </div>
          </div>
          <div className="field">
            <label>选边顺序</label>
            <div className="segmented">
              <button className={'seg-button ' + (config.pickOrder === 'first' ? 'active' : '')} onClick={() => setConfig({ pickOrder: 'first' })}>先选</button>
              <button className={'seg-button ' + (config.pickOrder === 'second' ? 'active' : '')} onClick={() => setConfig({ pickOrder: 'second' })}>后选</button>
            </div>
          </div>
        </div>

        <div className="field-grid">
          <TeamSelect label="我方战队" value={config.myTeam} onChange={(myTeam) => setConfig({ myTeam })} />
          <TeamSelect label="对方战队" value={config.enemyTeam} onChange={(enemyTeam) => setConfig({ enemyTeam })} />
        </div>

        <div className="field-grid">
          <FileField label="我方英雄池 Excel" fileName={uploads.myTeam} message={importMessages.myTeam} onChange={(event) => void handleUpload(event, 'myTeam')} />
          <FileField label="对方英雄池 Excel" fileName={uploads.enemyTeam} message={importMessages.enemyTeam} onChange={(event) => void handleUpload(event, 'enemyTeam')} />
        </div>

        <div className="field-grid single">
          <div className="field">
            <label>数据加载状态</label>
            <div className="data-status">
              <div className="status-card"><b>{getTeam(config.myTeam).type === 'preset' ? '已收录' : '可空置'}</b><span>我方英雄池</span></div>
              <div className="status-card"><b>{getTeam(config.enemyTeam).type === 'preset' ? '已收录' : '可空置'}</b><span>对方英雄池</span></div>
              <div className="status-card"><b>已加载</b><span>胜率模型系数</span></div>
              <div className="status-card"><b>本地</b><span>自动保存草稿</span></div>
            </div>
          </div>
        </div>

        <div className="setup-submit">
          <button className="button ghost" onClick={clearLocalDraft}>清除本地草稿</button>
          <button className="button ghost" onClick={resetSetup}>重置</button>
          <button className="button primary" onClick={startDraft}>确定，进入 BP</button>
        </div>
      </div>
    </section>
  );
}

function TeamSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: DraftConfig['myTeam']) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {getTeams().map(([id, team]) => <option value={id} key={id}>{team.name}</option>)}
      </select>
    </div>
  );
}

function FileField({ label, fileName, message, onChange }: { label: string; fileName: string; message: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="file-box">
        <span>{fileName || '选择 .xlsx / .csv 文件'}</span>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onChange} />
      </div>
      {message && <span className="minor">{message}</span>}
    </div>
  );
}
