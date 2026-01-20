const { chromium } = require('playwright');

async function testRichTextEditor() {
    console.log('🧪 開始測試富文本編輯器...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    try {
        // 1. 導航到工作筆記頁面
        console.log('📄 導航到工作筆記頁面...');
        await page.goto('http://localhost:3000/notes');
        await page.waitForTimeout(2000);

        // 2. 點擊新增筆記按鈕
        console.log('➕ 點擊新增筆記...');
        const addButton = page.locator('button').filter({ hasText: /新增筆記|新增|Add/ }).first();
        await addButton.click();
        await page.waitForTimeout(1000);

        // 3. 找到編輯器
        const editor = page.locator('.ProseMirror').first();
        await editor.click();
        await editor.fill('測試文字\n');

        console.log('\n=== 開始功能測試 ===\n');

        // 測試 1: 粗體
        console.log('1️⃣ 測試粗體...');
        await editor.click();
        await page.keyboard.press('Control+A');
        const boldButton = page.locator('button[title="粗體"]').first();
        await boldButton.click();
        await page.waitForTimeout(500);
        const hasBold = await editor.locator('strong').count() > 0;
        if (hasBold) {
            results.passed.push('✅ 粗體');
            console.log('   ✅ 粗體功能正常');
        } else {
            results.failed.push('❌ 粗體');
            console.log('   ❌ 粗體功能失敗');
        }

        // 測試 2: 斜體
        console.log('2️⃣ 測試斜體...');
        const italicButton = page.locator('button[title="斜體"]').first();
        await italicButton.click();
        await page.waitForTimeout(500);
        const hasItalic = await editor.locator('em').count() > 0;
        if (hasItalic) {
            results.passed.push('✅ 斜體');
            console.log('   ✅ 斜體功能正常');
        } else {
            results.failed.push('❌ 斜體');
            console.log('   ❌ 斜體功能失敗');
        }

        // 測試 3: 底線
        console.log('3️⃣ 測試底線...');
        const underlineButton = page.locator('button[title="底線"]').first();
        await underlineButton.click();
        await page.waitForTimeout(500);
        const hasUnderline = await editor.locator('u').count() > 0;
        if (hasUnderline) {
            results.passed.push('✅ 底線');
            console.log('   ✅ 底線功能正常');
        } else {
            results.failed.push('❌ 底線');
            console.log('   ❌ 底線功能失敗');
        }

        // 測試 4: 刪除線
        console.log('4️⃣ 測試刪除線...');
        const strikeButton = page.locator('button[title="刪除線"]').first();
        await strikeButton.click();
        await page.waitForTimeout(500);
        const hasStrike = await editor.locator('s').count() > 0 || await editor.locator('del').count() > 0;
        if (hasStrike) {
            results.passed.push('✅ 刪除線');
            console.log('   ✅ 刪除線功能正常');
        } else {
            results.failed.push('❌ 刪除線');
            console.log('   ❌ 刪除線功能失敗');
        }

        // 測試 5: 行內程式碼
        console.log('5️⃣ 測試行內程式碼...');
        const codeButton = page.locator('button[title="行內程式碼"]').first();
        await codeButton.click();
        await page.waitForTimeout(500);
        const hasCode = await editor.locator('code').count() > 0;
        if (hasCode) {
            results.passed.push('✅ 行內程式碼');
            console.log('   ✅ 行內程式碼功能正常');
        } else {
            results.failed.push('❌ 行內程式碼');
            console.log('   ❌ 行內程式碼功能失敗');
        }

        // 清空編輯器
        await editor.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        // 測試 6: H1 大標題
        console.log('6️⃣ 測試大標題...');
        await editor.fill('標題測試');
        const h1Button = page.locator('button[title="大標題"]').first();
        await h1Button.click();
        await page.waitForTimeout(500);
        const hasH1 = await editor.locator('h1').count() > 0;
        if (hasH1) {
            results.passed.push('✅ 大標題 (H1)');
            console.log('   ✅ 大標題功能正常');
        } else {
            results.failed.push('❌ 大標題 (H1)');
            console.log('   ❌ 大標題功能失敗');
        }

        // 測試 7: H2 中標題
        console.log('7️⃣ 測試中標題...');
        const h2Button = page.locator('button[title="中標題"]').first();
        await h2Button.click();
        await page.waitForTimeout(500);
        const hasH2 = await editor.locator('h2').count() > 0;
        if (hasH2) {
            results.passed.push('✅ 中標題 (H2)');
            console.log('   ✅ 中標題功能正常');
        } else {
            results.failed.push('❌ 中標題 (H2)');
            console.log('   ❌ 中標題功能失敗');
        }

        // 清空
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        // 測試 8: 項目符號列表
        console.log('8️⃣ 測試項目符號列表...');
        await editor.fill('列表項目');
        const bulletButton = page.locator('button[title="項目符號列表"]').first();
        await bulletButton.click();
        await page.waitForTimeout(500);
        const hasBullet = await editor.locator('ul').count() > 0;
        if (hasBullet) {
            results.passed.push('✅ 項目符號列表');
            console.log('   ✅ 項目符號列表功能正常');
        } else {
            results.failed.push('❌ 項目符號列表');
            console.log('   ❌ 項目符號列表功能失敗');
        }

        // 測試 9: 編號列表
        console.log('9️⃣ 測試編號列表...');
        const orderedButton = page.locator('button[title="編號列表"]').first();
        await orderedButton.click();
        await page.waitForTimeout(500);
        const hasOrdered = await editor.locator('ol').count() > 0;
        if (hasOrdered) {
            results.passed.push('✅ 編號列表');
            console.log('   ✅ 編號列表功能正常');
        } else {
            results.failed.push('❌ 編號列表');
            console.log('   ❌ 編號列表功能失敗');
        }

        // 清空
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        // 測試 10: 待辦清單
        console.log('🔟 測試待辦清單...');
        await editor.fill('待辦事項');
        const taskButton = page.locator('button[title="待辦清單"]').first();
        await taskButton.click();
        await page.waitForTimeout(500);
        const hasTask = await editor.locator('ul[data-type="taskList"]').count() > 0;
        if (hasTask) {
            results.passed.push('✅ 待辦清單');
            console.log('   ✅ 待辦清單功能正常');
        } else {
            results.failed.push('❌ 待辦清單');
            console.log('   ❌ 待辦清單功能失敗');
        }

        // 清空
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        // 測試 11: 引用
        console.log('1️⃣1️⃣ 測試引用...');
        await editor.fill('引用文字');
        const quoteButton = page.locator('button[title="引用"]').first();
        await quoteButton.click();
        await page.waitForTimeout(500);
        const hasQuote = await editor.locator('blockquote').count() > 0;
        if (hasQuote) {
            results.passed.push('✅ 引用');
            console.log('   ✅ 引用功能正常');
        } else {
            results.failed.push('❌ 引用');
            console.log('   ❌ 引用功能失敗');
        }

        // 測試 12: 分隔線
        console.log('1️⃣2️⃣ 測試分隔線...');
        const hrButton = page.locator('button[title="分隔線"]').first();
        await hrButton.click();
        await page.waitForTimeout(500);
        const hasHr = await editor.locator('hr').count() > 0;
        if (hasHr) {
            results.passed.push('✅ 分隔線');
            console.log('   ✅ 分隔線功能正常');
        } else {
            results.failed.push('❌ 分隔線');
            console.log('   ❌ 分隔線功能失敗');
        }

        // 測試 13: 插入表格
        console.log('1️⃣3️⃣ 測試插入表格...');
        const tableButton = page.locator('button[title="插入表格 (3x3)"]').first();
        await tableButton.click();
        await page.waitForTimeout(1000);
        const hasTable = await editor.locator('table').count() > 0;
        if (hasTable) {
            results.passed.push('✅ 插入表格');
            console.log('   ✅ 插入表格功能正常');

            // 測試表格操作
            await editor.locator('td').first().click();
            await page.waitForTimeout(500);

            // 測試 14: 新增行
            console.log('1️⃣4️⃣ 測試新增行...');
            const addRowButton = page.locator('button[title="在下方插入行"]').first();
            const rowsBefore = await editor.locator('tr').count();
            await addRowButton.click();
            await page.waitForTimeout(500);
            const rowsAfter = await editor.locator('tr').count();
            if (rowsAfter > rowsBefore) {
                results.passed.push('✅ 新增行');
                console.log('   ✅ 新增行功能正常');
            } else {
                results.failed.push('❌ 新增行');
                console.log('   ❌ 新增行功能失敗');
            }

            // 測試 15: 新增列
            console.log('1️⃣5️⃣ 測試新增列...');
            const addColButton = page.locator('button[title="在右方插入列"]').first();
            const colsBefore = await editor.locator('tr').first().locator('th, td').count();
            await addColButton.click();
            await page.waitForTimeout(500);
            const colsAfter = await editor.locator('tr').first().locator('th, td').count();
            if (colsAfter > colsBefore) {
                results.passed.push('✅ 新增列');
                console.log('   ✅ 新增列功能正常');
            } else {
                results.failed.push('❌ 新增列');
                console.log('   ❌ 新增列功能失敗');
            }

        } else {
            results.failed.push('❌ 插入表格');
            console.log('   ❌ 插入表格功能失敗');
            results.warnings.push('⚠️ 無法測試表格操作 (表格未插入)');
        }

        await page.waitForTimeout(2000);

    } catch (error) {
        console.error('❌ 測試過程發生錯誤:', error.message);
        results.failed.push(`錯誤: ${error.message}`);
    }

    // 輸出測試結果
    console.log('\n' + '='.repeat(50));
    console.log('📊 測試結果統計');
    console.log('='.repeat(50));
    console.log(`✅ 通過: ${results.passed.length} 項`);
    console.log(`❌ 失敗: ${results.failed.length} 項`);
    console.log(`⚠️  警告: ${results.warnings.length} 項`);
    console.log('='.repeat(50));

    if (results.passed.length > 0) {
        console.log('\n✅ 通過的功能:');
        results.passed.forEach(item => console.log(`  ${item}`));
    }

    if (results.failed.length > 0) {
        console.log('\n❌ 失敗的功能:');
        results.failed.forEach(item => console.log(`  ${item}`));
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️  警告:');
        results.warnings.forEach(item => console.log(`  ${item}`));
    }

    console.log('\n🏁 測試完成!');

    // 保持瀏覽器開啟 10 秒讓你查看
    await page.waitForTimeout(10000);

    await browser.close();
}

testRichTextEditor();
