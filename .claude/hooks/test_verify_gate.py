# -*- coding: utf-8 -*-
"""
verify_gate.py 行為驗收。來源：github.com/Miguok/fable-harness（MIT），
GATE 路徑改為同目錄、block reason 前綴改為本地版，其餘與上游一致。

執行：uv run pytest .claude/hooks/test_verify_gate.py -v

案例：
  T1 本輪 Edit .py 且無測試執行 → block，reason 含「測試」
  T2 本輪 Edit .py 且其後有 pytest 執行 → 放行
  T3 stop_hook_active=true（第二次結束）→ 放行（soft gate 防無限迴圈）
  T4 本輪僅 Edit .md → 放行
  T5 純問答、無任何 Edit/Write → 放行
  T6 transcript 不存在 / 內含壞行 → fail-open 放行
  T7 修改發生在上一輪 → 放行（gate 只看本輪）
  T8 Edit 後出現 <command-name> 類條目 → 不算新一輪，仍 block
  T9 多生態測試指令（mvn/gradle/dotnet/rspec/phpunit/ctest/make test/tox）→ 識別放行
  T10 形似測試的日常指令（cat tox.ini / make testdata 等）→ 仍須 block
"""
import json
import subprocess
import sys
from pathlib import Path

GATE = Path(__file__).resolve().parent / "verify_gate.py"


def _user(text):
    return {"type": "user", "message": {"role": "user", "content": text}}


def _tool_use(name, tool_input):
    return {"type": "assistant", "message": {"role": "assistant", "content": [
        {"type": "tool_use", "id": "toolu_x", "name": name, "input": tool_input}]}}


def _tool_result():
    return {"type": "user", "message": {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "toolu_x", "content": "ok"}]}}


def run_gate(tmp_path, entries, stop_hook_active=False, transcript_path=None):
    """以生產介面（stdin JSON → stdout）呼叫 gate，回傳 (stdout, returncode)。"""
    if transcript_path is None:
        transcript_path = tmp_path / "transcript.jsonl"
        transcript_path.write_text(
            "\n".join(json.dumps(e, ensure_ascii=False) for e in entries),
            encoding="utf-8")
    payload = json.dumps({
        "session_id": "test", "hook_event_name": "Stop",
        "stop_hook_active": stop_hook_active,
        "transcript_path": str(transcript_path)})
    proc = subprocess.run([sys.executable, str(GATE)], input=payload,
                          capture_output=True, text=True, encoding="utf-8", timeout=30)
    return proc.stdout.strip(), proc.returncode


def test_t1_edit_py_without_test_blocks(tmp_path):
    entries = [
        _user("幫我修 bug"),
        _tool_use("Edit", {"file_path": "D:\\proj\\app.py", "old_string": "a", "new_string": "b"}),
        _tool_result(),
    ]
    out, rc = run_gate(tmp_path, entries)
    assert rc == 0
    data = json.loads(out)
    assert data["decision"] == "block"
    assert "測試" in data["reason"]
    assert "app.py" in data["reason"]


def test_t2_edit_py_with_pytest_allows(tmp_path):
    entries = [
        _user("幫我修 bug"),
        _tool_use("Edit", {"file_path": "D:\\proj\\app.py", "old_string": "a", "new_string": "b"}),
        _tool_result(),
        _tool_use("Bash", {"command": "python -m pytest tests/ -v"}),
        _tool_result(),
    ]
    out, rc = run_gate(tmp_path, entries)
    assert rc == 0
    assert out == ""


def test_t3_stop_hook_active_soft_allows(tmp_path):
    entries = [
        _user("幫我修 bug"),
        _tool_use("Edit", {"file_path": "D:\\proj\\app.py", "old_string": "a", "new_string": "b"}),
        _tool_result(),
    ]
    out, rc = run_gate(tmp_path, entries, stop_hook_active=True)
    assert rc == 0
    assert out == ""


def test_t4_md_only_edit_allows(tmp_path):
    entries = [
        _user("改一下說明文件"),
        _tool_use("Write", {"file_path": "D:\\proj\\README.md", "content": "x"}),
        _tool_result(),
    ]
    out, rc = run_gate(tmp_path, entries)
    assert rc == 0
    assert out == ""


def test_t5_pure_qa_allows(tmp_path):
    entries = [_user("這段程式在做什麼？")]
    out, rc = run_gate(tmp_path, entries)
    assert rc == 0
    assert out == ""


def test_t6_missing_or_corrupt_transcript_fails_open(tmp_path):
    out, rc = run_gate(tmp_path, [], transcript_path=tmp_path / "nonexistent.jsonl")
    assert rc == 0
    assert out == ""
    corrupt = tmp_path / "corrupt.jsonl"
    corrupt.write_text('{"type":"user","message":{"content":"hi"}}\nNOT-JSON-LINE\n',
                       encoding="utf-8")
    out, rc = run_gate(tmp_path, [], transcript_path=corrupt)
    assert rc == 0
    assert out == ""


def test_t7_edit_in_previous_turn_allows(tmp_path):
    entries = [
        _user("上一輪：修 bug"),
        _tool_use("Edit", {"file_path": "D:\\proj\\app.py", "old_string": "a", "new_string": "b"}),
        _tool_result(),
        _user("本輪：解釋一下剛剛改了什麼"),
    ]
    out, rc = run_gate(tmp_path, entries)
    assert rc == 0
    assert out == ""


def test_t8_local_command_entry_not_turn_boundary(tmp_path):
    entries = [
        _user("幫我修 bug"),
        _tool_use("Edit", {"file_path": "D:\\proj\\app.py", "old_string": "a", "new_string": "b"}),
        _tool_result(),
        _user("<command-name>/model</command-name>"),
        _user("<local-command-stdout>Set model to X</local-command-stdout>"),
    ]
    out, rc = run_gate(tmp_path, entries)
    assert rc == 0
    data = json.loads(out)
    assert data["decision"] == "block"
    assert "app.py" in data["reason"]


def test_t9_multi_ecosystem_test_commands_allow(tmp_path):
    """T9：非 Python/JS 生態的測試指令必須被 TEST_CMD_RE 識別。"""
    cases = [
        ("D:\\proj\\App.java", "mvn clean test"),
        ("D:\\proj\\App.java", "./gradlew test --info"),
        ("D:\\proj\\Service.cs", "dotnet test MySolution.sln"),
        ("D:\\proj\\model.rb", "bundle exec rspec spec/models"),
        ("D:\\proj\\Handler.php", "vendor/bin/phpunit tests/"),
        ("D:\\proj\\algo.c", "ctest --output-on-failure"),
        ("D:\\proj\\util.c", "make test"),
        ("D:\\proj\\lib.py", "tox -e py311"),
    ]
    failures = []
    for path, cmd in cases:
        entries = [
            _user("幫我修 bug"),
            _tool_use("Edit", {"file_path": path, "old_string": "a", "new_string": "b"}),
            _tool_result(),
            _tool_use("Bash", {"command": cmd}),
            _tool_result(),
        ]
        out, rc = run_gate(tmp_path, entries)
        if rc != 0 or out != "":
            failures.append((cmd, out[:60]))
    assert not failures, f"以下測試指令未被識別而遭假攔: {failures}"


def test_t10_nontest_commands_still_block(tmp_path):
    """T10：形似測試的日常指令不得被誤認為測試（假放行防護）。"""
    cases = [
        "cat tox.ini",
        "pip install tox",
        "git commit -m 'refactor tox config'",
        "make testdata",
        "npm run testbed",
        "python latest.py",
        "python contest.py",
        "mvn test-compile",
    ]
    failures = []
    for cmd in cases:
        entries = [
            _user("幫我修 bug"),
            _tool_use("Edit", {"file_path": "D:\\proj\\app.py", "old_string": "a", "new_string": "b"}),
            _tool_result(),
            _tool_use("Bash", {"command": cmd}),
            _tool_result(),
        ]
        out, rc = run_gate(tmp_path, entries)
        blocked = False
        if out:
            try:
                blocked = json.loads(out).get("decision") == "block"
            except json.JSONDecodeError:
                blocked = False
        if rc != 0 or not blocked:
            failures.append(cmd)
    assert not failures, f"以下非測試指令被誤認為測試（假放行）: {failures}"
