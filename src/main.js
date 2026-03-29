import './style.css'

const STORAGE_KEY = 'pomodoro-pwa-state-v3'
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
  noiseEnabled: false,
  noiseVolume: 0.18,
  panelOpen: false,
  updatedAt: new Date().toISOString(),
}

let timer = null
let wakeLock = null
let deferredInstallPrompt = null
let audioContext = null
let noiseSource = null
let noiseFilter = null
let noiseGain = null
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
  next.noiseEnabled = Boolean(next.noiseEnabled)
  next.noiseVolume = Math.min(1, Math.max(0, Number(next.noiseVolume) || DEFAULTS.noiseVolume))
  next.panelOpen = Boolean(next.panelOpen)
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

async function setMode(mode) {
  state.currentMode = mode
  state.timeLeft = minutesForMode(mode) * 60
  state.isRunning = false
  stopTimer()
  await releaseWakeLock()
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
    // ignore
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
  if (state.noiseEnabled) await startNoise()
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
  stopNoise()
  saveState()
  render()
}

async function resetTimer() {
  stopTimer()
  state.isRunning = false
  state.timeLeft = minutesForMode(state.currentMode) * 60
  await releaseWakeLock()
  stopNoise()
  saveState()
  render()
}

async function completeSession() {
  stopTimer()
  state.isRunning = false
  await releaseWakeLock()
  stopNoise()

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
      stopNoise()
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
  renderPanelOnly()
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
  saveState()
  renderPanelOnly()
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id)
  saveState()
  renderPanelOnly()
}

async function triggerInstall() {
  if (!deferredInstallPrompt) {
    alert('当前浏览器还没准备好安装入口。你也可以用浏览器菜单里的“添加到主屏幕 / 安装应用”。')
    return
  }
  deferredInstallPrompt.prompt()
  await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  renderPanelOnly()
}

function createNoiseBuffer(context) {
  const length = context.sampleRate * 2
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.5
  }
  return buffer
}

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  return audioContext
}

async function startNoise() {
  try {
    const context = await ensureAudioContext()
    stopNoise()
    noiseSource = context.createBufferSource()
    noiseSource.buffer = createNoiseBuffer(context)
    noiseSource.loop = true

    noiseFilter = context.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 900
    noiseFilter.Q.value = 0.6

    noiseGain = context.createGain()
    noiseGain.gain.value = state.noiseVolume

    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(context.destination)
    noiseSource.start()
  } catch {
    // ignore audio failures
  }
}

function stopNoise() {
  if (noiseSource) {
    try {
      noiseSource.stop()
    } catch {
      // ignore
    }
    noiseSource.disconnect()
    noiseSource = null
  }
  if (noiseFilter) {
    noiseFilter.disconnect()
    noiseFilter = null
  }
  if (noiseGain) {
    noiseGain.disconnect()
    noiseGain = null
  }
}

async function toggleNoise(force) {
  state.noiseEnabled = typeof force === 'boolean' ? force : !state.noiseEnabled
  saveState()
  if (state.noiseEnabled && state.isRunning) {
    await startNoise()
  } else {
    stopNoise()
  }
  renderPanelOnly()
  renderMinimalStatus()
}

function updateNoiseVolume(value) {
  state.noiseVolume = Math.min(1, Math.max(0, Number(value)))
  if (noiseGain) noiseGain.gain.value = state.noiseVolume
  saveState()
  renderPanelOnly()
}

function togglePanel(force) {
  state.panelOpen = typeof force === 'boolean' ? force : !state.panelOpen
  saveState()
  const panel = document.querySelector('[data-role="side-panel"]')
  const overlay = document.querySelector('[data-role="panel-overlay"]')
  if (panel) panel.classList.toggle('open', state.panelOpen)
  if (overlay) overlay.classList.toggle('open', state.panelOpen)
}

function renderTimerOnly() {
  const timerValue = document.querySelector('[data-role="timer"]')
  const title = document.querySelector('title')
  const progress = document.querySelector('[data-role="progress"]')
  const phase = document.querySelector('[data-role="phase"]')
  const breath = document.querySelector('[data-role="breath"]')
  if (timerValue) timerValue.textContent = formatTime(state.timeLeft)
  if (progress) progress.style.setProperty('--progress', `${progressRatio()}`)
  if (phase) phase.textContent = modeLabel(state.currentMode)
  if (breath) breath.textContent = state.isRunning ? '呼吸，继续。' : '准备开始。'
  if (title) title.textContent = `${formatTime(state.timeLeft)} · ${modeLabel(state.currentMode)}`
}

function renderStatusOnly() {
  const wake = document.querySelector('[data-role="wake-status"]')
  if (!wake) return
  wake.textContent = wakeLock ? 'Wake Lock' : state.isRunning ? '视频兜底' : '未启用'
}

function renderMinimalStatus() {
  const noise = document.querySelector('[data-role="noise-status"]')
  const panelBtn = document.querySelector('#panel-toggle-btn')
  if (noise) noise.textContent = state.noiseEnabled ? `白噪音 ${Math.round(state.noiseVolume * 100)}%` : '白噪音关闭'
  if (panelBtn) panelBtn.setAttribute('aria-expanded', String(state.panelOpen))
  renderStatusOnly()
}

function panelMarkup() {
  return `
    <div class="panel-scroll">
      <div class="panel-head">
        <div>
          <p class="eyebrow">二级页面</p>
          <h2>设置与数据</h2>
        </div>
        <button class="icon-btn" id="panel-close-btn">关闭</button>
      </div>

      <section class="panel-block">
        <h3>模式</h3>
        <div class="stack-actions compact">
          <button class="tab ${state.currentMode === 'work' ? 'active' : ''}" data-mode="work">专注</button>
          <button class="tab ${state.currentMode === 'shortBreak' ? 'active' : ''}" data-mode="shortBreak">短休息</button>
          <button class="tab ${state.currentMode === 'longBreak' ? 'active' : ''}" data-mode="longBreak">长休息</button>
        </div>
      </section>

      <section class="panel-block">
        <h3>白噪音</h3>
        <div class="setting-row">
          <label class="switch-pill wide">
            <input type="checkbox" id="noise-toggle" ${state.noiseEnabled ? 'checked' : ''} />
            <span>开启平静白噪音</span>
          </label>
        </div>
        <label class="range-label">音量 ${Math.round(state.noiseVolume * 100)}%
          <input type="range" id="noise-volume" min="0" max="1" step="0.01" value="${state.noiseVolume}" />
        </label>
      </section>

      <section class="panel-block">
        <h3>计时设置</h3>
        <div class="settings single-col">
          <label>专注时长（分钟）<input type="number" min="1" value="${state.workMinutes}" id="workMinutes" /></label>
          <label>短休息（分钟）<input type="number" min="1" value="${state.shortBreakMinutes}" id="shortBreakMinutes" /></label>
          <label>长休息（分钟）<input type="number" min="1" value="${state.longBreakMinutes}" id="longBreakMinutes" /></label>
          <label>几轮后长休息<input type="number" min="1" value="${state.roundsBeforeLongBreak}" id="roundsBeforeLongBreak" /></label>
          <label class="switch-pill wide">
            <input type="checkbox" id="immersive-toggle" ${state.immersiveMode ? 'checked' : ''} />
            <span>开始时自动全屏</span>
          </label>
          <button class="secondary-btn" id="save-settings-btn">保存设置</button>
        </div>
      </section>

      <section class="panel-block">
        <h3>任务</h3>
        <form id="task-form" class="task-form vertical">
          <input id="task-input" placeholder="写下当前唯一重要的任务" />
          <button class="primary-btn" type="submit">添加任务</button>
        </form>
        <ul class="task-list compact-list">
          ${state.tasks.map((task) => `
            <li class="task-item ${task.done ? 'done' : ''}">
              <label>
                <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? 'checked' : ''} />
                <span>${task.text}</span>
              </label>
              <button class="icon-btn" data-task-delete="${task.id}">删除</button>
            </li>
          `).join('') || '<li class="empty">还没有任务。</li>'}
        </ul>
      </section>

      <section class="panel-block">
        <h3>应用</h3>
        <div class="stack-actions vertical-stack">
          <button class="ghost-btn" id="install-btn" ${deferredInstallPrompt ? '' : 'disabled'}>安装到桌面</button>
          <button class="ghost-btn" id="fullscreen-btn">进入全屏</button>
          <button class="ghost-btn" id="notify-btn">开启通知</button>
          <button class="secondary-btn" id="export-btn">下载数据</button>
          <label class="upload-btn wide-upload">
            上传数据
            <input type="file" id="import-input" accept="application/json" hidden />
          </label>
        </div>
        <div class="meta-lines">
          <p>累计完成：${state.completedPomodoros}</p>
          <p>今日完成：${state.sessionsToday}</p>
          <p>待办任务：${state.tasks.filter((t) => !t.done).length}</p>
          <p>最近更新：${new Date(state.updatedAt).toLocaleString('zh-CN')}</p>
          <p>PWA：${window.matchMedia('(display-mode: standalone)').matches ? '已安装' : '网页模式'}</p>
          <p>离线：${navigator.onLine ? '在线' : '离线'}</p>
        </div>
      </section>
    </div>
  `
}

function bindPanelEvents() {
  document.querySelector('#panel-close-btn')?.addEventListener('click', () => togglePanel(false))
  document.querySelector('#install-btn')?.addEventListener('click', triggerInstall)
  document.querySelector('#fullscreen-btn')?.addEventListener('click', enterFullscreen)
  document.querySelector('#notify-btn')?.addEventListener('click', askNotificationPermission)
  document.querySelector('#export-btn')?.addEventListener('click', exportData)
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
  document.querySelector('#noise-toggle')?.addEventListener('change', (event) => {
    toggleNoise(event.target.checked)
  })
  document.querySelector('#noise-volume')?.addEventListener('input', (event) => {
    updateNoiseVolume(event.target.value)
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
}

function renderPanelOnly() {
  const panel = document.querySelector('[data-role="side-panel"]')
  if (!panel) return
  panel.innerHTML = panelMarkup()
  bindPanelEvents()
  renderMinimalStatus()
}

function render() {
  const ratio = progressRatio()
  document.body.dataset.mode = state.currentMode
  document.querySelector('#app').innerHTML = `
    <main class="immersive-shell minimal-shell ${state.isRunning ? 'running' : ''}">
      <video id="keep-awake-video" class="keep-awake-video" src="${WAKE_VIDEO_SRC}" muted loop playsinline preload="auto"></video>
      <div class="bg-blobs calm" aria-hidden="true">
        <span class="blob blob-a"></span>
        <span class="blob blob-b"></span>
        <span class="blob blob-c"></span>
        <span class="mist mist-a"></span>
        <span class="mist mist-b"></span>
      </div>

      <button class="panel-overlay ${state.panelOpen ? 'open' : ''}" data-role="panel-overlay" aria-label="关闭侧边栏"></button>

      <section class="minimal-stage">
        <header class="minimal-topbar">
          <button class="ghost-btn slim" id="panel-toggle-btn" aria-expanded="${state.panelOpen}">设置</button>
          <div class="mini-badges">
            <span class="status-chip quiet" data-role="phase">${modeLabel(state.currentMode)}</span>
            <span class="status-chip quiet" data-role="noise-status">${state.noiseEnabled ? `白噪音 ${Math.round(state.noiseVolume * 100)}%` : '白噪音关闭'}</span>
            <span class="status-chip quiet" data-role="wake-status">${wakeLock ? 'Wake Lock' : state.isRunning ? '视频兜底' : '未启用'}</span>
          </div>
        </header>

        <section class="hero-minimal">
          <div class="ambient-ring slow" data-role="progress" style="--progress:${ratio}">
            <div class="ambient-ring-inner">
              <div class="breath-dot"></div>
              <span class="timer massive" data-role="timer">${formatTime(state.timeLeft)}</span>
              <span class="timer-label soft" data-role="breath">${state.isRunning ? '呼吸，继续。' : '准备开始。'}</span>
            </div>
          </div>
        </section>

        <footer class="minimal-actions">
          <button class="primary-btn huge" id="start-btn">${state.isRunning ? '进行中' : '开始'}</button>
          <button class="secondary-btn huge" id="pause-btn">暂停</button>
          <button class="secondary-btn huge" id="reset-btn">重置</button>
          <button class="secondary-btn huge" id="noise-btn">${state.noiseEnabled ? '关闭白噪音' : '白噪音'}</button>
        </footer>

        <aside class="side-panel glass ${state.panelOpen ? 'open' : ''}" data-role="side-panel">
          ${panelMarkup()}
        </aside>
      </section>
    </main>
  `

  document.querySelector('#start-btn')?.addEventListener('click', startTimer)
  document.querySelector('#pause-btn')?.addEventListener('click', pauseTimer)
  document.querySelector('#reset-btn')?.addEventListener('click', resetTimer)
  document.querySelector('#noise-btn')?.addEventListener('click', () => toggleNoise())
  document.querySelector('#panel-toggle-btn')?.addEventListener('click', () => togglePanel())
  document.querySelector('[data-role="panel-overlay"]')?.addEventListener('click', () => togglePanel(false))

  bindPanelEvents()
  renderTimerOnly()
  renderMinimalStatus()
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstallPrompt = event
  renderPanelOnly()
})

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null
  renderPanelOnly()
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
