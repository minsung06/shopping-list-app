const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8765/shopping-list.html';

const PASS = '\x1b[32m✔ PASS\x1b[0m';
const FAIL = '\x1b[31m✘ FAIL\x1b[0m';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ${PASS} ${message}`);
    passed++;
    results.push({ status: 'PASS', message });
  } else {
    console.log(`  ${FAIL} ${message}`);
    failed++;
    results.push({ status: 'FAIL', message });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  console.log('\n\x1b[1m=== 쇼핑 리스트 앱 자동 테스트 시작 ===\x1b[0m\n');

  console.log('\x1b[36m[테스트 1] 초기 상태 확인\x1b[0m');
  const emptyMsg = await page.locator('#empty').isVisible();
  assert(emptyMsg, '빈 상태 메시지가 표시된다');
  const itemCount = await page.locator('#list li').count();
  assert(itemCount === 0, `초기 아이템 수가 0개 (실제: ${itemCount}개)`);

  console.log('\n\x1b[36m[테스트 2] 아이템 추가 (버튼 클릭)\x1b[0m');
  await page.fill('#itemInput', '사과');
  await page.click('button:has-text("추가")');
  await page.waitForTimeout(200);
  const count1 = await page.locator('#list li').count();
  assert(count1 === 1, `"사과" 추가 후 아이템 수 1개 (실제: ${count1}개)`);
  const firstItemText = await page.locator('#list li .item-text').first().textContent();
  assert(firstItemText === '사과', `첫 번째 아이템 텍스트가 "사과" (실제: "${firstItemText}")`);
  const emptyHidden = await page.locator('#empty').isHidden();
  assert(emptyHidden, '아이템 추가 후 빈 상태 메시지가 사라진다');

  console.log('\n\x1b[36m[테스트 3] 아이템 추가 (Enter 키)\x1b[0m');
  await page.fill('#itemInput', '바나나');
  await page.press('#itemInput', 'Enter');
  await page.waitForTimeout(200);
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');
  await page.waitForTimeout(200);
  const count2 = await page.locator('#list li').count();
  assert(count2 === 3, `Enter 키로 추가 후 총 3개 (실제: ${count2}개)`);
  const items = await page.locator('#list li .item-text').allTextContents();
  assert(items.includes('바나나') && items.includes('우유'), `목록에 "바나나", "우유" 포함 (실제: [${items.join(', ')}])`);

  console.log('\n\x1b[36m[테스트 4] 공백 입력 무시\x1b[0m');
  await page.fill('#itemInput', '   ');
  await page.press('#itemInput', 'Enter');
  await page.waitForTimeout(200);
  const countAfterBlank = await page.locator('#list li').count();
  assert(countAfterBlank === 3, `공백 입력 시 아이템 추가 안 됨 (실제: ${countAfterBlank}개)`);

  console.log('\n\x1b[36m[테스트 5] 요약 텍스트 확인\x1b[0m');
  const summaryText = await page.locator('#summary').textContent();
  assert(summaryText.includes('3'), `요약에 총 3개 표시 (실제: "${summaryText}")`);
  assert(summaryText.includes('0'), `요약에 완료 0개 표시 (실제: "${summaryText}")`);

  console.log('\n\x1b[36m[테스트 6] 체크 기능\x1b[0m');
  await page.locator('#list li .checkbox').first().click();
  await page.waitForTimeout(200);
  const firstLiChecked = await page.locator('#list li').first().getAttribute('class');
  assert(firstLiChecked.includes('checked'), '"사과" 항목에 checked 클래스 추가됨');
  const firstCheckboxChecked = await page.locator('#list li .checkbox').first().getAttribute('class');
  assert(firstCheckboxChecked.includes('checked'), '"사과" 체크박스에 checked 클래스 추가됨');
  const summaryAfterCheck = await page.locator('#summary').textContent();
  assert(summaryAfterCheck.includes('1'), `체크 후 완료 1개 표시 (실제: "${summaryAfterCheck}")`);

  console.log('\n\x1b[36m[테스트 7] 체크 해제 (토글)\x1b[0m');
  await page.locator('#list li .checkbox').first().click();
  await page.waitForTimeout(200);
  const firstLiUnchecked = await page.locator('#list li').first().getAttribute('class');
  assert(!(firstLiUnchecked || '').includes('checked'), '"사과" 항목 체크 해제됨');
  const summaryAfterUncheck = await page.locator('#summary').textContent();
  assert(summaryAfterUncheck.includes('0개 완료'), `체크 해제 후 완료 0개 (실제: "${summaryAfterUncheck}")`);

  console.log('\n\x1b[36m[테스트 8] 개별 삭제\x1b[0m');
  await page.locator('#list li .delete-btn').nth(1).click();
  await page.waitForTimeout(200);
  const countAfterDelete = await page.locator('#list li').count();
  assert(countAfterDelete === 2, `삭제 후 아이템 수 2개 (실제: ${countAfterDelete}개)`);
  const remainingItems = await page.locator('#list li .item-text').allTextContents();
  assert(!remainingItems.includes('바나나'), `"바나나" 삭제됨 (남은 목록: [${remainingItems.join(', ')}])`);
  assert(remainingItems.includes('사과') && remainingItems.includes('우유'), '"사과"와 "우유"는 유지됨');

  console.log('\n\x1b[36m[테스트 9] 완료 항목 일괄 삭제\x1b[0m');
  await page.locator('#list li .checkbox').nth(0).click();
  await page.waitForTimeout(200);
  await page.locator('#list li .checkbox').nth(1).click();
  await page.waitForTimeout(200);
  const checkedCount = await page.locator('#list li.checked').count();
  assert(checkedCount === 2, `일괄 삭제 전 체크된 항목 2개 (실제: ${checkedCount}개)`);
  await page.click('.clear-btn');
  await page.waitForTimeout(200);
  const countAfterClearChecked = await page.locator('#list li').count();
  assert(countAfterClearChecked === 0, `완료 항목 일괄 삭제 후 0개 (실제: ${countAfterClearChecked}개)`);
  const emptyAgain = await page.locator('#empty').isVisible();
  assert(emptyAgain, '모두 삭제 후 빈 상태 메시지 다시 표시');

  console.log('\n\x1b[36m[테스트 10] localStorage 영속성\x1b[0m');
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');
  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);
  const countAfterReload = await page.locator('#list li').count();
  assert(countAfterReload === 1, `새로고침 후 데이터 유지 (실제: ${countAfterReload}개)`);
  const reloadedItem = await page.locator('#list li .item-text').first().textContent();
  assert(reloadedItem === '계란', `새로고침 후 "계란" 유지 (실제: "${reloadedItem}")`);

  console.log('\n\x1b[1m=== 테스트 결과 ===\x1b[0m');
  console.log(`총 테스트: ${passed + failed}개`);
  console.log(`\x1b[32m통과: ${passed}개\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31m실패: ${failed}개\x1b[0m`);
    console.log('\n실패한 테스트:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.message}`));
  } else {
    console.log('\x1b[32m\n모든 테스트 통과! 🎉\x1b[0m');
  }

  await page.waitForTimeout(1500);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();