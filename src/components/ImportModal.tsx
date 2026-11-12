import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, FileSpreadsheet, LoaderCircle, UploadCloud } from 'lucide-react';
import { Modal } from './UI';
import { parsePartnerWorkbook } from '../excel';
import { TYPE_META } from '../business';
import { useApp } from '../store';
import type { PartnerDraft } from '../types';

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const { partners, importPartners } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PartnerDraft[]>([]);
  const [fileName, setFileName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const existing = useMemo(() => new Set(partners.map((partner) => partner.name)), [partners]);

  async function readFile(file?: File) {
    if (!file) return;
    setParsing(true); setError(''); setFileName(file.name);
    try {
      const parsed = await parsePartnerWorkbook(file);
      setRows(parsed);
      setSelected(new Set(parsed.map((row, index) => existing.has(row.name) ? -1 : index).filter((index) => index >= 0)));
    } catch (reason) { setError(reason instanceof Error ? reason.message : '文件解析失败'); setRows([]); }
    finally { setParsing(false); }
  }

  async function confirm() {
    setImporting(true); setError('');
    try { await importPartners(rows.filter((_, index) => selected.has(index))); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '导入失败'); }
    finally { setImporting(false); }
  }

  const selectable = rows.map((row, index) => ({ row, index })).filter(({ row }) => !existing.has(row.name));
  const allSelected = selectable.length > 0 && selectable.every(({ index }) => selected.has(index));

  return <Modal title="导入候选名单" subtitle="自动识别《渠道伙伴评估表》中的候选名单与评估结果" onClose={onClose} width="large" footer={rows.length > 0 ? <><span className="import-footer-hint">已选择 <b>{selected.size}</b> 家，重复公司将自动跳过</span><button className="button button-ghost" onClick={() => { setRows([]); setFileName(''); }}>重新选择</button><button className="button button-primary" disabled={!selected.size || importing} onClick={confirm}>{importing && <LoaderCircle size={16} className="spin" />}确认导入<ArrowRight size={16} /></button></> : undefined}>
    {!rows.length ? <div className="import-select">
      <button className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void readFile(e.dataTransfer.files[0]); }}>
        {parsing ? <LoaderCircle size={38} className="spin" /> : <UploadCloud size={38} />}
        <strong>{parsing ? '正在解析表格…' : '拖拽 Excel 到这里，或点击选择'}</strong>
        <span>支持 .xlsx / .xls，单次最多 1,000 条</span>
      </button>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
      {fileName && <div className="selected-file"><FileSpreadsheet size={16} />{fileName}</div>}
      {error && <div className="form-error">{error}</div>}
      <div className="import-notes"><strong>导入前会为你自动处理</strong><div><span><Check size={14} />按公司名去重</span><span><Check size={14} />识别四种伙伴类型</span><span><Check size={14} />同步六维评分</span><span><Check size={14} />保留来源与核验信息</span></div></div>
    </div> : <div className="import-preview">
      <div className="import-summary"><div><FileSpreadsheet size={20} /><span><b>{fileName}</b><small>识别到 {rows.length} 条有效伙伴线索</small></span></div><span className="badge badge-neutral">重复 {rows.length - selectable.length}</span><span className="badge badge-purple">可导入 {selectable.length}</span></div>
      {error && <div className="form-error">{error}</div>}
      <div className="import-table-wrap"><table className="data-table import-table"><thead><tr><th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map(({ index }) => index)))} /></th><th>公司名称</th><th>类型</th><th>区域</th><th>批次</th><th>状态</th></tr></thead><tbody>
        {rows.map((row, index) => { const duplicate = existing.has(row.name); return <tr key={`${row.name}-${index}`} className={duplicate ? 'row-muted' : ''}><td><input type="checkbox" disabled={duplicate} checked={selected.has(index)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} /></td><td><strong>{row.name}</strong></td><td>{TYPE_META[row.type].short}</td><td>{row.region || '—'}</td><td>{row.batch}</td><td><span className={`badge ${duplicate ? 'badge-neutral' : 'badge-success'}`}>{duplicate ? '已存在' : '待导入'}</span></td></tr>; })}
      </tbody></table></div>
    </div>}
  </Modal>;
}
