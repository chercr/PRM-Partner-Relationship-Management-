import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Filter, Plus, RotateCcw, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import { useApp } from '../store';
import { calculateScore, getActivation, STATUSES, TYPE_META } from '../business';
import { exportPartnersCsv } from '../excel';
import PartnerTable from '../components/PartnerTable';

const PAGE_SIZE = 15;

export default function Partners() {
  const { partners, openPartnerForm, openImport, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [batch, setBatch] = useState('all');
  const [grade, setGrade] = useState('all');
  const [region, setRegion] = useState('all');
  const [sort, setSort] = useState('priority');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { setSearch(params.get('search') || ''); }, [params]);
  useEffect(() => { setPage(1); }, [search, type, status, batch, grade, region, sort]);
  const regions = useMemo(() => Array.from(new Set(partners.map((p) => p.region).filter(Boolean))).sort(), [partners]);
  const filtered = useMemo(() => {
    const result = partners.filter((partner) => {
      const partnerGrade = calculateScore(partner.scores).grade;
      const query = search.trim().toLowerCase();
      return (!query || [partner.name, partner.decisionMaker, partner.businessDesc, partner.contact].some((value) => value.toLowerCase().includes(query)))
        && (type === 'all' || partner.type === type) && (status === 'all' || partner.status === status)
        && (batch === 'all' || partner.batch === batch) && (grade === 'all' || (grade === 'pending' ? partnerGrade === null : partnerGrade === grade))
        && (region === 'all' || partner.region === region);
    });
    return result.sort((a, b) => {
      if (sort === 'score') return (calculateScore(b.scores).total || 0) - (calculateScore(a.scores).total || 0);
      if (sort === 'activation') return (getActivation(a).days ?? 99999) - (getActivation(b).days ?? 99999);
      return a.priorityOrder - b.priorityOrder || (calculateScore(b.scores).total || 0) - (calculateScore(a.scores).total || 0) || a.name.localeCompare(b.name, 'zh-CN');
    });
  }, [partners, search, type, status, batch, grade, region, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [type, status, batch, grade, region].filter((value) => value !== 'all').length;
  const evaluated = partners.filter((p) => calculateScore(p.scores).grade).length;
  const gradeACount = partners.filter((p) => calculateScore(p.scores).grade === 'A').length;

  function resetFilters() { setType('all'); setStatus('all'); setBatch('all'); setGrade('all'); setRegion('all'); setSearch(''); setParams({}); }
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  return <div className="partners-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />PARTNER DIRECTORY</div><h1>伙伴管理<span className="heading-count">{partners.length}</span></h1><p>统一沉淀伙伴档案，让每一条渠道线索都有下一步。</p></div><div className="heading-actions"><button className="button button-secondary" onClick={openImport}><Upload size={16} />导入 Excel</button><button className="button button-secondary export-button" onClick={() => { exportPartnersCsv(filtered); toast('CSV 报表已导出', `包含 ${filtered.length} 家伙伴`); }}><Download size={16} />导出</button><button className="button button-primary" onClick={() => openPartnerForm()}><Plus size={17} />新增伙伴</button></div></div>
    <section className="directory-summary"><button className={!activeFilters && !search ? 'active' : ''} onClick={resetFilters}><span>全部伙伴</span><b>{partners.length}</b></button><i /><button onClick={() => setGrade('A')} className={grade === 'A' ? 'active' : ''}><span>A 类重点</span><b>{gradeACount}</b></button><i /><button onClick={() => setStatus('未接触')} className={status === '未接触' ? 'active' : ''}><span>待首次接触</span><b>{partners.filter((p) => p.status === '未接触').length}</b></button><i /><button onClick={() => setGrade('pending')} className={grade === 'pending' ? 'active' : ''}><span>待评估</span><b>{partners.length - evaluated}</b></button></section>
    <section className="panel directory-panel">
      <div className="directory-toolbar"><div className="table-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索公司名称、决策人或客户画像" />{search && <button onClick={() => setSearch('')}><X size={14} /></button>}</div><div className="toolbar-filters"><select value={type} onChange={(e) => setType(e.target.value)}><option value="all">全部类型</option>{Object.entries(TYPE_META).map(([key, meta]) => <option value={key} key={key}>{meta.name}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">全部状态</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select><button className={`filter-button ${filtersOpen || activeFilters ? 'active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} />更多筛选{activeFilters > 0 && <em>{activeFilters}</em>}<ChevronDown size={13} /></button></div></div>
      {filtersOpen && <div className="advanced-filters"><label>来源批次<select value={batch} onChange={(e) => setBatch(e.target.value)}><option value="all">全部批次</option><option>首批联系</option><option>蓄水池</option><option>专项批次</option></select></label><label>ABC 分级<select value={grade} onChange={(e) => setGrade(e.target.value)}><option value="all">全部分级</option><option value="A">A 类 · 重点推进</option><option value="B">B 类 · 持续跟进</option><option value="C">C 类 · 观察</option><option value="pending">待评估</option></select></label><label>区域<select value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">全部区域</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><button className="text-button" onClick={resetFilters}><RotateCcw size={14} />重置筛选</button></div>}
      <div className="list-meta"><span>共 <b>{filtered.length}</b> 家伙伴{selected.size > 0 && <> · 已选 <b>{selected.size}</b> 家</>}</span><div>{selected.size > 0 && <button className="text-button" onClick={() => { exportPartnersCsv(partners.filter((p) => selected.has(p.id))); toast('已导出所选伙伴'); }}><Download size={14} />导出所选</button>}<label>排序方式<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="priority">联系优先级</option><option value="score">加权总分</option><option value="activation">激活倒计时</option></select></label></div></div>
      <PartnerTable partners={pageRows} selected={selected} onSelect={toggle} onSelectAll={() => setSelected(pageRows.every((p) => selected.has(p.id)) ? new Set() : new Set(pageRows.map((p) => p.id)))} />
      <footer className="table-pagination"><span>第 {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条</span><div><button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => { const p = index + 1; return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>; })}{totalPages > 5 && <span>…</span>}<button disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></footer>
    </section>
  </div>;
}
