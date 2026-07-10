import os
import pickle


BASE = os.path.join(os.path.dirname(__file__), "..")


def _load_metrics():
    path = os.path.join(BASE, "model_metrics.pkl")
    with open(path, "rb") as handle:
        return pickle.load(handle)


def test_rf_accuracy_above_threshold():
    metrics = _load_metrics()
    assert metrics["rf"]["accuracy"] > 0.70, (
        f"RF accuracy dropped to {metrics['rf']['accuracy']}, "
        "below the 0.70 regression threshold. Retrain may have degraded."
    )


def test_lr_accuracy_above_threshold():
    metrics = _load_metrics()
    assert metrics["lr"]["accuracy"] > 0.70, (
        f"LR accuracy dropped to {metrics['lr']['accuracy']}, "
        "below the 0.70 regression threshold."
    )


def test_rf_roc_auc_above_threshold():
    metrics = _load_metrics()
    assert metrics["rf"]["roc_auc"] > 0.70, (
        f"RF ROC-AUC dropped to {metrics['rf']['roc_auc']}, below 0.70."
    )


def test_lr_roc_auc_above_threshold():
    metrics = _load_metrics()
    assert metrics["lr"]["roc_auc"] > 0.70, (
        f"LR ROC-AUC dropped to {metrics['lr']['roc_auc']}, below 0.70."
    )
