from __future__ import annotations

try:
    from opencc import OpenCC
except ImportError:  # pragma: no cover - optional dependency during bootstrap
    OpenCC = None  # type: ignore[assignment]


_OPENCC_S2HK = OpenCC("s2hk") if OpenCC is not None else None
_HK_FALLBACK_TERMS: tuple[tuple[str, str], ...] = (
    ("支持", "支援"),
    ("默认", "預設"),
    ("字符串", "字串"),
    ("数据", "資料"),
    ("资金", "資金"),
    ("风险", "風險"),
    ("图表", "圖表"),
    ("设置", "設定"),
    ("资产", "資產"),
    ("组合", "組合"),
    ("监控", "監控"),
    ("钱包", "錢包"),
    ("浏览器", "瀏覽器"),
    ("连接", "連結"),
    ("链接", "連結"),
    ("证据", "證據"),
    ("报告", "報告"),
    ("对比", "對比"),
    ("对照", "對照"),
    ("执行", "執行"),
    ("结论", "結論"),
    ("推荐", "建議"),
    ("建议", "建議"),
    ("结算", "結算"),
    ("条款", "條款"),
    ("细分", "細分"),
    ("链上", "鏈上"),
    ("链下", "鏈下"),
    ("买", "買"),
    ("卖", "賣"),
    ("读取", "讀取"),
    ("历史", "歷史"),
    ("归档", "歸檔"),
    ("说明", "說明"),
    ("选项", "選項"),
    ("状态", "狀態"),
    ("验证", "驗證"),
    ("风险调整", "風險調整"),
    ("风险分数", "風險分數"),
    ("风险向量", "風險向量"),
    ("当前", "目前"),
    ("问题", "問題"),
    ("条目", "項目"),
    ("计划", "計劃"),
    ("补充", "補充"),
    ("净值", "淨值"),
    ("发行人", "發行人"),
    ("预言机", "預言機"),
    ("准入", "準入"),
    ("总成本", "總成本"),
    ("综合", "綜合"),
    ("置信", "置信"),
    ("比较", "比較"),
    ("口径", "口徑"),
    ("调整", "調整"),
    ("适合", "適合"),
    ("周转", "週轉"),
    ("维度", "維度"),
    ("权重", "權重"),
    ("危险", "危險"),
    ("退出", "退出"),
    ("优先", "優先"),
)


def normalize_locale(value: str | None) -> str:
    normalized = (value or "").strip().lower().replace("_", "-")
    if normalized in {"zh", "zh-cn", "zh-sg"}:
        return "zh-CN"
    if normalized in {"zh-hk", "zh-tw", "zh-mo"}:
        return "zh-HK"
    if normalized.startswith("zh-hant"):
        return "zh-HK"
    if normalized.startswith("zh-hans") or normalized.startswith("zh"):
        return "zh-CN"
    if normalized.startswith("en"):
        return "en"
    return "zh-CN"


def is_zh_locale(value: str | None) -> bool:
    return normalize_locale(value).startswith("zh")


def to_hk_chinese(value: str) -> str:
    if not value:
        return value

    converted = _OPENCC_S2HK.convert(value) if _OPENCC_S2HK is not None else value
    for source, target in _HK_FALLBACK_TERMS:
        converted = converted.replace(source, target)
    return converted


def text_for_locale(locale: str | None, zh: str, en: str, *, zh_hk: str | None = None) -> str:
    normalized = normalize_locale(locale)
    if normalized == "zh-HK":
        return zh_hk if zh_hk is not None else to_hk_chinese(zh)
    return zh if normalized == "zh-CN" else en
