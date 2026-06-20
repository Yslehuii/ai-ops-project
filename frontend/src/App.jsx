import { useState, useRef, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================================
// 统计卡片组件
// ============================================================
function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass-card glass-card-hover px-5 py-4 flex items-center gap-4 transition-all duration-300">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

// ============================================================
// 步骤进度条组件
// ============================================================
function StepIndicator({ step }) {
  const steps = [
    { id: 1, label: '抓取数据', icon: '📡' },
    { id: 2, label: 'AI 生成标题', icon: '🤖' },
    { id: 3, label: '写入飞书', icon: '📊' },
  ]
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => {
        const active = step >= s.id
        const current = step === s.id
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-500 ${
              current
                ? 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shadow-lg shadow-indigo-500/20'
                : active
                  ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-400'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-600'
            }`}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {active && !current && <span className="text-xs">✓</span>}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-1 transition-all duration-500 ${
                step > s.id ? 'bg-emerald-400/50' : 'bg-slate-700/50'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// 日志行组件
// ============================================================
function LogLine({ log, index }) {
  let color = 'text-slate-400'
  let dot = 'bg-slate-500'
  if (log.includes('[步骤1]')) { color = 'text-cyan-300'; dot = 'bg-cyan-400' }
  else if (log.includes('[步骤2]')) { color = 'text-violet-300'; dot = 'bg-violet-400' }
  else if (log.includes('[步骤3]')) { color = 'text-amber-300'; dot = 'bg-amber-400' }
  else if (log.includes('[完成]')) { color = 'text-emerald-300'; dot = 'bg-emerald-400' }
  else if (log.includes('[模拟模式]')) { color = 'text-yellow-300'; dot = 'bg-yellow-400' }
  else if (log.includes('[错误]')) { color = 'text-red-400'; dot = 'bg-red-500' }

  return (
    <div className="log-line flex items-start gap-3 py-1.5" style={{ animationDelay: `${index * 30}ms` }}>
      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${dot}`} />
      <span className={`font-mono text-sm leading-relaxed ${color}`}>{log}</span>
    </div>
  )
}

// ============================================================
// 表格组件
// ============================================================
function DataTable({ rows }) {
  const validRows = rows.filter(Boolean)
  if (validRows.length === 0) return null
  return (
    <div className="glass-card glass-card-hover p-0 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      {/* 表头装饰 */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-slate-300 tracking-wide">处理结果</span>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
          共 {validRows.length} 条数据
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="text-left px-6 py-3 font-medium">#</th>
              <th className="text-left px-4 py-3 font-medium">商品标题</th>
              <th className="text-left px-4 py-3 font-medium">原价</th>
              <th className="text-left px-4 py-3 font-medium">最终售价</th>
              <th className="text-left px-4 py-3 font-medium">利润率</th>
              <th className="text-left px-4 py-3 font-medium">AI 推荐标题</th>
            </tr>
          </thead>
          <tbody>
            {validRows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-slate-700/30 hover:bg-indigo-500/5 transition-colors duration-200 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                <td className="px-4 py-4 font-medium text-white/90">{row['商品标题']}</td>
                <td className="px-4 py-4 text-emerald-400 font-semibold">${row['原价']}</td>
                <td className="px-4 py-4 text-cyan-400 font-semibold">${row['最终售价']}</td>
                <td className="px-4 py-4 text-amber-400 font-semibold">{row['利润率']}</td>
                <td className="px-4 py-4 max-w-sm">
                  <div className="text-slate-400 text-xs leading-relaxed truncate" title={row['AI推荐标题']}>
                    {row['AI推荐标题']}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// 主应用
// ============================================================
export default function App() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [rows, setRows] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const logEndRef = useRef(null)

  const [schedulerInfo, setSchedulerInfo] = useState(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [logs])

  // 查询定时任务状态
  useEffect(() => {
    fetch(`${API}/scheduler/status`)
      .then(r => r.json())
      .then(setSchedulerInfo)
      .catch(() => {})
  }, [])

  const toggleScheduler = useCallback(async () => {
    const isOn = schedulerInfo?.running
    const url = isOn ? `${API}/scheduler/stop` : `${API}/scheduler/start`
    try {
      const resp = await fetch(url, { method: 'POST' })
      const data = await resp.json()
      // 刷新状态
      const status = await fetch(`${API}/scheduler/status`).then(r => r.json())
      setSchedulerInfo(status)
      setLogs(prev => [...prev, `[定时任务] ${data.message}`])
    } catch (e) {
      setLogs(prev => [...prev, `[错误] 定时任务操作失败: ${e.message}`])
    }
  }, [schedulerInfo])

  const startPipeline = useCallback(async () => {
    setRunning(true)
    setLogs([])
    setRows([])
    setCurrentStep(1)

    try {
      const resp = await fetch(`${API}/start_pipeline`)
      const data = await resp.json()
      console.log('[Pipeline] 后端返回:', data)
      const allLogs = data.logs || []
      const allRows = (data.rows || []).filter(Boolean)
      console.log('[Pipeline] 日志数:', allLogs.length, '行数:', allRows.length)

      // 逐条显示日志，模拟实时效果
      let rowIndex = 0
      for (let i = 0; i < allLogs.length; i++) {
        await new Promise(r => setTimeout(r, 300))
        setLogs(prev => [...prev, allLogs[i]])
        if (allLogs[i].includes('[步骤2]')) setCurrentStep(2)
        if (allLogs[i].includes('[步骤3]')) setCurrentStep(3)
        // 步骤3写入飞书的日志对应一行数据
        if (allLogs[i].includes('[步骤3]') && rowIndex < allRows.length) {
          const row = allRows[rowIndex]
          if (row) {
            await new Promise(r => setTimeout(r, 200))
            setRows(prev => [...prev, row])
          }
          rowIndex++
        }
      }
      setCurrentStep(4)
    } catch (e) {
      setLogs(prev => [...prev, `[错误] ${e.message}`])
    } finally {
      setRunning(false)
    }
  }, [])

  const stats = [
    { label: '已处理商品', value: rows.length, icon: '📦', color: 'bg-indigo-500/15 text-indigo-400' },
    { label: '当前状态', value: running ? '运行中' : '就绪', icon: running ? '⚡' : '✨', color: running ? 'bg-cyan-500/15 text-cyan-400' : 'bg-emerald-500/15 text-emerald-400' },
    { label: '日志条数', value: logs.length, icon: '📋', color: 'bg-violet-500/15 text-violet-400' },
  ]

  return (
    <div className="relative z-10 min-h-screen">
      {/* 顶部光晕 */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/8 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* ===== Header ===== */}
        <header className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Cross-border E-commerce
          </div>
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              跨境电商智能选品中台
            </span>
          </h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
            一键完成：<span className="text-slate-400">商品抓取</span> → <span className="text-slate-400">利润计算</span> → <span className="text-slate-400">AI 爆款标题</span> → <span className="text-slate-400">飞书写入</span>
          </p>
        </header>

        {/* ===== 统计卡片 ===== */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <StatCard {...s} />
            </div>
          ))}
        </div>

        {/* ===== 定时任务控制 ===== */}
        <div className="glass-card glass-card-hover px-6 py-4 mb-8 flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${schedulerInfo?.running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <div>
              <div className="text-sm font-semibold text-white">每日自动选品</div>
              <div className="text-xs text-slate-500">
                {schedulerInfo?.running
                  ? `每天 09:00 自动执行 · 下次: ${schedulerInfo.jobs?.[0]?.next_run?.slice(0, 16) || '--'}`
                  : '未启动'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleScheduler}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              schedulerInfo?.running
                ? 'bg-red-500/15 text-red-400 border border-red-400/30 hover:bg-red-500/25'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-500/25'
            }`}
          >
            {schedulerInfo?.running ? '停止定时' : '开启定时'}
          </button>
        </div>

        {/* ===== 启动按钮 ===== */}
        <div className="text-center mb-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={startPipeline}
            disabled={running}
            className={`group relative px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-500 ${
              running
                ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95'
            }`}
          >
            {running ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin-slow w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                任务执行中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                开始任务
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </button>
        </div>

        {/* ===== 步骤进度 ===== */}
        {running && (
          <div className="animate-fade-in-up">
            <StepIndicator step={currentStep} />
          </div>
        )}

        {/* ===== 日志区域 ===== */}
        <div className="glass-card glass-card-hover p-0 overflow-hidden mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="px-6 pt-5 pb-3 border-b border-slate-700/50 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-slate-500 font-mono ml-2">pipeline.log</span>
            {running && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-indigo-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <div className="bg-[#0a0e1a] p-5 h-72 overflow-y-auto">
            {logs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-4xl mb-3 opacity-30">⌘</div>
                <div className="text-sm">点击上方按钮启动选品流程</div>
                <div className="text-xs text-slate-700 mt-1">日志将在此处实时滚动显示</div>
              </div>
            )}
            {logs.map((log, i) => (
              <LogLine key={i} log={log} index={i} />
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* ===== 数据表格 ===== */}
        <DataTable rows={rows} />

        {/* 底部 */}
        <footer className="text-center mt-16 pb-8 text-xs text-slate-700">
          Built with FastAPI + React + DeepSeek AI
        </footer>
      </div>
    </div>
  )
}
