/* TEMAS */
:root { 
    --brand-red: #ef4444; 
    --brand-red-hover: #dc2626; 
    --page-horizontal-padding: 30px;
    --page-content-padding: 30px;
    --bg-main: #121212; 
    --bg-col: #1e1e1e; 
    --bg-card: #2d2d2d; 
    --bg-card-hover: #383838; 
    --text-main: #e4e4e7; 
    --text-muted: #a1a1aa; 
    --border-color: #3f3f46; 
    --bg-dots: radial-gradient(rgba(255, 255, 255, 0.03) 2px, transparent 2px); 
}

body[data-theme="light"] { 
    --bg-main: #f4f4f5; 
    --bg-col: #e4e4e7; 
    --bg-card: #ffffff; 
    --bg-card-hover: #fdfdfd; 
    --text-main: #18181b; 
    --text-muted: #52525b; 
    --border-color: #d4d4d8; 
    --bg-dots: radial-gradient(rgba(0, 0, 0, 0.05) 2px, transparent 2px); 
}

::-webkit-scrollbar { width: 8px; height: 8px; } 
::-webkit-scrollbar-track { background: var(--bg-main); } 
::-webkit-scrollbar-thumb { background: #52525b; border-radius: 4px; }

body { 
    font-family: 'Montserrat', sans-serif; 
    background-color: var(--bg-main); 
    background-image: var(--bg-dots); 
    background-size: 24px 24px; 
    margin: 0; 
    color: var(--text-main); 
    height: 100vh; 
    overflow: hidden; 
    transition: background-color 0.3s; 
}

body,
button,
input,
select,
textarea {
    font-family: 'Montserrat', sans-serif;
}
body.no-scroll { overflow: hidden !important; height: 100vh !important; touch-action: none; }

/* CABEÇALHO E MENU */
.top-bar { background-color: var(--bg-col); display: flex; align-items: center; justify-content: space-between; padding: 15px var(--page-horizontal-padding); border-bottom: 1px solid var(--border-color); position: relative; z-index: 10; transition: background-color 0.3s; }
.top-bar-left { display: flex; align-items: center; gap: 15px; }
.top-bar-logo { width: 45px; height: 45px; object-fit: contain; }
.top-bar-brand-text { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.top-bar h1 { margin: 0; font-size: 22px; font-weight: 900; font-style: italic; white-space: nowrap; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }
.sync-status { font-size: 10px; padding: 3px 6px; border-radius: 4px; background: rgba(100,100,100,0.1); font-weight: bold; display: flex; align-items: center; gap: 5px; margin: 0; line-height: 1; }

.top-bar-right { display: flex; align-items: center; gap: 10px; }
.user-menu-container { position: relative; display: flex; align-items: center; }
.user-name-btn { background: var(--bg-col); border: 1px solid var(--border-color); color: var(--text-main); font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; padding: 10px 15px; border-radius: 8px; transition: 0.2s; font-family: inherit; }
.user-name-btn:hover { background: var(--bg-card-hover); border-color: var(--brand-red); }
.user-dropdown { display: none; position: absolute; top: 100%; right: 0; margin-top: 8px; background: var(--bg-col); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 15px 35px rgba(0,0,0,0.8); z-index: 100; min-width: 220px; flex-direction: column; overflow: hidden; }
.user-dropdown.show { display: flex; animation: pop-in 0.2s forwards; transform-origin: top right; }
.dropdown-item { background: transparent; border: none; border-bottom: 1px solid var(--border-color); color: var(--text-main); padding: 14px 15px; text-align: left; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center; font-family: inherit; }
.dropdown-item:last-child { border-bottom: none; } 
.dropdown-item:hover { background: var(--bg-card-hover); padding-left: 20px; color: var(--brand-red);}
.menu-badge { background: var(--brand-red); color: white; border-radius: 12px; font-size: 10px; font-weight: 900; padding: 2px 7px; margin-left: 8px; display: none; align-items: center; justify-content: center; }

.search-input { width: 100%; max-width: 250px; padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-family: inherit; font-size: 14px; box-sizing: border-box; transition: 0.3s; }
.search-input:focus { outline: none; border-color: var(--brand-red); }
.btn-top { background: transparent; color: var(--text-muted); padding: 10px 15px; font-size: 13px; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; white-space: nowrap; font-family: inherit;}
.btn-top:hover, .btn-top.active { border-color: var(--brand-red); color: var(--text-main); }

.filter-container { position: relative; }
.filter-dropdown { display: none; position: absolute; top: 100%; right: 0; margin-top: 5px; background: var(--bg-col); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; z-index: 100; min-width: 200px; flex-direction: column; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
.filter-dropdown.show { display: flex; }
.filter-option { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-main); cursor: pointer; font-weight: 600; }
.filter-option input { accent-color: var(--brand-red); width: 16px; height: 16px; cursor: pointer;}

/* WORKSPACES E QUADRO */
.workspace-bar { background-color: var(--bg-col); padding: 12px var(--page-horizontal-padding); display: flex; gap: 10px; border-bottom: 2px solid var(--brand-red); box-shadow: 0 4px 12px rgba(0,0,0,0.2); overflow-x: auto; scrollbar-width: none; align-items: center; transition: 0.3s; }
.workspace-bar::-webkit-scrollbar { display: none; }
.ws-tab { background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-muted); padding: 8px 18px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 700; transition: 0.2s; white-space: nowrap; display: flex; align-items: center; font-family: inherit; }
.ws-tab:hover { border-color: #52525b; color: var(--text-main); } 
.ws-tab.active { background: var(--brand-red); border-color: var(--brand-red); color: white; }
.ws-add-btn { background: transparent; border: 1px dashed var(--border-color); color: var(--text-muted); padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; font-family: inherit; }

.board { display: flex; gap: 20px; align-items: flex-start; overflow-x: auto; overflow-y: hidden; padding: var(--page-content-padding); height: calc(100vh - 140px); box-sizing: border-box; }
.column { background: var(--bg-col); width: 320px; min-width: 320px; padding: 16px; border: 1px solid var(--border-color); border-radius: 10px; display: flex; flex-direction: column; transition: 0.3s; max-height: 100%; box-sizing: border-box; }
.column-header { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; flex-shrink: 0; }
.column-header h3 { margin: 0; font-size: 16px; font-weight: 800; flex-grow: 1; outline: none; }
.cards-container { min-height: 20px; flex-grow: 1; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 5px; padding-bottom: 5px; }
.card { background: var(--bg-card); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); cursor: grab; transition: border-color 0.2s, background-color 0.2s, opacity 0.2s; touch-action: none; position: relative;}
.card:hover { background: var(--bg-card-hover); border-color: #52525b; }
.card.dragging { opacity: 0.4; border: 1px dashed var(--brand-red); animation: none !important; }
.card.read-only { cursor: pointer; }
.column.dragging-col-visual { opacity: 0.4; border: 2px dashed var(--brand-red); background: rgba(239, 68, 68, 0.05); }
.col-drag-handle { cursor: grab; font-size: 18px; padding-right: 8px; color: var(--text-muted); touch-action: none; transition: 0.2s; }
.col-drag-handle:hover { color: var(--text-main); }

@keyframes pop-in { 
    0% { opacity: 0; transform: scale(0.9) translateY(-15px); } 
    100% { opacity: 1; transform: scale(1) translateY(0); } 
}
.new-card-anim { animation: pop-in 0.35s forwards; }

.card-title-container { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.card-title { font-weight: 600; font-size: 14px; pointer-events: none; margin: 0; line-height: 1.4; transition: 0.2s; word-break: break-word; }
.card.completed .card-title { text-decoration: line-through; opacity: 0.5; }
.card-checkbox { appearance: none; width: 18px; height: 18px; border: 2px solid var(--border-color); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: 0.2s; background: var(--bg-main); }
.card-checkbox:checked { background-color: #d97706; border-color: #d97706; }
.card-checkbox:checked::after { content: '✔'; color: #1e1e1e; font-size: 11px; font-weight: 900; }

@keyframes glow-spin-yellow {
    0%   { box-shadow:  0px -4px 6px -1px rgba(234, 179, 8, 0.6); }
    25%  { box-shadow:  4px  0px 6px -1px rgba(234, 179, 8, 0.6); }
    50%  { box-shadow:  0px  4px 6px -1px rgba(234, 179, 8, 0.6); }
    75%  { box-shadow: -4px  0px 6px -1px rgba(234, 179, 8, 0.6); }
    100% { box-shadow:  0px -4px 6px -1px rgba(234, 179, 8, 0.6); }
}
@keyframes glow-spin-orange {
    0%   { box-shadow:  0px -4px 6px -1px rgba(249, 115, 22, 0.6); }
    25%  { box-shadow:  4px  0px 6px -1px rgba(249, 115, 22, 0.6); }
    50%  { box-shadow:  0px  4px 6px -1px rgba(249, 115, 22, 0.6); }
    75%  { box-shadow: -4px  0px 6px -1px rgba(249, 115, 22, 0.6); }
    100% { box-shadow:  0px -4px 6px -1px rgba(249, 115, 22, 0.6); }
}
@keyframes glow-spin-red {
    0%   { box-shadow:  0px -4px 6px -1px rgba(239, 68, 68, 0.6); }
    25%  { box-shadow:  4px  0px 6px -1px rgba(239, 68, 68, 0.6); }
    50%  { box-shadow:  0px  4px 6px -1px rgba(239, 68, 68, 0.6); }
    75%  { box-shadow: -4px  0px 6px -1px rgba(239, 68, 68, 0.6); }
    100% { box-shadow:  0px -4px 6px -1px rgba(239, 68, 68, 0.6); }
}

.card.card-warning { border-color: #a16207; animation: glow-spin-yellow 2.5s linear infinite; } 
.card.card-urgent { border-color: #c2410c; animation: glow-spin-orange 2.5s linear infinite; } 
.card.card-overdue { border-color: #b91c1c; background-color: rgba(239, 68, 68, 0.05); animation: glow-spin-red 2.5s linear infinite; }
.badges { display: flex; gap: 6px; font-size: 10px; font-weight: 700; flex-wrap: wrap; pointer-events: none; }
.badge { padding: 4px 6px; background: var(--bg-main); border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-muted); }
.badge-assignee { background: rgba(30, 64, 175, 0.3); color: #60a5fa; border-color: rgba(30, 64, 175, 0.5); }

.tag-btn { background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.tag-btn:hover { border-color: var(--text-main); color: var(--text-main); }

/* TELAS E MODAIS */
#login-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: var(--bg-main); background-image: var(--bg-dots); display: flex; justify-content: center; align-items: center; z-index: 3000; transition: 0.3s; }
.sys-modal-overlay { z-index: 4000 !important; } 
.modal-overlay { z-index: 2000; }
.sys-modal-overlay, .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); justify-content: center; align-items: center; }
.login-box, .sys-modal, .modal { background: var(--bg-col); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); padding: 30px; max-height: 90vh; overflow-y: auto; box-sizing: border-box; transition: 0.3s; }
.login-box { width: 450px; text-align: center; } 
.sys-modal { width: 400px; text-align: center; } 
.modal { width: 700px; overscroll-behavior: contain; }
.login-box h2 { font-size: 32px; font-weight: 900; color: var(--brand-red); margin: 0 0 5px 0; font-style: italic; text-transform: uppercase; }
.login-box p, .sys-modal p { font-size: 14px; margin-bottom: 25px; color: var(--text-muted); }
.modal-header { display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 20px;}
.modal-header input { font-size: 22px; font-weight: 800; border: none; background: transparent; width: 100%; color: var(--text-main); outline: none; font-family: inherit; }

.accordion-header { background: var(--bg-card); color: var(--text-main); padding: 12px 15px; cursor: pointer; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 5px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; font-size: 14px; }
.accordion-body { display: none; padding-left: 10px; margin-bottom: 10px; border-left: 2px solid var(--border-color); margin-left: 5px; }
.profile-list-item { display: flex; justify-content: space-between; align-items:center; background: var(--bg-card); border: 1px solid var(--border-color); margin-bottom: 8px; border-radius: 6px; padding: 5px; transition: 0.2s; }
.profile-name-btn { flex-grow: 1; background: transparent; color: var(--text-main); text-align: left; border: none; padding: 10px; cursor: pointer; font-weight: 600; text-transform: uppercase; font-size: 14px;}

.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-group label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; }
.form-control { width: 100%; padding: 12px; background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 14px; }
.form-control:focus { outline: none; border-color: var(--brand-red); }

body:not([data-theme="light"]) { color-scheme: dark; }
body:not([data-theme="light"]) input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(36%) sepia(74%) saturate(2716%) hue-rotate(338deg) brightness(97%) contrast(98%);
    cursor: pointer;
    opacity: 0.8;
    transition: 0.2s;
}
body:not([data-theme="light"]) input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }

.ql-toolbar { background: var(--bg-card); border-color: var(--border-color) !important; border-top-left-radius: 6px; border-top-right-radius: 6px; }
.ql-container { background: var(--bg-main); border-color: var(--border-color) !important; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: var(--text-main); min-height: 120px; cursor: text; }
#editor-container .ql-editor { min-height: inherit; padding-bottom: 20px; }
.ql-snow .ql-stroke { stroke: var(--text-muted); } 
.ql-snow .ql-fill { fill: var(--text-muted); } 
.ql-snow .ql-picker { color: var(--text-muted); }

button { font-family: inherit; cursor: pointer; }
.btn-primary-red { background: var(--brand-red); color: white; border: none; padding: 12px 20px; border-radius: 6px; width: 100%; font-weight: 600; transition: 0.2s;}
.btn-primary-red:hover { background: var(--brand-red-hover); } 
.btn-primary-red:disabled { background: #52525b; cursor: not-allowed; }
.btn-secondary { background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); padding: 12px 20px; border-radius: 6px; width: 100%; font-weight: 600; transition: 0.2s;}
.btn-secondary:hover { border-color: var(--text-main); }
.btn-danger { background: transparent; color: var(--brand-red); border: 1px solid var(--brand-red); padding: 12px 20px; border-radius: 6px; font-weight: 600;}
.btn-danger:hover { background: rgba(239, 68, 68, 0.1); }
.delete-col-btn { background: none; border: none; color: var(--text-muted); font-size: 16px; transition: 0.2s; padding: 4px; border-radius: 4px;} 
.delete-col-btn:hover { color: var(--brand-red); background: rgba(239,68,68,0.1); }

.checklist-item { display: flex; align-items: center; gap: 10px; background: var(--bg-card); padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; transition: border 0.2s; }
.checklist-item.done { background: var(--bg-main); opacity: 0.6; }
.edit-check-input { flex-grow: 1; background: transparent; border: none; color: var(--text-main); outline: none; font-family: inherit; font-size: 14px; }
.checklist-item.done .edit-check-input { text-decoration: line-through; }
.drag-handle { cursor: grab; color: #52525b; font-size: 18px; padding: 0 5px; touch-action: none; } 

.attachment-item { display: flex; align-items: center; gap: 8px; background: var(--bg-col); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--text-main); text-decoration: none; transition: 0.2s; }
.attachment-item:hover { border-color: var(--text-muted); background: var(--bg-card-hover); }
.del-anexo-btn { color: #fca5a5; background: none; border: none; cursor: pointer; padding: 0; font-size: 14px; }

.logs-container { max-height: 120px; overflow-y: auto; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.log-item { font-size: 11px; color: var(--text-muted); display: flex; gap: 8px; align-items: flex-start; }
.log-date { font-weight: 700; white-space: nowrap; color: var(--text-main); }

#add-column-btn { min-width: 320px; background: rgba(100,100,100,0.05); border: 1px dashed var(--border-color); border-radius: 10px; color: var(--text-muted); padding: 16px; font-size: 14px; font-weight: 600; }
.add-card-btn { background: none; border: none; color: var(--text-muted); padding-top: 12px; text-align: left; font-size: 13px; font-weight: 600; } 
.add-card-btn:hover { color: var(--text-main); }

.calendar-container { padding: var(--page-content-padding); display: none; flex-direction: column; gap: 20px; min-height: calc(100vh - 140px); }
.calendar-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-col); padding: 15px 25px; border-radius: 10px; border: 1px solid var(--border-color); }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
.cal-day-header { text-align: center; font-weight: 800; color: var(--text-muted); font-size: 12px; text-transform: uppercase; padding-bottom: 10px; }
.cal-cell { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; min-height: 120px; padding: 10px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: 0.2s; }
.cal-cell:hover { border-color: #52525b; background: var(--bg-card-hover); }
.cal-cell.today { border-color: var(--brand-red); background: rgba(239, 68, 68, 0.05); }
.cal-cell.empty { background: transparent; border: 1px dashed var(--border-color); opacity: 0.5; pointer-events: none; }
.cal-date-num { font-size: 14px; font-weight: 800; color: var(--text-muted); align-self: flex-end; margin-bottom: 5px; }
.cal-event-pill { font-size: 11px; padding: 4px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.cal-event-task { background: rgba(30, 64, 175, 0.3); color: #60a5fa; border: 1px solid rgba(30, 64, 175, 0.5); }
.cal-event-custom { background: rgba(161, 98, 7, 0.3); color: #fde047; border: 1px solid rgba(161, 98, 7, 0.5); }

/* CALCULADORA */
.calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.calc-btn { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); padding: 15px; font-size: 18px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; font-family: inherit;}
.calc-btn:hover { background: var(--bg-card-hover); border-color: var(--brand-red); }
.calc-display { background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-main); font-size: 24px; padding: 15px; border-radius: 6px; text-align: right; margin-bottom: 15px; width: 100%; box-sizing: border-box; font-family: inherit; font-weight: 800;}

/* CHAT FLUTUANTE */
.btn-floating-chat { position: fixed; bottom: 25px; right: 25px; background: var(--brand-red); color: white; border: none; border-radius: 30px; padding: 15px 25px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4); z-index: 1000; transition: transform 0.2s; }
.btn-floating-chat:hover { transform: scale(1.05); }

.notification-badge { position: absolute; top: -5px; right: -5px; background: #fff; color: var(--brand-red); border: 2px solid var(--brand-red); border-radius: 50%; width: 20px; height: 20px; font-size: 11px; font-weight: 900; display: none; align-items: center; justify-content: center; z-index: 10;}

@keyframes chat-attention-anim { 
    0%, 100% { transform: scale(1); box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4); } 
    50% { transform: scale(1.15) rotate(5deg); box-shadow: 0 0 20px #fde047; background-color: #dc2626; } 
}
.chat-attention { animation: chat-attention-anim 1s infinite !important; }

.chat-widget { display: none; position: fixed; bottom: 90px; right: 25px; width: 360px; height: 500px; background: var(--bg-col); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.8); z-index: 1000; flex-direction: column; overflow: hidden; }
.chat-header { background: #09090b; padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px; }
.chat-header-top { display: flex; justify-content: space-between; align-items: center; }
.chat-header-top h3 { margin: 0; font-size: 16px; font-weight: 800; color: white; display: flex; align-items: center; gap: 10px; width:100%;}

.chat-tabs { display: flex; gap: 5px; background: var(--bg-main); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color); }
.chat-tab-btn { flex: 1; background: transparent; border: none; color: var(--text-muted); padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; position: relative;}
.chat-tab-btn.active { background: var(--bg-card-hover); color: var(--text-main); }

.chat-body { flex-grow: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: var(--bg-main); }
.chat-msg { display: flex; flex-direction: column; max-width: 85%; }
.chat-msg.sent { align-self: flex-end; }
.chat-msg.received { align-self: flex-start; }

.chat-msg-bubble { padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.4; word-wrap: break-word; position: relative; }
.chat-msg.sent .chat-msg-bubble { background: var(--brand-red); color: white; border-bottom-right-radius: 4px; }
.chat-msg.received .chat-msg-bubble { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); border-bottom-left-radius: 4px; }

.chat-msg-meta { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
.chat-msg.sent .chat-msg-meta { text-align: right; }

.chat-footer { padding: 15px; background: var(--bg-col); border-top: 1px solid var(--border-color); display: flex; gap: 10px; }
.chat-input { flex-grow: 1; padding: 10px 15px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-family: inherit; font-size: 13px; outline: none; }
.chat-input:focus { border-color: var(--brand-red); }
.chat-send-btn { background: var(--brand-red); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; }

.user-chat-list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: 0.2s; }
.user-chat-list-item:hover { border-color: #52525b; background: var(--bg-card-hover); }

/* RELÓGIO DO CABEÇALHO */
.top-bar-clock {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    margin-left: 20px;
    padding-left: 20px;
    border-left: 2px solid var(--border-color);
    line-height: 1.1;
}
#clock-time {
    font-size: 18px;
    font-weight: 900;
    color: var(--text-main);
    letter-spacing: 1px;
    font-family: inherit;
}
#clock-date {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-top: 2px;
}

@media (max-width: 768px) {
    :root {
        --page-horizontal-padding: 15px;
        --page-content-padding: 15px;
    }

    .top-bar-clock {
        margin-left: auto;
        padding-left: 0;
        border-left: none;
        text-align: center;
        align-items: center; 
    }
    
    .top-bar { flex-direction: column; align-items: stretch; padding: 12px var(--page-horizontal-padding); gap: 15px; }
    .top-bar-left { width: 100%; justify-content: flex-start; gap: 12px; }
    .top-bar-logo { width: 38px; height: 38px; }
    .top-bar-right { width: 100%; justify-content: space-between; gap: 10px; flex-wrap: wrap;}
    .search-input { max-width: 100% !important; flex-grow: 1; }
    .workspace-bar { padding: 10px var(--page-horizontal-padding); } 
    .board { padding: var(--page-content-padding); } 
    .column { width: 85vw; min-width: 85vw; }
    .calendar-container { padding: var(--page-content-padding); } 
    .calendar-grid { grid-template-columns: 1fr; gap: 5px; }
    .cal-day-header { display: none; } 
    .cal-cell { min-height: 80px; flex-direction: row; flex-wrap: wrap; }
    .cal-date-num { width: 100%; text-align: left; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; margin-bottom: 5px; }
    .login-box, .sys-modal, .modal { width: 95% !important; max-width: 100% !important; padding: 20px; }
    .form-row { grid-template-columns: 1fr !important; }
    .chat-widget { width: 100%; height: 100%; bottom: 0; right: 0; border-radius: 0; z-index: 5000; }
}
