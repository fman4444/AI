/*
 * 기능 B — 충족 현황 페이지(board). ③ 기능 B 담당 파일.
 * 저장소는 common.js의 loadData로 읽기만 한다. 판정 규칙은 docs/design.md 2절과 prd/team_prd.md 3절.
 */
(function () {
  'use strict';

  var CONFIRM = '담당 검토 후 확정';
  var ABSENT_TYPES = ['휴가', '출장'];
  var ALL_TYPES = ['없음', '휴가', '출장'];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function validRecord(a) {
    return ALL_TYPES.indexOf(a.absentType) >= 0 &&
      typeof a.absentHours === 'number' && isFinite(a.absentHours) &&
      a.absentHours >= 0 && a.absentHours <= 8;
  }

  /* 개인 달성: 휴가·출장 부재가 4시간 이상 */
  function isAchieved(a) {
    return ABSENT_TYPES.indexOf(a.absentType) >= 0 && a.absentHours >= 4;
  }

  /* 판정 계산 — 화면과 떨어진 순수 계산 */
  function evaluate(data) {
    var members = [];
    var seen = Object.create(null);
    data.members.forEach(function (m) {
      if (m && typeof m.id === 'string' && m.id !== '' && !seen[m.id]) {
        seen[m.id] = true;
        members.push({ id: m.id, dept: typeof m.dept === 'string' && m.dept !== '' ? m.dept : '부서 없음', trainee: m.trainee === true });
      }
    });

    /* 대상 금요일 근태만 사번별로 모은다 */
    var byId = Object.create(null);
    var unknown = [];
    data.attendance.forEach(function (a) {
      if (!a || a.date !== data.targetFriday) { return; }
      if (!seen[a.id]) { unknown.push(a); return; }
      (byId[a.id] = byId[a.id] || []).push(a);
    });

    var people = [];
    var flags = [];
    var missing = [];
    members.forEach(function (m) {
      var recs = byId[m.id] || [];
      var p = { id: m.id, dept: m.dept, trainee: m.trainee, record: recs.length === 1 ? recs[0] : null, status: '' };
      if (m.trainee) {
        p.status = '평가 제외(교육대상자)';
      } else if (recs.length > 1) {
        p.status = '확인 필요';
        flags.push({ id: m.id, dept: m.dept, reason: '중복 입력 — 같은 금요일 근태가 ' + recs.length + '건' });
      } else if (recs.length === 0) {
        p.status = '미입력';
        missing.push(p);
      } else if (!validRecord(recs[0])) {
        p.status = '확인 필요';
        flags.push({ id: m.id, dept: m.dept, reason: '값 확인 필요 — 부재 유형 또는 부재 시간(0~8)이 맞지 않음' });
      } else {
        p.status = isAchieved(recs[0]) ? '달성' : '미달성';
      }
      people.push(p);
    });
    unknown.forEach(function (a) {
      flags.push({ id: String(a.id), dept: '-', reason: '명단에 없는 사번의 근태 — 판정에 넣지 않음' });
    });

    /* 부서별: 평가대상자 = 교육대상자 제외 인원(미입력·확인 필요 포함), 달성자 = 상태가 '달성' */
    var depts = [];
    var deptIndex = Object.create(null);
    people.forEach(function (p) {
      if (!(p.dept in deptIndex)) {
        deptIndex[p.dept] = depts.length;
        depts.push({ dept: p.dept, targets: 0, achieved: 0 });
      }
      var d = depts[deptIndex[p.dept]];
      if (!p.trainee) { d.targets += 1; }
      if (p.status === '달성') { d.achieved += 1; }
    });
    depts.forEach(function (d) {
      if (d.targets === 0) { d.result = '평가대상자 없음'; }
      else { d.result = (d.achieved * 2 >= d.targets) ? '충족' : '미충족'; }
    });

    return { people: people, depts: depts, missing: missing, flags: flags };
  }

  function pct(n, m) {
    return m === 0 ? '-' : (Math.round(n / m * 1000) / 10) + '%';
  }

  /* 상태 꼬리표 4색: 초록=달성·충족, 빨강=미달성·미충족, 노랑=확인 필요, 회색=미입력·평가 제외 */
  function badge(text) {
    var kind = (text === '충족' || text === '달성') ? 'ok'
      : (text === '미충족' || text === '미달성') ? 'bad'
      : (text === '확인 필요') ? 'warn' : 'gray';
    return '<span class="badge ' + kind + '">' + esc(text) + '</span>';
  }

  function render() {
    var data = loadData();
    var ready = data.members.length > 0 && data.targetFriday !== '';
    $('needData').hidden = ready;
    $('report').hidden = !ready;
    if (!ready) { return; }

    var r = evaluate(data);
    $('targetFriday').textContent = data.targetFriday;

    var h = '<thead><tr><th>부서</th><th class="num">평가대상자</th><th class="num">달성자</th><th class="num">달성 비율</th><th>판정</th></tr></thead><tbody>';
    r.depts.forEach(function (d) {
      var judged = d.result === '충족' || d.result === '미충족';
      h += '<tr><td>' + esc(d.dept) + '</td><td class="num">' + d.targets + '명</td><td class="num">' + d.achieved + '명</td><td class="num">' +
        pct(d.achieved, d.targets) + '</td><td>' + badge(d.result) +
        (judged ? '<span class="confirm">' + CONFIRM + '</span>' : '') + '</td></tr>';
    });
    $('deptTable').innerHTML = h + '</tbody>';

    $('missingCount').textContent = '(' + r.missing.length + '명)';
    $('missingList').innerHTML = r.missing.length === 0
      ? '<p class="empty">미입력자가 없습니다.</p>'
      : '<ul class="notice">' + r.missing.map(function (p) { return '<li>' + badge('미입력') + '<span>' + esc(p.id) + ' · ' + esc(p.dept) + '</span></li>'; }).join('') + '</ul>';

    $('flagCount').textContent = '(' + r.flags.length + '건)';
    $('flagList').innerHTML = r.flags.length === 0
      ? '<p class="empty">확인할 건이 없습니다.</p>'
      : '<ul class="notice">' + r.flags.map(function (f) {
          return '<li>' + badge('확인 필요') + '<span>' + esc(f.id) + ' · ' + esc(f.dept) + ' — ' + esc(f.reason) + '</span></li>';
        }).join('') + '</ul>';

    renderPeople(r);
  }

  function renderPeople(r) {
    var t = '<thead><tr><th>사번</th><th>부서</th><th>부재</th><th>결과</th></tr></thead><tbody>';
    r.people.forEach(function (p) {
      var absent = p.record ? esc(p.record.absentType) + ' ' + esc(p.record.absentHours) + '시간' : '-';
      t += '<tr><td>' + esc(p.id) + '</td><td>' + esc(p.dept) + '</td><td>' + absent + '</td><td>' + badge(p.status) + '</td></tr>';
    });
    $('personTable').innerHTML = t + '</tbody>';
  }

  /* 확인 목록 탭 */
  function selectTab(which) {
    var m = which === 'missing';
    $('tabMissing').setAttribute('aria-selected', m ? 'true' : 'false');
    $('tabFlags').setAttribute('aria-selected', m ? 'false' : 'true');
    $('missingList').hidden = !m;
    $('flagList').hidden = m;
  }
  $('tabMissing').addEventListener('click', function () { selectTab('missing'); });
  $('tabFlags').addEventListener('click', function () { selectTab('flags'); });

  render();
})();
