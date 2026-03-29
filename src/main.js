import './style.css'

const STORAGE_KEY = 'pomodoro-pwa-state-v2'
const WAKE_VIDEO_SRC = './media/keep-awake.mp4'
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
  immersiveMode: true,
  updatedAt: new Date().toISOString(),
}

let timer = null
let wakeLock = null
let deferredInstallPrompt = null
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
  next.immersiveMode = next.immersiveMode !== false
  next.updatedAt = new Date().toISOString()
  return next
}

function saveState() {
  state.updatedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function modeLabel(mode) {
  return {
    work: '专注时间',
    shortBreak: '短休息',
    longBreak: '长休息',
  }[mode]
}

function minutesForMode(mode) {
  if (mode === 'shortBreak') return state.shortBreakMinutes
  if (mode === 'longBreak') return state.longBreakMinutes
  return state.workMinutes
}

function progressRatio() {
  const total = minutesForMode(state.currentMode) * 60
  if (!total) return 0
  return Math.max(0, Math.min(1, 1 - state.timeLeft / total))
}

function setMode(mode) {
  state.currentMode = mode
  state.timeLeft = minutesForMode(mode) * 60
  state.isRunning = false
  stopTimer()
  releaseWakeLock()
  saveState()
  render()
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        wakeLock = null
        renderStatusOnly()
      })
      renderStatusOnly()
      return true
    }
  } catch {
    wakeLock = null
  }
  return false
}

async function releaseWakeLock() {
  try {
    if (wakeLock) await wakeLock.release()
  } catch {
    // ignore
  }
  wakeLock = null
  pauseKeepAwakeVideo()
  renderStatusOnly()
}

function playKeepAwakeVideo() {
  const video = document.querySelector('#keep-awake-video')
  if (!video) return
  video.play().catch(() => {})
}

function pauseKeepAwakeVideo() {
  const video = document.querySelector('#keep-awake-video')
  if (!video) return
  video.pause()
}

async function ensureAwake() {
  const locked = await requestWakeLock()
  if (!locked) playKeepAwakeVideo()
}

async function enterFullscreen() {
  const root = document.documentElement
  try {
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen()
    }
  } catch {
    // ignore fullscreen failures
  }
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function startTimer() {
  if (timer) return
  state.isRunning = true
  saveState()
  render()
  if (state.immersiveMode) await enterFullscreen()
  await ensureAwake()
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

async function pauseTimer() {
  state.isRunning = false
  stopTimer()
  await releaseWakeLock()
  saveState()
  render()
}

async function resetTimer() {
  stopTimer()
  state.isRunning = false
  state.timeLeft = minutesForMode(state.currentMode) * 60
  await releaseWakeLock()
  saveState()
  render()
}

async function completeSession() {
  stopTimer()
  state.isRunning = false
  await releaseWakeLock()

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

async function triggerInstall() {
  if (!deferredInstallPrompt) {
    alert('当前浏览器还没准备好安装入口。你也可以用浏览器菜单里的“添加到主屏幕 / 安装应用”。')
    return
  }
  deferredInstallPrompt.prompt()
  await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  render()
}

function renderTimerOnly() {
  const timerValue = document.querySelector('[data-role="timer"]')
  const title = document.querySelector('title')
  const progress = document.querySelector('[data-role="progress"]')
  if (timerValue) timerValue.textContent = formatTime(state.timeLeft)
  if (progress) progress.style.setProperty('--progress', `${progressRatio()}`)
  if (title) title.textContent = `${formatTime(state.timeLeft)} · ${modeLabel(state.currentMode)}`
}

function renderStatusOnly() {
  const wake = document.querySelector('[data-role="wake-status"]')
  if (!wake) return
  wake.textContent = wakeLock ? '防熄屏：Wake Lock 已启用' : state.isRunning ? '防熄屏：视频兜底运行中' : '防熄屏：未启用'
}

function render() {
  const ratio = progressRatio()
  document.body.dataset.mode = state.currentMode
  document.querySelector('#app').innerHTML = `
    <main class="immersive-shell ${state.isRunning ? 'running' : ''}">
      <video id="keep-awake-video" class="keep-awake-video" src="${WAKE_VIDEO_SRC}" muted loop playsinline preload="auto"></video>
      <div class="bg-blobs" aria-hidden="true">
        <span class="blob blob-a"></span>
        <span class="blob blob-b"></span>
        <span class="blob blob-c"></span>
        <span class="grid-glow"></span>
      </div>

      <section class="focus-stage">
        <div class="top-bar glass">
          <div>
            <p class="eyebrow">沉浸式番茄钟 PWA</p>
            <h1>${state.isRunning ? '现在只做一件事。' : '把世界先静音。'}</h1>
            <p class="sub">启动后自动尝试全屏；优先用 Wake Lock 防熄屏，不支持时自动切到隐藏视频兜底。</p>
          </div>
          <div class="top-actions">
            <button class="ghost-btn" id="install-btn" ${deferredInstallPrompt ? '' : 'disabled'}>安装到桌面</button>
            <button class="ghost-btn" id="fullscreen-btn">进入全屏</button>
            <button class="ghost-btn" id="notify-btn">开启通知</button>
          </div>
        </div>

        <div class="mode-pills glass">
          <button class="tab ${state.currentMode === 'work' ? 'active' : ''}" data-mode="work">专注</button>
          <button class="tab ${state.currentMode === 'shortBreak' ? 'active' : ''}" data-mode="shortBreak">短休息</button>
          <button class="tab ${state.currentMode === 'longBreak' ? 'active' : ''}" data-mode="longBreak">长休息</button>
          <label class="switch-pill">
            <input type="checkbox" id="immersive-toggle" ${state.immersiveMode ? 'checked' : ''} />
            <span>启动时全屏</span>
          </label>
        </div>

        <section class="timer-panel glass">
          <div class="ambient-halo"></div>
          <div class="ring progress-ring" data-role="progress" style="--progress:${ratio}">
            <div class="ring-inner">
              <span class="timer" data-role="timer">${formatTime(state.timeLeft)}</span>
              <span class="timer-label">${modeLabel(state.currentMode)}</span>
              <span class="session-hint">第 ${Math.floor(state.cycleCount / Math.max(1, state.roundsBeforeLongBreak)) + 1} 轮专注流</span>
            </div>
          </div>

          <div class="actions">
            <button class="primary-btn" id="start-btn">${state.isRunning ? '计时中…' : '开始沉浸'}</button>
            <button class="secondary-btn" id="pause-btn">暂停</button>
            <button class="secondary-btn" id="reset-btn">重置</button>
          </div>

          <div class="live-status">
            <span class="status-chip">${state.isRunning ? '进行中' : '待开始'}</span>
            <span class="status-chip" data-role="wake-status">${wakeLock ? '防熄屏：Wake Lock 已启用' : state.isRunning ? '防熄屏：视频兜底运行中' : '防熄屏：未启用'}</span>
            <span class="status-chip">${navigator.onLine ? '在线' : '离线'}</span>
            <span class="status-chip">PWA ${window.matchMedia('(display-mode: standalone)').matches ? '已安装' : '网页模式'}</span>
          </div>
        </section>

        <section class="dashboard-grid">
          <section class="glass panel">
            <h2>统计</h2>
            <div class="stats">
              <div><strong>${state.completedPomodoros}</strong><span>累计完成</span></div>
              <div><strong>${state.sessionsToday}</strong><span>今日完成</span></div>
              <div><strong>${state.tasks.filter((t) => !t.done).length}</strong><span>待办任务</span></div>
            </div>
          </section>

          <section class="glass panel">
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

        <section class="dashboard-grid bottom-grid">
          <section class="glass panel">
            <div class="section-head">
              <h2>任务</h2>
            </div>
            <form id="task-form" class="task-form">
              <input id="task-input" placeholder="只写当前最重要的一件事" />
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
              `).join('') || '<li class="empty">还没有任务，先写下你现在要做的那一件。</li>'}
            </ul>
          </section>

          <section class="glass panel">
            <h2>数据与离线</h2>
            <p class="sub small">已支持离线缓存。首次打开后，核心页面和资源会缓存到本地。</p>
            <div class="data-actions">
              <button class="secondary-btn" id="export-btn">下载数据</button>
              <label class="upload-btn">
                上传数据
                <input type="file" id="import-input" accept="application/json" hidden />
              </label>
            </div>
            <p class="updated">最近更新时间：${new Date(state.updatedAt).toLocaleString('zh-CN')}</p>
            <p class="updated">如果桌面安装入口没弹出，也可以在浏览器菜单里选择“添加到主屏幕 / 安装应用”。</p>
          </section>
        </section>
      </section>
    </main>
  `

  document.querySelector('#start-btn')?.addEventListener('click', startTimer)
  document.querySelector('#pause-btn')?.addEventListener('click', pauseTimer)
  document.querySelector('#reset-btn')?.addEventListener('click', resetTimer)
  document.querySelector('#notify-btn')?.addEventListener('click', askNotificationPermission)
  document.querySelector('#export-btn')?.addEventListener('click', exportData)
  document.querySelector('#install-btn')?.addEventListener('click', triggerInstall)
  document.querySelector('#fullscreen-btn')?.addEventListener('click', enterFullscreen)
  document.querySelector('#import-input')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0]
    if (file) importData(file)
  })

  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')))
  })

  document.querySelector('#immersive-toggle')?.addEventListener('change', (event) => {
    state.immersiveMode = event.target.checked
    saveState()
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
  renderStatusOnly()
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstallPrompt = event
  render()
})

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null
  render()
})

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && state.isRunning) {
    await ensureAwake()
  }
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

render()
