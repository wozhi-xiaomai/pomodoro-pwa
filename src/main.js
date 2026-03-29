import './style.css'

const STORAGE_KEY = 'pomodoro-pwa-state-v1'
const DEFAULTS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  completedPomodoros: 0,
  sessionsToday: 0,
  currentMode: 'work',
  timeLeft: 25 * 60,
  isRunning: false,
  cycleCount: 0,
  tasks: [],
  updatedAt: new Date().toISOString(),
}

let timer = null
let state = loadState()

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const saved = JSON.parse(raw)
    return normalizeState({ ...DEFAULTS, ...saved })
  } catch {
    return { ...DEFAULTS }
  }
}

function normalizeState(input) {
  const next = { ...DEFAULTS, ...input }
  next.workMinutes = Number(next.workMinutes) || DEFAULTS.workMinutes
  next.shortBreakMinutes = Number(next.shortBreakMinutes) || DEFAULTS.shortBreakMinutes
  next.longBreakMinutes = Number(next.longBreakMinutes) || DEFAULTS.longBreakMinutes
  next.roundsBeforeLongBreak = Number(next.roundsBeforeLongBreak) || DEFAULTS.roundsBeforeLongBreak
  next.completedPomodoros = Number(next.completedPomodoros) || 0
  next.sessionsToday = Number(next.sessionsToday) || 0
  next.cycleCount = Number(next.cycleCount) || 0
  next.timeLeft = Number(next.timeLeft) || next.workMinutes * 60
  next.tasks = Array.isArray(next.tasks) ? next.tasks : []
  next.currentMode = ['work', 'shortBreak', 'longBreak'].includes(next.currentMode) ? next.currentMode : 'work'
  next.isRunning = Boolean(next.isRunning)
  next.updatedAt = new Date().toISOString()
  return next
}

function saveState() {
  state.updatedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function minutesForMode(mode) {
  if (mode === 'shortBreak') return state.shortBreakMinutes
  if (mode === 'longBreak') return state.longBreakMinutes
  return state.workMinutes
}

function setMode(mode) {
  state.currentMode = mode
  state.timeLeft = minutesForMode(mode) * 60
  state.isRunning = false
  stopTimer()
  saveState()
  render()
}

function startTimer() {
  if (timer) return
  state.isRunning = true
  saveState()
  render()
  timer = setInterval(() => {
    state.timeLeft -= 1
    if (state.timeLeft <= 0) {
      completeSession()
      return
    }
    saveState()
    renderTimerOnly()
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function pauseTimer() {
  state.isRunning = false
  stopTimer()
  saveState()
  render()
}

function resetTimer() {
  stopTimer()
  state.isRunning = false
  state.timeLeft = minutesForMode(state.currentMode) * 60
  saveState()
  render()
}

function completeSession() {
  stopTimer()
  state.isRunning = false

  if (state.currentMode === 'work') {
    state.completedPomodoros += 1
    state.sessionsToday += 1
    state.cycleCount += 1
    const shouldLongBreak = state.cycleCount % state.roundsBeforeLongBreak === 0
    state.currentMode = shouldLongBreak ? 'longBreak' : 'shortBreak'
  } else {
    state.currentMode = 'work'
  }

  state.timeLeft = minutesForMode(state.currentMode) * 60
  notify(`${modeLabel(state.currentMode)} 开始了`) 
  saveState()
  render()
}

function notify(body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('番茄钟提醒', { body })
  }
}

function askNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function modeLabel(mode) {
  return {
    work: '专注时间',
    shortBreak: '短休息',
    longBreak: '长休息',
  }[mode]
}

function exportData() {
  const payload = JSON.stringify(state, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pomodoro-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      state = normalizeState(parsed)
      stopTimer()
      saveState()
      render()
    } catch {
      alert('导入失败：JSON 文件格式不正确')
    }
  }
  reader.readAsText(file)
}

function addTask(text) {
  const value = text.trim()
  if (!value) return
  state.tasks.unshift({ id: crypto.randomUUID(), text: value, done: false })
  saveState()
  render()
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
  saveState()
  render()
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id)
  saveState()
  render()
}

function renderTimerOnly() {
  const timerValue = document.querySelector('[data-role="timer"]')
  const title = document.querySelector('title')
  if (timerValue) timerValue.textContent = formatTime(state.timeLeft)
  if (title) title.textContent = `${formatTime(state.timeLeft)} · ${modeLabel(state.currentMode)}`
}

function render() {
  document.querySelector('#app').innerHTML = `
    <main class="shell">
      <section class="card hero-card">
        <div class="hero-top">
          <div>
            <p class="eyebrow">PWA 番茄钟</p>
            <h1>专注一点，别瞎忙。</h1>
            <p class="sub">支持安装到桌面、离线缓存、数据导出 / 导入、任务记录。</p>
          </div>
          <button class="ghost-btn" id="notify-btn">开启通知</button>
        </div>

        <div class="mode-tabs">
          <button class="tab ${state.currentMode === 'work' ? 'active' : ''}" data-mode="work">专注</button>
          <button class="tab ${state.currentMode === 'shortBreak' ? 'active' : ''}" data-mode="shortBreak">短休息</button>
          <button class="tab ${state.currentMode === 'longBreak' ? 'active' : ''}" data-mode="longBreak">长休息</button>
        </div>

        <div class="timer-wrap">
          <div class="ring">
            <span class="timer" data-role="timer">${formatTime(state.timeLeft)}</span>
            <span class="timer-label">${modeLabel(state.currentMode)}</span>
          </div>
        </div>

        <div class="actions">
          <button class="primary-btn" id="start-btn">${state.isRunning ? '计时中…' : '开始'}</button>
          <button class="secondary-btn" id="pause-btn">暂停</button>
          <button class="secondary-btn" id="reset-btn">重置</button>
        </div>
      </section>

      <section class="grid">
        <section class="card stats-card">
          <h2>统计</h2>
          <div class="stats">
            <div><strong>${state.completedPomodoros}</strong><span>累计完成</span></div>
            <div><strong>${state.sessionsToday}</strong><span>今日完成</span></div>
            <div><strong>${state.tasks.filter((t) => !t.done).length}</strong><span>待办任务</span></div>
          </div>
        </section>

        <section class="card settings-card">
          <h2>设置</h2>
          <div class="settings">
            <label>专注时长（分钟）<input type="number" min="1" value="${state.workMinutes}" id="workMinutes" /></label>
            <label>短休息（分钟）<input type="number" min="1" value="${state.shortBreakMinutes}" id="shortBreakMinutes" /></label>
            <label>长休息（分钟）<input type="number" min="1" value="${state.longBreakMinutes}" id="longBreakMinutes" /></label>
            <label>几轮后长休息<input type="number" min="1" value="${state.roundsBeforeLongBreak}" id="roundsBeforeLongBreak" /></label>
            <button class="secondary-btn" id="save-settings-btn">保存设置</button>
          </div>
        </section>
      </section>

      <section class="grid lower-grid">
        <section class="card tasks-card">
          <div class="section-head">
            <h2>任务</h2>
          </div>
          <form id="task-form" class="task-form">
            <input id="task-input" placeholder="写个任务，比如：整理 PR 列表" />
            <button class="primary-btn" type="submit">添加</button>
          </form>
          <ul class="task-list">
            ${state.tasks.map((task) => `
              <li class="task-item ${task.done ? 'done' : ''}">
                <label>
                  <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? 'checked' : ''} />
                  <span>${task.text}</span>
                </label>
                <button class="icon-btn" data-task-delete="${task.id}">删除</button>
              </li>
            `).join('') || '<li class="empty">还没有任务，先加一个。</li>'}
          </ul>
        </section>

        <section class="card data-card">
          <h2>数据管理</h2>
          <p class="sub small">可以把当前数据导出成 JSON，也可以重新导入恢复。</p>
          <div class="data-actions">
            <button class="secondary-btn" id="export-btn">下载数据</button>
            <label class="upload-btn">
              上传数据
              <input type="file" id="import-input" accept="application/json" hidden />
            </label>
          </div>
          <p class="updated">最近更新时间：${new Date(state.updatedAt).toLocaleString('zh-CN')}</p>
        </section>
      </section>
    </main>
  `

  document.querySelector('#start-btn')?.addEventListener('click', () => {
    if (!state.isRunning) startTimer()
  })
  document.querySelector('#pause-btn')?.addEventListener('click', pauseTimer)
  document.querySelector('#reset-btn')?.addEventListener('click', resetTimer)
  document.querySelector('#notify-btn')?.addEventListener('click', askNotificationPermission)
  document.querySelector('#export-btn')?.addEventListener('click', exportData)
  document.querySelector('#import-input')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0]
    if (file) importData(file)
  })

  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')))
  })

  document.querySelector('#save-settings-btn')?.addEventListener('click', () => {
    state.workMinutes = Number(document.querySelector('#workMinutes').value) || DEFAULTS.workMinutes
    state.shortBreakMinutes = Number(document.querySelector('#shortBreakMinutes').value) || DEFAULTS.shortBreakMinutes
    state.longBreakMinutes = Number(document.querySelector('#longBreakMinutes').value) || DEFAULTS.longBreakMinutes
    state.roundsBeforeLongBreak = Number(document.querySelector('#roundsBeforeLongBreak').value) || DEFAULTS.roundsBeforeLongBreak
    state.timeLeft = minutesForMode(state.currentMode) * 60
    saveState()
    render()
  })

  document.querySelector('#task-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const input = document.querySelector('#task-input')
    addTask(input.value)
    input.value = ''
  })

  document.querySelectorAll('[data-task-toggle]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => toggleTask(checkbox.getAttribute('data-task-toggle')))
  })

  document.querySelectorAll('[data-task-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteTask(button.getAttribute('data-task-delete')))
  })

  renderTimerOnly()
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

render()
