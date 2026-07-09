"""fund_name_normalizer 與 fund_manager_map seed 的測試。"""

import pytest

from ETF.config.fund_manager_map import FUND_MANAGER_SEED, get_seed_mapping
from ETF.utils.fund_name_normalizer import normalize_to_fund_short


@pytest.fixture
def mapping() -> dict[str, list[str]]:
    """回傳 seed mapping fixture。"""
    return get_seed_mapping()


def test_full_name_with_trust_suffix(mapping: dict[str, list[str]]) -> None:
    """含「證券投資信託」的全名應正規化為 canonical 短名。"""
    assert normalize_to_fund_short("統一奔騰證券投資信託基金", mapping) == "統一奔騰"


def test_short_full_name(mapping: dict[str, list[str]]) -> None:
    """不含「證券投資信託」的短全名應正規化為 canonical 短名。"""
    assert normalize_to_fund_short("統一奔騰基金", mapping) == "統一奔騰"


def test_etf_full_name_with_trust_suffix(mapping: dict[str, list[str]]) -> None:
    """ETF 型全名含「證券投資信託」變體應正規化為 canonical 短名。"""
    assert (
        normalize_to_fund_short("統一台股增長主動式ETF證券投資信託基金", mapping)
        == "統一台股增長"
    )


def test_three_variants_normalize_to_same_fund_short(mapping: dict[str, list[str]]) -> None:
    """同一基金的三種輸入型態應正規化到同一個 fund_short。"""
    variants = [
        "統一奔騰",
        "統一奔騰基金",
        "統一奔騰證券投資信託基金",
    ]
    results = {normalize_to_fund_short(v, mapping) for v in variants}
    assert results == {"統一奔騰"}


def test_unmatched_name_returns_none(mapping: dict[str, list[str]]) -> None:
    """對不上任何已知基金時應回傳 None。"""
    assert normalize_to_fund_short("不存在的基金", mapping) is None


def test_trailing_parenthetical_note_is_stripped(mapping: dict[str, list[str]]) -> None:
    """SITCA 基金名稱格帶 <br> + 括號附註（parser 轉為空格），應剝除後正規化。

    真實案例（2026-07-08 首次同步）：6 檔 ETF 型基金因附註失配，SITCA 月報全數漏抓。
    """
    assert (
        normalize_to_fund_short(
            "統一台股增長主動式ETF基金 (基金之配息來源可能為收益平準金)", mapping
        )
        == "統一台股增長"
    )


def test_full_width_parenthetical_note_is_stripped(mapping: dict[str, list[str]]) -> None:
    """全形括號附註也應剝除。"""
    assert (
        normalize_to_fund_short(
            "元大新主流基金（本基金之配息來源可能為收益平準金且並無保證收益及配息）",
            mapping,
        )
        == "元大新主流"
    )


def test_seed_has_19_entries() -> None:
    """seed 資料應完整為 19 筆（6 ETF + 13 基金）。"""
    assert len(FUND_MANAGER_SEED) == 19


def test_seed_etf_entries_have_etf_code() -> None:
    """type='etf' 的 6 筆 seed 資料都必須有 etf_code。"""
    etf_entries = [entry for entry in FUND_MANAGER_SEED if entry["type"] == "etf"]
    assert len(etf_entries) == 6
    assert all(entry["etf_code"] for entry in etf_entries)
