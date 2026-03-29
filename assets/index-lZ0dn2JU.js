(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`pomodoro-pwa-state-v2`,t=`./media/keep-awake.mp4`,n={workMinutes:25,shortBreakMinutes:5,longBreakMinutes:15,roundsBeforeLongBreak:4,completedPomodoros:0,sessionsToday:0,currentMode:`work`,timeLeft:1500,isRunning:!1,cycleCount:0,tasks:[],immersiveMode:!0,updatedAt:new Date().toISOString()},r=null,i=null,a=null,o=s();function s(){try{let t=localStorage.getItem(e);if(!t)return{...n};let r=JSON.parse(t);return c({...n,...r})}catch{return{...n}}}function c(e){let t={...n,...e};return t.workMinutes=Number(t.workMinutes)||n.workMinutes,t.shortBreakMinutes=Number(t.shortBreakMinutes)||n.shortBreakMinutes,t.longBreakMinutes=Number(t.longBreakMinutes)||n.longBreakMinutes,t.roundsBeforeLongBreak=Number(t.roundsBeforeLongBreak)||n.roundsBeforeLongBreak,t.completedPomodoros=Number(t.completedPomodoros)||0,t.sessionsToday=Number(t.sessionsToday)||0,t.cycleCount=Number(t.cycleCount)||0,t.timeLeft=Number(t.timeLeft)||t.workMinutes*60,t.tasks=Array.isArray(t.tasks)?t.tasks:[],t.currentMode=[`work`,`shortBreak`,`longBreak`].includes(t.currentMode)?t.currentMode:`work`,t.isRunning=!!t.isRunning,t.immersiveMode=t.immersiveMode!==!1,t.updatedAt=new Date().toISOString(),t}function l(){o.updatedAt=new Date().toISOString(),localStorage.setItem(e,JSON.stringify(o))}function u(e){return{work:`专注时间`,shortBreak:`短休息`,longBreak:`长休息`}[e]}function d(e){return e===`shortBreak`?o.shortBreakMinutes:e===`longBreak`?o.longBreakMinutes:o.workMinutes}function f(){let e=d(o.currentMode)*60;return e?Math.max(0,Math.min(1,1-o.timeLeft/e)):0}function p(e){o.currentMode=e,o.timeLeft=d(e)*60,o.isRunning=!1,b(),h(),l(),I()}async function m(){try{if(`wakeLock`in navigator&&document.visibilityState===`visible`)return i=await navigator.wakeLock.request(`screen`),i.addEventListener(`release`,()=>{i=null,F()}),F(),!0}catch{i=null}return!1}async function h(){try{i&&await i.release()}catch{}i=null,_(),F()}function g(){let e=document.querySelector(`#keep-awake-video`);e&&e.play().catch(()=>{})}function _(){let e=document.querySelector(`#keep-awake-video`);e&&e.pause()}async function v(){await m()||g()}async function y(){let e=document.documentElement;try{!document.fullscreenElement&&e.requestFullscreen&&await e.requestFullscreen()}catch{}}function b(){r&&=(clearInterval(r),null)}async function x(){r||=(o.isRunning=!0,l(),I(),o.immersiveMode&&await y(),await v(),setInterval(()=>{if(--o.timeLeft,o.timeLeft<=0){w();return}l(),P()},1e3))}async function S(){o.isRunning=!1,b(),await h(),l(),I()}async function C(){b(),o.isRunning=!1,o.timeLeft=d(o.currentMode)*60,await h(),l(),I()}async function w(){if(b(),o.isRunning=!1,await h(),o.currentMode===`work`){o.completedPomodoros+=1,o.sessionsToday+=1,o.cycleCount+=1;let e=o.cycleCount%o.roundsBeforeLongBreak===0;o.currentMode=e?`longBreak`:`shortBreak`}else o.currentMode=`work`;o.timeLeft=d(o.currentMode)*60,T(`${u(o.currentMode)} 开始了`),l(),I()}function T(e){`Notification`in window&&Notification.permission===`granted`&&new Notification(`番茄钟提醒`,{body:e})}function E(){`Notification`in window&&Notification.permission===`default`&&Notification.requestPermission()}function D(e){return`${String(Math.floor(e/60)).padStart(2,`0`)}:${String(e%60).padStart(2,`0`)}`}function O(){let e=JSON.stringify(o,null,2),t=new Blob([e],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`pomodoro-backup-${new Date().toISOString().slice(0,10)}.json`,r.click(),URL.revokeObjectURL(n)}function k(e){let t=new FileReader;t.onload=()=>{try{o=c(JSON.parse(String(t.result))),b(),l(),I()}catch{alert(`导入失败：JSON 文件格式不正确`)}},t.readAsText(e)}function A(e){let t=e.trim();t&&(o.tasks.unshift({id:crypto.randomUUID(),text:t,done:!1}),l(),I())}function j(e){o.tasks=o.tasks.map(t=>t.id===e?{...t,done:!t.done}:t),l(),I()}function M(e){o.tasks=o.tasks.filter(t=>t.id!==e),l(),I()}async function N(){if(!a){alert(`当前浏览器还没准备好安装入口。你也可以用浏览器菜单里的“添加到主屏幕 / 安装应用”。`);return}a.prompt(),await a.userChoice,a=null,I()}function P(){let e=document.querySelector(`[data-role="timer"]`),t=document.querySelector(`title`),n=document.querySelector(`[data-role="progress"]`);e&&(e.textContent=D(o.timeLeft)),n&&n.style.setProperty(`--progress`,`${f()}`),t&&(t.textContent=`${D(o.timeLeft)} · ${u(o.currentMode)}`)}function F(){let e=document.querySelector(`[data-role="wake-status"]`);e&&(e.textContent=i?`防熄屏：Wake Lock 已启用`:o.isRunning?`防熄屏：视频兜底运行中`:`防熄屏：未启用`)}function I(){let e=f();document.body.dataset.mode=o.currentMode,document.querySelector(`#app`).innerHTML=`
    <main class="immersive-shell ${o.isRunning?`running`:``}">
      <video id="keep-awake-video" class="keep-awake-video" src="${t}" muted loop playsinline preload="auto"></video>
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
            <h1>${o.isRunning?`现在只做一件事。`:`把世界先静音。`}</h1>
            <p class="sub">启动后自动尝试全屏；优先用 Wake Lock 防熄屏，不支持时自动切到隐藏视频兜底。</p>
          </div>
          <div class="top-actions">
            <button class="ghost-btn" id="install-btn" ${a?``:`disabled`}>安装到桌面</button>
            <button class="ghost-btn" id="fullscreen-btn">进入全屏</button>
            <button class="ghost-btn" id="notify-btn">开启通知</button>
          </div>
        </div>

        <div class="mode-pills glass">
          <button class="tab ${o.currentMode===`work`?`active`:``}" data-mode="work">专注</button>
          <button class="tab ${o.currentMode===`shortBreak`?`active`:``}" data-mode="shortBreak">短休息</button>
          <button class="tab ${o.currentMode===`longBreak`?`active`:``}" data-mode="longBreak">长休息</button>
          <label class="switch-pill">
            <input type="checkbox" id="immersive-toggle" ${o.immersiveMode?`checked`:``} />
            <span>启动时全屏</span>
          </label>
        </div>

        <section class="timer-panel glass">
          <div class="ambient-halo"></div>
          <div class="ring progress-ring" data-role="progress" style="--progress:${e}">
            <div class="ring-inner">
              <span class="timer" data-role="timer">${D(o.timeLeft)}</span>
              <span class="timer-label">${u(o.currentMode)}</span>
              <span class="session-hint">第 ${Math.floor(o.cycleCount/Math.max(1,o.roundsBeforeLongBreak))+1} 轮专注流</span>
            </div>
          </div>

          <div class="actions">
            <button class="primary-btn" id="start-btn">${o.isRunning?`计时中…`:`开始沉浸`}</button>
            <button class="secondary-btn" id="pause-btn">暂停</button>
            <button class="secondary-btn" id="reset-btn">重置</button>
          </div>

          <div class="live-status">
            <span class="status-chip">${o.isRunning?`进行中`:`待开始`}</span>
            <span class="status-chip" data-role="wake-status">${i?`防熄屏：Wake Lock 已启用`:o.isRunning?`防熄屏：视频兜底运行中`:`防熄屏：未启用`}</span>
            <span class="status-chip">${navigator.onLine?`在线`:`离线`}</span>
            <span class="status-chip">PWA ${window.matchMedia(`(display-mode: standalone)`).matches?`已安装`:`网页模式`}</span>
          </div>
        </section>

        <section class="dashboard-grid">
          <section class="glass panel">
            <h2>统计</h2>
            <div class="stats">
              <div><strong>${o.completedPomodoros}</strong><span>累计完成</span></div>
              <div><strong>${o.sessionsToday}</strong><span>今日完成</span></div>
              <div><strong>${o.tasks.filter(e=>!e.done).length}</strong><span>待办任务</span></div>
            </div>
          </section>

          <section class="glass panel">
            <h2>设置</h2>
            <div class="settings">
              <label>专注时长（分钟）<input type="number" min="1" value="${o.workMinutes}" id="workMinutes" /></label>
              <label>短休息（分钟）<input type="number" min="1" value="${o.shortBreakMinutes}" id="shortBreakMinutes" /></label>
              <label>长休息（分钟）<input type="number" min="1" value="${o.longBreakMinutes}" id="longBreakMinutes" /></label>
              <label>几轮后长休息<input type="number" min="1" value="${o.roundsBeforeLongBreak}" id="roundsBeforeLongBreak" /></label>
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
              ${o.tasks.map(e=>`
                <li class="task-item ${e.done?`done`:``}">
                  <label>
                    <input type="checkbox" data-task-toggle="${e.id}" ${e.done?`checked`:``} />
                    <span>${e.text}</span>
                  </label>
                  <button class="icon-btn" data-task-delete="${e.id}">删除</button>
                </li>
              `).join(``)||`<li class="empty">还没有任务，先写下你现在要做的那一件。</li>`}
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
            <p class="updated">最近更新时间：${new Date(o.updatedAt).toLocaleString(`zh-CN`)}</p>
            <p class="updated">如果桌面安装入口没弹出，也可以在浏览器菜单里选择“添加到主屏幕 / 安装应用”。</p>
          </section>
        </section>
      </section>
    </main>
  `,document.querySelector(`#start-btn`)?.addEventListener(`click`,x),document.querySelector(`#pause-btn`)?.addEventListener(`click`,S),document.querySelector(`#reset-btn`)?.addEventListener(`click`,C),document.querySelector(`#notify-btn`)?.addEventListener(`click`,E),document.querySelector(`#export-btn`)?.addEventListener(`click`,O),document.querySelector(`#install-btn`)?.addEventListener(`click`,N),document.querySelector(`#fullscreen-btn`)?.addEventListener(`click`,y),document.querySelector(`#import-input`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&k(t)}),document.querySelectorAll(`[data-mode]`).forEach(e=>{e.addEventListener(`click`,()=>p(e.getAttribute(`data-mode`)))}),document.querySelector(`#immersive-toggle`)?.addEventListener(`change`,e=>{o.immersiveMode=e.target.checked,l()}),document.querySelector(`#save-settings-btn`)?.addEventListener(`click`,()=>{o.workMinutes=Number(document.querySelector(`#workMinutes`).value)||n.workMinutes,o.shortBreakMinutes=Number(document.querySelector(`#shortBreakMinutes`).value)||n.shortBreakMinutes,o.longBreakMinutes=Number(document.querySelector(`#longBreakMinutes`).value)||n.longBreakMinutes,o.roundsBeforeLongBreak=Number(document.querySelector(`#roundsBeforeLongBreak`).value)||n.roundsBeforeLongBreak,o.timeLeft=d(o.currentMode)*60,l(),I()}),document.querySelector(`#task-form`)?.addEventListener(`submit`,e=>{e.preventDefault();let t=document.querySelector(`#task-input`);A(t.value),t.value=``}),document.querySelectorAll(`[data-task-toggle]`).forEach(e=>{e.addEventListener(`change`,()=>j(e.getAttribute(`data-task-toggle`)))}),document.querySelectorAll(`[data-task-delete]`).forEach(e=>{e.addEventListener(`click`,()=>M(e.getAttribute(`data-task-delete`)))}),P(),F()}window.addEventListener(`beforeinstallprompt`,e=>{e.preventDefault(),a=e,I()}),window.addEventListener(`appinstalled`,()=>{a=null,I()}),document.addEventListener(`visibilitychange`,async()=>{document.visibilityState===`visible`&&o.isRunning&&await v()}),`serviceWorker`in navigator&&window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`./sw.js`).catch(()=>{})}),I();