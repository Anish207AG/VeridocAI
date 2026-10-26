import os
import io
from typing import Dict, Any, Tuple
import numpy as np

HAS_CV2 = False
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    pass

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def assess_image_quality(image_bytes: bytes) -> Tuple[float, Dict[str, Any]]:
    """
    Assesses image quality of a rendered document page or image.
    Uses OpenCV when available, or PIL + NumPy as fallback.
    Calculates Laplacian variance (blur check), contrast, brightness, and resolution.
    Returns (quality_score_0_to_1, metrics_dict).
    """
    try:
        gray = None
        w, h = 0, 0
        laplacian_var = 120.0

        if HAS_CV2:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                h, w = gray.shape
                laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        if gray is None and HAS_PIL:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("L")
            w, h = pil_img.size
            gray = np.array(pil_img, dtype=np.float32)
            # Discrete Laplacian 3x3 kernel via numpy roll
            # Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
            lap = (
                np.roll(gray, 1, axis=0) +
                np.roll(gray, -1, axis=0) +
                np.roll(gray, 1, axis=1) +
                np.roll(gray, -1, axis=1) -
                4 * gray
            )
            laplacian_var = float(lap.var())

        if gray is None:
            return 0.5, {"status": "unreadable_image", "blur_variance": 0, "contrast": 0}

        contrast = float(gray.std())
        mean_brightness = float(gray.mean())

        # Quality heuristics
        sharpness_score = min(1.0, max(0.1, laplacian_var / 300.0))
        contrast_score = min(1.0, max(0.1, contrast / 60.0))

        resolution_score = 1.0
        if w < 600 or h < 800:
            resolution_score = 0.6

        overall_score = round(float((sharpness_score * 0.5) + (contrast_score * 0.3) + (resolution_score * 0.2)), 2)

        is_blurry = laplacian_var < 80.0
        is_low_contrast = contrast < 25.0
        is_too_dark = mean_brightness < 40.0
        is_washed_out = mean_brightness > 245.0

        flags = []
        if is_blurry:
            flags.append("High blur detected (low Laplacian variance)")
        if is_low_contrast:
            flags.append("Low contrast scan (text may be degraded)")
        if is_too_dark:
            flags.append("Severely underexposed / dark scan")
        if is_washed_out:
            flags.append("Severely overexposed / washed out scan")

        return overall_score, {
            "status": "degraded" if flags else "acceptable",
            "laplacian_variance": round(laplacian_var, 2),
            "contrast": round(contrast, 2),
            "mean_brightness": round(mean_brightness, 2),
            "dimensions": f"{w}x{h}",
            "quality_flags": flags
        }
    except Exception as e:
        return 0.5, {"status": "error", "error": str(e)}
