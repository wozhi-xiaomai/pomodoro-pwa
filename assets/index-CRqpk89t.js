(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`pomodoro-pwa-state-v1`,t={workMinutes:25,shortBreakMinutes:5,longBreakMinutes:15,roundsBeforeLongBreak:4,completedPomodoros:0,sessionsToday:0,currentMode:`work`,timeLeft:1500,isRunning:!1,cycleCount:0,tasks:[],updatedAt:new Date().toISOString()},n=null,r=i();function i(){try{let n=localStorage.getItem(e);if(!n)return{...t};let r=JSON.parse(n);return a({...t,...r})}catch{return{...t}}}function a(e){let n={...t,...e};return n.workMinutes=Number(n.workMinutes)||t.workMinutes,n.shortBreakMinutes=Number(n.shortBreakMinutes)||t.shortBreakMinutes,n.longBreakMinutes=Number(n.longBreakMinutes)||t.longBreakMinutes,n.roundsBeforeLongBreak=Number(n.roundsBeforeLongBreak)||t.roundsBeforeLongBreak,n.completedPomodoros=Number(n.completedPomodoros)||0,n.sessionsToday=Number(n.sessionsToday)||0,n.cycleCount=Number(n.cycleCount)||0,n.timeLeft=Number(n.timeLeft)||n.workMinutes*60,n.tasks=Array.isArray(n.tasks)?n.tasks:[],n.currentMode=[`work`,`shortBreak`,`longBreak`].includes(n.currentMode)?n.currentMode:`work`,n.isRunning=!!n.isRunning,n.updatedAt=new Date().toISOString(),n}function o(){r.updatedAt=new Date().toISOString(),localStorage.setItem(e,JSON.stringify(r))}function s(e){return e===`shortBreak`?r.shortBreakMinutes:e===`longBreak`?r.longBreakMinutes:r.workMinutes}function c(e){r.currentMode=e,r.timeLeft=s(e)*60,r.isRunning=!1,u(),o(),w()}function l(){n||=(r.isRunning=!0,o(),w(),setInterval(()=>{if(--r.timeLeft,r.timeLeft<=0){p();return}o(),C()},1e3))}function u(){n&&=(clearInterval(n),null)}function d(){r.isRunning=!1,u(),o(),w()}function f(){u(),r.isRunning=!1,r.timeLeft=s(r.currentMode)*60,o(),w()}function p(){if(u(),r.isRunning=!1,r.currentMode===`work`){r.completedPomodoros+=1,r.sessionsToday+=1,r.cycleCount+=1;let e=r.cycleCount%r.roundsBeforeLongBreak===0;r.currentMode=e?`longBreak`:`shortBreak`}else r.currentMode=`work`;r.timeLeft=s(r.currentMode)*60,m(`${_(r.currentMode)} 开始了`),o(),w()}function m(e){`Notification`in window&&Notification.permission===`granted`&&new Notification(`番茄钟提醒`,{body:e})}function h(){`Notification`in window&&Notification.permission===`default`&&Notification.requestPermission()}function g(e){return`${String(Math.floor(e/60)).padStart(2,`0`)}:${String(e%60).padStart(2,`0`)}`}function _(e){return{work:`专注时间`,shortBreak:`短休息`,longBreak:`长休息`}[e]}function v(){let e=JSON.stringify(r,null,2),t=new Blob([e],{type:`application/json`}),n=URL.createObjectURL(t),i=document.createElement(`a`);i.href=n,i.download=`pomodoro-backup-${new Date().toISOString().slice(0,10)}.json`,i.click(),URL.revokeObjectURL(n)}function y(e){let t=new FileReader;t.onload=()=>{try{r=a(JSON.parse(String(t.result))),u(),o(),w()}catch{alert(`导入失败：JSON 文件格式不正确`)}},t.readAsText(e)}function b(e){let t=e.trim();t&&(r.tasks.unshift({id:crypto.randomUUID(),text:t,done:!1}),o(),w())}function x(e){r.tasks=r.tasks.map(t=>t.id===e?{...t,done:!t.done}:t),o(),w()}function S(e){r.tasks=r.tasks.filter(t=>t.id!==e),o(),w()}function C(){let e=document.querySelector(`[data-role="timer"]`),t=document.querySelector(`title`);e&&(e.textContent=g(r.timeLeft)),t&&(t.textContent=`${g(r.timeLeft)} · ${_(r.currentMode)}`)}function w(){document.querySelector(`#app`).innerHTML=`
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
          <button class="tab ${r.currentMode===`work`?`active`:``}" data-mode="work">专注</button>
          <button class="tab ${r.currentMode===`shortBreak`?`active`:``}" data-mode="shortBreak">短休息</button>
          <button class="tab ${r.currentMode===`longBreak`?`active`:``}" data-mode="longBreak">长休息</button>
        </div>

        <div class="timer-wrap">
          <div class="ring">
            <span class="timer" data-role="timer">${g(r.timeLeft)}</span>
            <span class="timer-label">${_(r.currentMode)}</span>
          </div>
        </div>

        <div class="actions">
          <button class="primary-btn" id="start-btn">${r.isRunning?`计时中…`:`开始`}</button>
          <button class="secondary-btn" id="pause-btn">暂停</button>
          <button class="secondary-btn" id="reset-btn">重置</button>
        </div>
      </section>

      <section class="grid">
        <section class="card stats-card">
          <h2>统计</h2>
          <div class="stats">
            <div><strong>${r.completedPomodoros}</strong><span>累计完成</span></div>
            <div><strong>${r.sessionsToday}</strong><span>今日完成</span></div>
            <div><strong>${r.tasks.filter(e=>!e.done).length}</strong><span>待办任务</span></div>
          </div>
        </section>

        <section class="card settings-card">
          <h2>设置</h2>
          <div class="settings">
            <label>专注时长（分钟）<input type="number" min="1" value="${r.workMinutes}" id="workMinutes" /></label>
            <label>短休息（分钟）<input type="number" min="1" value="${r.shortBreakMinutes}" id="shortBreakMinutes" /></label>
            <label>长休息（分钟）<input type="number" min="1" value="${r.longBreakMinutes}" id="longBreakMinutes" /></label>
            <label>几轮后长休息<input type="number" min="1" value="${r.roundsBeforeLongBreak}" id="roundsBeforeLongBreak" /></label>
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
            ${r.tasks.map(e=>`
              <li class="task-item ${e.done?`done`:``}">
                <label>
                  <input type="checkbox" data-task-toggle="${e.id}" ${e.done?`checked`:``} />
                  <span>${e.text}</span>
                </label>
                <button class="icon-btn" data-task-delete="${e.id}">删除</button>
              </li>
            `).join(``)||`<li class="empty">还没有任务，先加一个。</li>`}
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
          <p class="updated">最近更新时间：${new Date(r.updatedAt).toLocaleString(`zh-CN`)}</p>
        </section>
      </section>
    </main>
  `,document.querySelector(`#start-btn`)?.addEventListener(`click`,()=>{r.isRunning||l()}),document.querySelector(`#pause-btn`)?.addEventListener(`click`,d),document.querySelector(`#reset-btn`)?.addEventListener(`click`,f),document.querySelector(`#notify-btn`)?.addEventListener(`click`,h),document.querySelector(`#export-btn`)?.addEventListener(`click`,v),document.querySelector(`#import-input`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&y(t)}),document.querySelectorAll(`[data-mode]`).forEach(e=>{e.addEventListener(`click`,()=>c(e.getAttribute(`data-mode`)))}),document.querySelector(`#save-settings-btn`)?.addEventListener(`click`,()=>{r.workMinutes=Number(document.querySelector(`#workMinutes`).value)||t.workMinutes,r.shortBreakMinutes=Number(document.querySelector(`#shortBreakMinutes`).value)||t.shortBreakMinutes,r.longBreakMinutes=Number(document.querySelector(`#longBreakMinutes`).value)||t.longBreakMinutes,r.roundsBeforeLongBreak=Number(document.querySelector(`#roundsBeforeLongBreak`).value)||t.roundsBeforeLongBreak,r.timeLeft=s(r.currentMode)*60,o(),w()}),document.querySelector(`#task-form`)?.addEventListener(`submit`,e=>{e.preventDefault();let t=document.querySelector(`#task-input`);b(t.value),t.value=``}),document.querySelectorAll(`[data-task-toggle]`).forEach(e=>{e.addEventListener(`change`,()=>x(e.getAttribute(`data-task-toggle`)))}),document.querySelectorAll(`[data-task-delete]`).forEach(e=>{e.addEventListener(`click`,()=>S(e.getAttribute(`data-task-delete`)))}),C()}`serviceWorker`in navigator&&window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`./sw.js`).catch(()=>{})}),w();