/*
 * 공통 저장 함수 — docs/design.md 2·3절
 * 이 파일은 ① 통합·화면만 고치고, 저장 함수만 담는다.
 * 모든 페이지는 이 함수로만 저장소를 쓴다. 다른 함수는 각 페이지 js에 둔다.
 */
var STORAGE_KEY = 'team2g_app';

/* 빈 모양: {"targetFriday":"","members":[],"attendance":[]} */
function emptyData() {
  return { targetFriday: '', members: [], attendance: [] };
}

/* 2절 키의 JSON 전체를 읽는다. 없거나 깨졌으면 빈 모양. */
function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { return emptyData(); }
    var d = JSON.parse(raw);
    if (!d || !Array.isArray(d.members) || !Array.isArray(d.attendance)) { return emptyData(); }
    return {
      targetFriday: typeof d.targetFriday === 'string' ? d.targetFriday : '',
      members: d.members,
      attendance: d.attendance
    };
  } catch (e) {
    return emptyData();
  }
}

/* JSON 전체를 2절 키에 통째로 저장한다. 성공하면 true, 저장소를 쓸 수 없으면 false. */
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

/* 현재 JSON 전체를 team2g_backup.json 파일로 내려받는다. */
function exportJson() {
  var text = JSON.stringify(loadData(), null, 2);
  var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'team2g_backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/*
 * 백업 또는 표본 파일을 읽어 2절 모양인지 확인한 뒤 saveData 한다.
 * Promise로 {ok, message}를 돌려준다. 모양이 틀리면 저장하지 않는다.
 */
function importJson(file) {
  return new Promise(function (resolve) {
    if (!file) {
      resolve({ ok: false, message: '파일을 골라 주세요.' });
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      resolve({ ok: false, message: '파일을 읽지 못했어요. 다시 골라 주세요.' });
    };
    reader.onload = function () {
      var d;
      try {
        d = JSON.parse(String(reader.result).replace(/^﻿/, ''));
      } catch (e) {
        resolve({ ok: false, message: '이 웹앱의 백업·표본 파일인지 확인해 주세요. (JSON 형식이 아니에요) 기존 데이터는 그대로예요.' });
        return;
      }
      if (!d || !Array.isArray(d.members) || !Array.isArray(d.attendance)) {
        resolve({ ok: false, message: '이 웹앱의 백업·표본 파일인지 확인해 주세요. (부서원 명단·근태 칸이 없어요) 기존 데이터는 그대로예요.' });
        return;
      }
      var data = {
        targetFriday: typeof d.targetFriday === 'string' ? d.targetFriday : '',
        members: d.members,
        attendance: d.attendance
      };
      if (!saveData(data)) {
        resolve({ ok: false, message: '이 브라우저에서는 저장할 수 없어요.' });
        return;
      }
      resolve({ ok: true, message: '가져왔어요. 부서원 ' + data.members.length + '명, 근태 ' + data.attendance.length + '건' });
    };
    reader.readAsText(file, 'utf-8');
  });
}

/* 2절 키를 지운다('비우기'). */
function clearData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* 저장소를 쓸 수 없으면 지울 것도 없음 */
  }
}
