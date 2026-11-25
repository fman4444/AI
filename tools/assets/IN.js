/*
 * 기능 A — 근태 입력 페이지(IN). ② 기능 A 담당 파일.
 * 저장소는 common.js의 loadData·saveData로만 쓰고, attendance 칸만 바꾼다(docs/design.md 2절).
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
    first.textContent = '사번을 고르세요';
    sel.appendChild(first);
    data.members.forEach(function (m) {
      if (!m || typeof m.id !== 'string') { return; }
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.id + ' · ' + (m.dept || '부서 없음') + (m.trainee === true ? ' (교육대상자)' : '');
      sel.appendChild(o);
    });
    sel.value = keep;
    $('savedCount').textContent = '이번 금요일 저장된 근태 ' + countForFriday(data) + '건';
  }

  /* 입력을 확인해 틀린 칸이 있으면 안내 문장을, 맞으면 null을 돌려준다. */
  function validate(id, type, hoursText) {
    if (!id) { return '사번을 골라 주세요.'; }
    if (TYPES.indexOf(type) < 0) { return '부재 유형을 골라 주세요.'; }
    if (hoursText.trim() === '') { return '부재 시간을 넣어 주세요. (0~8 사이 숫자)'; }
    var h = Number(hoursText);
    if (!isFinite(h) || h < 0 || h > 8) { return '부재 시간은 0~8 사이 숫자로 넣어 주세요.'; }
    if (type === '없음' && h !== 0) { return "부재 유형이 '없음'이면 부재 시간은 0이어야 해요."; }
    return null;
  }

  function onSave() {
    var data = loadData();
    var id = $('memberId').value;
    var type = $('absentType').value;
    var hoursText = $('absentHours').value;

    var problem = validate(id, type, hoursText);
    if (problem) {
      showResult(problem + ' 저장하지 않았어요.', 'error');
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

    if (!saveData(data)) {
      showResult('이 브라우저에서는 저장할 수 없어요.', 'error');
      return;
    }
    showResult((updated ? '기존 입력을 고쳤어요: ' : '저장했어요: ') + id + ' · ' + type + ' ' + record.absentHours + '시간', 'ok');
    render();
  }

  $('saveBtn').addEventListener('click', onSave);
  render();
})();
