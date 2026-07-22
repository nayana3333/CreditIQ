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
    """LR trains with class_weight='balanced' to counter the ~70/30 class
    split, which deliberately trades some accuracy for recall on the
    minority (bad-credit) class. 0.65 leaves headroom above the observed
    0.71 while still catching a real regression."""
    metrics = _load_metrics()
    assert metrics["lr"]["accuracy"] > 0.65, (
        f"LR accuracy dropped to {metrics['lr']['accuracy']}, "
        "below the 0.65 regression threshold."
    )


def test_lr_recall_above_threshold():
    """The metric that actually matters for the balanced LR model: it should
    reliably catch a majority of bad-credit applicants, not just score well
    on aggregate accuracy."""
    metrics = _load_metrics()
    assert metrics["lr"]["recall"] > 0.60, (
        f"LR recall on bad-credit applicants dropped to {metrics['lr']['recall']}, "
        "below the 0.60 regression threshold. class_weight='balanced' may have "
        "been removed or the retrain regressed."
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
