(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`pomodoro-pwa-state-v3`,t=`./media/keep-awake.mp4`,n={workMinutes:25,shortBreakMinutes:5,longBreakMinutes:15,roundsBeforeLongBreak:4,completedPomodoros:0,sessionsToday:0,currentMode:`work`,timeLeft:1500,isRunning:!1,cycleCount:0,tasks:[],immersiveMode:!0,noiseEnabled:!1,noiseVolume:.18,panelOpen:!1,updatedAt:new Date().toISOString()},r=null,i=null,a=null,o=null,s=null,c=null,l=null,u=d();function d(){try{let t=localStorage.getItem(e);if(!t)return{...n};let r=JSON.parse(t);return f({...n,...r})}catch{return{...n}}}function f(e){let t={...n,...e};return t.workMinutes=Number(t.workMinutes)||n.workMinutes,t.shortBreakMinutes=Number(t.shortBreakMinutes)||n.shortBreakMinutes,t.longBreakMinutes=Number(t.longBreakMinutes)||n.longBreakMinutes,t.roundsBeforeLongBreak=Number(t.roundsBeforeLongBreak)||n.roundsBeforeLongBreak,t.completedPomodoros=Number(t.completedPomodoros)||0,t.sessionsToday=Number(t.sessionsToday)||0,t.cycleCount=Number(t.cycleCount)||0,t.timeLeft=Number(t.timeLeft)||t.workMinutes*60,t.tasks=Array.isArray(t.tasks)?t.tasks:[],t.currentMode=[`work`,`shortBreak`,`longBreak`].includes(t.currentMode)?t.currentMode:`work`,t.isRunning=!!t.isRunning,t.immersiveMode=t.immersiveMode!==!1,t.noiseEnabled=!!t.noiseEnabled,t.noiseVolume=Math.min(1,Math.max(0,Number(t.noiseVolume)||n.noiseVolume)),t.panelOpen=!!t.panelOpen,t.updatedAt=new Date().toISOString(),t}function p(){u.updatedAt=new Date().toISOString(),localStorage.setItem(e,JSON.stringify(u))}function m(e){return{work:`专注时间`,shortBreak:`短休息`,longBreak:`长休息`}[e]}function h(e){return e===`shortBreak`?u.shortBreakMinutes:e===`longBreak`?u.longBreakMinutes:u.workMinutes}function g(){let e=h(u.currentMode)*60;return e?Math.max(0,Math.min(1,1-u.timeLeft/e)):0}async function _(e){u.currentMode=e,u.timeLeft=h(e)*60,u.isRunning=!1,w(),await y(),p(),Z()}async function v(){try{if(`wakeLock`in navigator&&document.visibilityState===`visible`)return i=await navigator.wakeLock.request(`screen`),i.addEventListener(`release`,()=>{i=null,K()}),K(),!0}catch{i=null}return!1}async function y(){try{i&&await i.release()}catch{}i=null,x(),K()}function b(){let e=document.querySelector(`#keep-awake-video`);e&&e.play().catch(()=>{})}function x(){let e=document.querySelector(`#keep-awake-video`);e&&e.pause()}async function S(){await v()||b()}async function C(){let e=document.documentElement;try{!document.fullscreenElement&&e.requestFullscreen&&await e.requestFullscreen()}catch{}}function w(){r&&=(clearInterval(r),null)}async function T(){r||=(u.isRunning=!0,p(),Z(),u.immersiveMode&&await C(),await S(),u.noiseEnabled&&await B(),setInterval(()=>{if(--u.timeLeft,u.timeLeft<=0){O();return}p(),G()},1e3))}async function E(){u.isRunning=!1,w(),await y(),V(),p(),Z()}async function D(){w(),u.isRunning=!1,u.timeLeft=h(u.currentMode)*60,await y(),V(),p(),Z()}async function O(){if(w(),u.isRunning=!1,await y(),V(),u.currentMode===`work`){u.completedPomodoros+=1,u.sessionsToday+=1,u.cycleCount+=1;let e=u.cycleCount%u.roundsBeforeLongBreak===0;u.currentMode=e?`longBreak`:`shortBreak`}else u.currentMode=`work`;u.timeLeft=h(u.currentMode)*60,k(`${m(u.currentMode)} 开始了`),p(),Z()}function k(e){`Notification`in window&&Notification.permission===`granted`&&new Notification(`番茄钟提醒`,{body:e})}function A(){`Notification`in window&&Notification.permission===`default`&&Notification.requestPermission()}function j(e){return`${String(Math.floor(e/60)).padStart(2,`0`)}:${String(e%60).padStart(2,`0`)}`}function M(){let e=JSON.stringify(u,null,2),t=new Blob([e],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`pomodoro-backup-${new Date().toISOString().slice(0,10)}.json`,r.click(),URL.revokeObjectURL(n)}function N(e){let t=new FileReader;t.onload=()=>{try{u=f(JSON.parse(String(t.result))),w(),V(),p(),Z()}catch{alert(`导入失败：JSON 文件格式不正确`)}},t.readAsText(e)}function P(e){let t=e.trim();t&&(u.tasks.unshift({id:crypto.randomUUID(),text:t,done:!1}),p(),X())}function F(e){u.tasks=u.tasks.map(t=>t.id===e?{...t,done:!t.done}:t),p(),X()}function I(e){u.tasks=u.tasks.filter(t=>t.id!==e),p(),X()}async function L(){if(!a){alert(`当前浏览器还没准备好安装入口。你也可以用浏览器菜单里的“添加到主屏幕 / 安装应用”。`);return}a.prompt(),await a.userChoice,a=null,X()}function R(e){let t=e.sampleRate*2,n=e.createBuffer(1,t,e.sampleRate),r=n.getChannelData(0);for(let e=0;e<t;e+=1)r[e]=(Math.random()*2-1)*.5;return n}async function z(){return o||=new(window.AudioContext||window.webkitAudioContext),o.state===`suspended`&&await o.resume(),o}async function B(){try{let e=await z();V(),s=e.createBufferSource(),s.buffer=R(e),s.loop=!0,c=e.createBiquadFilter(),c.type=`lowpass`,c.frequency.value=900,c.Q.value=.6,l=e.createGain(),l.gain.value=u.noiseVolume,s.connect(c),c.connect(l),l.connect(e.destination),s.start()}catch{}}function V(){if(s){try{s.stop()}catch{}s.disconnect(),s=null}c&&=(c.disconnect(),null),l&&=(l.disconnect(),null)}async function H(e){u.noiseEnabled=typeof e==`boolean`?e:!u.noiseEnabled,p(),u.noiseEnabled&&u.isRunning?await B():V(),X(),q()}function U(e){u.noiseVolume=Math.min(1,Math.max(0,Number(e))),l&&(l.gain.value=u.noiseVolume),p(),X()}function W(e){u.panelOpen=typeof e==`boolean`?e:!u.panelOpen,p();let t=document.querySelector(`[data-role="side-panel"]`),n=document.querySelector(`[data-role="panel-overlay"]`);t&&t.classList.toggle(`open`,u.panelOpen),n&&n.classList.toggle(`open`,u.panelOpen)}function G(){let e=document.querySelector(`[data-role="timer"]`),t=document.querySelector(`title`),n=document.querySelector(`[data-role="progress"]`),r=document.querySelector(`[data-role="phase"]`),i=document.querySelector(`[data-role="breath"]`);e&&(e.textContent=j(u.timeLeft)),n&&n.style.setProperty(`--progress`,`${g()}`),r&&(r.textContent=m(u.currentMode)),i&&(i.textContent=u.isRunning?`呼吸，继续。`:`准备开始。`),t&&(t.textContent=`${j(u.timeLeft)} · ${m(u.currentMode)}`)}function K(){let e=document.querySelector(`[data-role="wake-status"]`);e&&(e.textContent=i?`Wake Lock`:u.isRunning?`视频兜底`:`未启用`)}function q(){let e=document.querySelector(`[data-role="noise-status"]`),t=document.querySelector(`#panel-toggle-btn`);e&&(e.textContent=u.noiseEnabled?`白噪音 ${Math.round(u.noiseVolume*100)}%`:`白噪音关闭`),t&&t.setAttribute(`aria-expanded`,String(u.panelOpen)),K()}function J(){return`
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
          <button class="tab ${u.currentMode===`work`?`active`:``}" data-mode="work">专注</button>
          <button class="tab ${u.currentMode===`shortBreak`?`active`:``}" data-mode="shortBreak">短休息</button>
          <button class="tab ${u.currentMode===`longBreak`?`active`:``}" data-mode="longBreak">长休息</button>
        </div>
      </section>

      <section class="panel-block">
        <h3>白噪音</h3>
        <div class="setting-row">
          <label class="switch-pill wide">
            <input type="checkbox" id="noise-toggle" ${u.noiseEnabled?`checked`:``} />
            <span>开启平静白噪音</span>
          </label>
        </div>
        <label class="range-label">音量 ${Math.round(u.noiseVolume*100)}%
          <input type="range" id="noise-volume" min="0" max="1" step="0.01" value="${u.noiseVolume}" />
        </label>
      </section>

      <section class="panel-block">
        <h3>计时设置</h3>
        <div class="settings single-col">
          <label>专注时长（分钟）<input type="number" min="1" value="${u.workMinutes}" id="workMinutes" /></label>
          <label>短休息（分钟）<input type="number" min="1" value="${u.shortBreakMinutes}" id="shortBreakMinutes" /></label>
          <label>长休息（分钟）<input type="number" min="1" value="${u.longBreakMinutes}" id="longBreakMinutes" /></label>
          <label>几轮后长休息<input type="number" min="1" value="${u.roundsBeforeLongBreak}" id="roundsBeforeLongBreak" /></label>
          <label class="switch-pill wide">
            <input type="checkbox" id="immersive-toggle" ${u.immersiveMode?`checked`:``} />
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
          ${u.tasks.map(e=>`
            <li class="task-item ${e.done?`done`:``}">
              <label>
                <input type="checkbox" data-task-toggle="${e.id}" ${e.done?`checked`:``} />
                <span>${e.text}</span>
              </label>
              <button class="icon-btn" data-task-delete="${e.id}">删除</button>
            </li>
          `).join(``)||`<li class="empty">还没有任务。</li>`}
        </ul>
      </section>

      <section class="panel-block">
        <h3>应用</h3>
        <div class="stack-actions vertical-stack">
          <button class="ghost-btn" id="install-btn" ${a?``:`disabled`}>安装到桌面</button>
          <button class="ghost-btn" id="fullscreen-btn">进入全屏</button>
          <button class="ghost-btn" id="notify-btn">开启通知</button>
          <button class="secondary-btn" id="export-btn">下载数据</button>
          <label class="upload-btn wide-upload">
            上传数据
            <input type="file" id="import-input" accept="application/json" hidden />
          </label>
        </div>
        <div class="meta-lines">
          <p>累计完成：${u.completedPomodoros}</p>
          <p>今日完成：${u.sessionsToday}</p>
          <p>待办任务：${u.tasks.filter(e=>!e.done).length}</p>
          <p>最近更新：${new Date(u.updatedAt).toLocaleString(`zh-CN`)}</p>
          <p>PWA：${window.matchMedia(`(display-mode: standalone)`).matches?`已安装`:`网页模式`}</p>
          <p>离线：${navigator.onLine?`在线`:`离线`}</p>
        </div>
      </section>
    </div>
  `}function Y(){document.querySelector(`#panel-close-btn`)?.addEventListener(`click`,()=>W(!1)),document.querySelector(`#install-btn`)?.addEventListener(`click`,L),document.querySelector(`#fullscreen-btn`)?.addEventListener(`click`,C),document.querySelector(`#notify-btn`)?.addEventListener(`click`,A),document.querySelector(`#export-btn`)?.addEventListener(`click`,M),document.querySelector(`#import-input`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&N(t)}),document.querySelectorAll(`[data-mode]`).forEach(e=>{e.addEventListener(`click`,()=>_(e.getAttribute(`data-mode`)))}),document.querySelector(`#immersive-toggle`)?.addEventListener(`change`,e=>{u.immersiveMode=e.target.checked,p()}),document.querySelector(`#noise-toggle`)?.addEventListener(`change`,e=>{H(e.target.checked)}),document.querySelector(`#noise-volume`)?.addEventListener(`input`,e=>{U(e.target.value)}),document.querySelector(`#save-settings-btn`)?.addEventListener(`click`,()=>{u.workMinutes=Number(document.querySelector(`#workMinutes`).value)||n.workMinutes,u.shortBreakMinutes=Number(document.querySelector(`#shortBreakMinutes`).value)||n.shortBreakMinutes,u.longBreakMinutes=Number(document.querySelector(`#longBreakMinutes`).value)||n.longBreakMinutes,u.roundsBeforeLongBreak=Number(document.querySelector(`#roundsBeforeLongBreak`).value)||n.roundsBeforeLongBreak,u.timeLeft=h(u.currentMode)*60,p(),Z()}),document.querySelector(`#task-form`)?.addEventListener(`submit`,e=>{e.preventDefault();let t=document.querySelector(`#task-input`);P(t.value),t.value=``}),document.querySelectorAll(`[data-task-toggle]`).forEach(e=>{e.addEventListener(`change`,()=>F(e.getAttribute(`data-task-toggle`)))}),document.querySelectorAll(`[data-task-delete]`).forEach(e=>{e.addEventListener(`click`,()=>I(e.getAttribute(`data-task-delete`)))})}function X(){let e=document.querySelector(`[data-role="side-panel"]`);e&&(e.innerHTML=J(),Y(),q())}function Z(){let e=g();document.body.dataset.mode=u.currentMode,document.querySelector(`#app`).innerHTML=`
    <main class="immersive-shell minimal-shell ${u.isRunning?`running`:``}">
      <video id="keep-awake-video" class="keep-awake-video" src="${t}" muted loop playsinline preload="auto"></video>
      <div class="bg-blobs calm" aria-hidden="true">
        <span class="blob blob-a"></span>
        <span class="blob blob-b"></span>
        <span class="blob blob-c"></span>
        <span class="mist mist-a"></span>
        <span class="mist mist-b"></span>
      </div>

      <button class="panel-overlay ${u.panelOpen?`open`:``}" data-role="panel-overlay" aria-label="关闭侧边栏"></button>

      <section class="minimal-stage">
        <header class="minimal-topbar">
          <button class="ghost-btn slim" id="panel-toggle-btn" aria-expanded="${u.panelOpen}">设置</button>
          <div class="mini-badges">
            <span class="status-chip quiet" data-role="phase">${m(u.currentMode)}</span>
            <span class="status-chip quiet" data-role="noise-status">${u.noiseEnabled?`白噪音 ${Math.round(u.noiseVolume*100)}%`:`白噪音关闭`}</span>
            <span class="status-chip quiet" data-role="wake-status">${i?`Wake Lock`:u.isRunning?`视频兜底`:`未启用`}</span>
          </div>
        </header>

        <section class="hero-minimal">
          <div class="ambient-ring slow" data-role="progress" style="--progress:${e}">
            <div class="ambient-ring-inner">
              <div class="breath-dot"></div>
              <span class="timer massive" data-role="timer">${j(u.timeLeft)}</span>
              <span class="timer-label soft" data-role="breath">${u.isRunning?`呼吸，继续。`:`准备开始。`}</span>
            </div>
          </div>
        </section>

        <footer class="minimal-actions">
          <button class="primary-btn huge" id="start-btn">${u.isRunning?`进行中`:`开始`}</button>
          <button class="secondary-btn huge" id="pause-btn">暂停</button>
          <button class="secondary-btn huge" id="reset-btn">重置</button>
          <button class="secondary-btn huge" id="noise-btn">${u.noiseEnabled?`关闭白噪音`:`白噪音`}</button>
        </footer>

        <aside class="side-panel glass ${u.panelOpen?`open`:``}" data-role="side-panel">
          ${J()}
        </aside>
      </section>
    </main>
  `,document.querySelector(`#start-btn`)?.addEventListener(`click`,T),document.querySelector(`#pause-btn`)?.addEventListener(`click`,E),document.querySelector(`#reset-btn`)?.addEventListener(`click`,D),document.querySelector(`#noise-btn`)?.addEventListener(`click`,()=>H()),document.querySelector(`#panel-toggle-btn`)?.addEventListener(`click`,()=>W()),document.querySelector(`[data-role="panel-overlay"]`)?.addEventListener(`click`,()=>W(!1)),Y(),G(),q()}window.addEventListener(`beforeinstallprompt`,e=>{e.preventDefault(),a=e,X()}),window.addEventListener(`appinstalled`,()=>{a=null,X()}),document.addEventListener(`visibilitychange`,async()=>{document.visibilityState===`visible`&&u.isRunning&&await S()}),`serviceWorker`in navigator&&window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`./sw.js`).catch(()=>{})}),Z();