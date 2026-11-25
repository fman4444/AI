/*
 * 기능 A — 근태 입력 페이지(IN). ② 기능 A 담당 파일.
 * 저장소는 common.js의 loadData·saveData로만 쓰고, attendance 칸과 고른 부서원의 trainee(교육대상자) 표시만 바꾼다(docs/design.md 2절).
 */
(function () {
  'use strict';

  var TYPES = ['없음', '휴가', '출장'];

  function $(id) { return document.getElementById(id); }

  function showResult(text, kind) {
    var el = $('result');
    el.textContent = text;
    el.className = 'msg ' + kind;
    el.hidden = false;
  }

  function countForFriday(data) {
    return data.attendance.filter(function (a) { return a && a.date === data.targetFriday; }).length;
  }

  function render() {
    var data = loadData();
    var ready = data.members.length > 0 && data.targetFriday !== '';
    $('needData').hidden = ready;
    $('formCard').hidden = !ready;
    if (!ready) { return; }

    $('targetFriday').textContent = data.targetFriday;
    var sel = $('memberId');
    var keep = sel.value;
    sel.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = '사번을 선택하십시오';
    sel.appendChild(first);
    data.members.forEach(function (m) {
      if (!m || typeof m.id !== 'string') { return; }
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.id + ' · ' + (m.dept || '부서 없음') + (m.trainee === true ? ' (교육대상자)' : '');
      sel.appendChild(o);
    });
    sel.value = keep;
    syncTraineeFrom(data);
    $('savedCount').textContent = '이번 금요일 저장된 근태 ' + countForFriday(data) + '건';
  }

  function syncTraineeFrom(data) {
    var id = $('memberId').value, t = false;
    data.members.forEach(function (m) { if (m && m.id === id && m.trainee === true) { t = true; } });
    $('isTrainee').checked = t;
  }

  /* 입력을 확인해 틀린 칸이 있으면 안내 문장을, 맞으면 null을 돌려준다. */
  function validate(id, type, hoursText) {
    if (!id) { return '사번을 선택하십시오.'; }
    if (TYPES.indexOf(type) < 0) { return '부재 유형을 선택하십시오.'; }
    if (hoursText.trim() === '') { return '부재 시간을 입력하십시오. (0~8 사이 숫자)'; }
    var h = Number(hoursText);
    if (!isFinite(h) || h < 0 || h > 8) { return '부재 시간은 0~8 사이 숫자로 입력하십시오.'; }
    if (type === '없음' && h !== 0) { return "부재 유형이 '없음'이면 부재 시간은 0이어야 합니다."; }
    return null;
  }

  function onSave() {
    var data = loadData();
    var id = $('memberId').value;
    var type = $('absentType').value;
    var hoursText = $('absentHours').value;

    var problem = validate(id, type, hoursText);
    if (problem) {
      showResult(problem + ' 저장되지 않았습니다.', 'error');
      return;
    }

    var record = { id: id, date: data.targetFriday, absentType: type, absentHours: Number(hoursText) };
    var found = -1;
    for (var i = 0; i < data.attendance.length; i++) {
      var a = data.attendance[i];
      if (a && a.id === id && a.date === data.targetFriday) { found = i; break; }
    }
    var updated = found >= 0;
    if (updated) { data.attendance[found] = record; } else { data.attendance.push(record); }
    var trainee = $('isTrainee').checked;
    data.members.forEach(function (m) { if (m && m.id === id) { m.trainee = trainee; } });

    if (!saveData(data)) {
      showResult('이 브라우저에서는 저장할 수 없습니다.', 'error');
      return;
    }
    showResult((updated ? '기존 입력이 수정되었습니다: ' : '저장되었습니다: ') + id + ' · ' + type + ' ' + record.absentHours + '시간' +
      (trainee ? ' · 교육대상자(평가 제외)' : ''), 'ok');
    render();
  }

  function syncTrainee() { syncTraineeFrom(loadData()); }

  $('memberId').addEventListener('change', syncTrainee);
  $('saveBtn').addEventListener('click', onSave);
  render();
})();
